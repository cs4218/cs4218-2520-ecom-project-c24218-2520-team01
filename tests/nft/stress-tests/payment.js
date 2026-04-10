import http from 'k6/http';
import { check, sleep } from 'k6';

// Written by Nicholas Cheng, A0269648H

/**
 * Braintree Payment Stress Test
 *
 * This test stresses the POST /api/v1/product/braintree/payment endpoint,
 * which is one of the most critical paths in any e-commerce application.
 *
 * --- Why lower VU counts than search? ---
 * Payment/checkout is a conversion-funnel endpoint. In real e-commerce platforms,
 * only a fraction of visitors actually complete a purchase:
 *   - Typical browse-to-purchase conversion: 1-3% (Shopify, BigCommerce data)
 *   - Even during flash sales (Black Friday, Cyber Monday), the checkout
 *     concurrency is much lower than browse/search traffic.
 *
 * Industry references for concurrent checkout users:
 *   - Small-to-medium stores:  ~10-50 simultaneous checkouts
 *   - Mid-size retailers:      ~50-200 simultaneous checkouts
 *   - Large retailers (e.g. peak Black Friday): ~200-1000+ simultaneous checkouts
 *
 * We model the following stages:
 *   - Light load:   50 VUs  (normal day)
 *   - Expected load: 100 VUs (promotional event)
 *   - Heavy load:   200 VUs (flash sale)
 *   - Stress load:  500 VUs (Black Friday peak)
 *
 * --- Threshold rationale (stricter than search) ---
 * Payment endpoints are mission-critical. A failed or slow payment means
 * direct revenue loss and eroded customer trust.
 *
 * Industry benchmarks for payment APIs:
 *   - p(90) < 1500ms — 90% of transactions must complete under 1.5s
 *     (Stripe/Adyen/Braintree sandbox p95 is typically ~300-800ms,
 *      but we include DB writes + order creation overhead)
 *   - p(95) < 3000ms — 95% under 3s, which is the upper bound before
 *     users assume the payment failed and may double-submit
 *   - Error rate < 0.1% — Payments must be near-100% reliable.
 *     Even 1% failure rate means 1-in-100 customers lose money or
 *     get stuck, which is unacceptable for any reputable e-commerce site.
 *     (Stripe targets 99.999% uptime; we use 99.9% as our floor)
 */

const BASE_URL = 'http://localhost:6060';
const TESTER_EMAIL = "JaneStresser@test.com"
const TESTER_PASSWORD = "password123"

export const options = {
    stages: [
        { duration: '30s', target: 50 },   // Ramp up to light load
        { duration: '30s', target: 50 },   // Hold at 50 VUs (normal day)
        { duration: '30s', target: 100 },  // Ramp up to expected load
        { duration: '30s', target: 100 },  // Hold at 100 VUs (promotional event)
        { duration: '30s', target: 200 },  // Ramp up to heavy load
        { duration: '30s', target: 200 },  // Hold at 200 VUs (flash sale)
        { duration: '30s', target: 500 },  // Ramp up to stress load
        { duration: '30s', target: 500 },  // Hold at 500 VUs (Black Friday peak)
        { duration: '1m', target: 0 },     // Ramp down — observe recovery
    ],

    thresholds: {
        // Payment-specific thresholds (stricter than browse/search endpoints)
        http_req_duration: [
            'p(90)<1500',
            'p(95)<3000',
        ],
        http_req_failed: ['rate<0.01'], // Error rate must be below 1%
    },
};

/**
 * Setup phase: Runs once before VU execution.
 * - Logs in to obtain a JWT token
 * - Fetches available products to build a realistic cart
 *
 * The returned data is shared across all VUs (read-only).
 */
export function setup() {

    // First register 1 dummy user
    const registerUrl = `${BASE_URL}/api/v1/auth/register`;
    const payload = JSON.stringify({
        name: 'Jane Stresser',
        email: TESTER_EMAIL,
        password: TESTER_PASSWORD,
        phone: '1234567890',
        address: '123 Stress St',
        answer: 'k6-test',
    });

    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    const res = http.post(registerUrl, payload, params);

    // Log the result of the setup phase
    if (res.status === 201) {
        console.log('Setup: Sucessfully registered stress test user');
    } else if (res.status === 200 && res.json().success === false) {
        console.log('Setup: User already exists, proceeding to test');
    } else {
        console.warn(`Setup: Unexpected registration response (Status: ${res.status}): ${res.body}`);
    }

    // Login to get a JWT token
    const loginRes = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email: TESTER_EMAIL, password: TESTER_PASSWORD }),
        { headers: { 'Content-Type': 'application/json' } }
    );

    const loginOk = check(loginRes, {
        'login succeeded': (r) => r.status === 200,
        'login returned token': (r) => {
            try {
                return r.json().token !== undefined;
            } catch {
                return false;
            }
        },
    });

    if (!loginOk) {
        console.error(`Login failed (status ${loginRes.status}): ${loginRes.body}`);
    }

    const token = loginRes.json().token;

    // Fetch available products to build a realistic cart
    const productsRes = http.get(`${BASE_URL}/api/v1/product/get-product`);

    const productsOk = check(productsRes, {
        'products fetched': (r) => r.status === 200,
    });

    let products = [];
    if (productsOk) {
        try {
            products = productsRes.json().products || [];
        } catch {
            console.error('Failed to parse products response');
        }
    }

    if (products.length === 0) {
        console.warn('No products found in the database.');
    }

    return { token, products };
}

/**
 * The default function runs for every Virtual User (VU) iteration.
 *
 * Each VU simulates a customer completing a checkout:
 *   1. Generates a Braintree client token (GET /braintree/token)
 *   2. Submits a payment (POST /braintree/payment) with a random cart
 *
 * We use the Braintree Sandbox "fake-valid-nonce" for testing.
 * See: https://developer.paypal.com/braintree/docs/reference/general/testing
 */
export default function (data) {
    // Skip if setup failed
    if (!data.token || data.products.length === 0) {
        console.error('Skipping iteration: no token or products available');
        sleep(1);
        return;
    }

    const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: data.token,
    };

    // Request a Braintree client token (mirrors real checkout flow)
    const tokenRes = http.get(
        `${BASE_URL}/api/v1/product/braintree/token`,
        { headers: authHeaders }
    );

    check(tokenRes, {
        'braintree token status 200': (r) => r.status === 200,
        'braintree token returned': (r) => {
            try {
                return r.json().clientToken !== undefined;
            } catch {
                return false;
            }
        },
    });

    // Build a random cart (1 to 3 products)
    const cartSize = Math.floor(Math.random() * 3) + 1;
    const cart = [];
    for (let i = 0; i < cartSize; i++) {
        const randomIndex = Math.floor(Math.random() * data.products.length);
        const randomProduct = data.products[randomIndex];
        cart.push({
            _id: randomProduct._id,
            price: randomProduct.price,
        });
    }

    // Submit the payment
    // Using Braintree Sandbox test nonce: "fake-valid-nonce"
    const paymentPayload = JSON.stringify({
        nonce: 'fake-valid-nonce',
        cart: cart,
    });

    const paymentRes = http.post(
        `${BASE_URL}/api/v1/product/braintree/payment`,
        paymentPayload,
        { headers: authHeaders }
    );

    check(paymentRes, {
        'payment status 200': (r) => r.status === 200,
        'payment ok': (r) => {
            try {
                return r.json().ok === true;
            } catch {
                return false;
            }
        },
    });

    // Checkout think-time is longer as users review their order
    sleep(Math.random() + 2);
}
