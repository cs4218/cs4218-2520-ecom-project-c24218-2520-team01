import http from 'k6/http';
import { check, sleep } from 'k6';

// Written by Nicholas Cheng, A0269648H

const BASE_URL = 'http://localhost:6060';
const TESTER_EMAIL = "JaneStresser@test.com"
const TESTER_PASSWORD = "password123"

export const options = {
    stages: [
        { duration: '30s', target: 50 },   // Ramp up to light load
        { duration: '30s', target: 50 },   // Hold at 50 VUs
        { duration: '30s', target: 100 },  // Ramp up to expected load
        { duration: '30s', target: 100 },  // Hold at 100 VUs
        { duration: '30s', target: 200 },  // Ramp up to heavy load
        { duration: '30s', target: 200 },  // Hold at 200 VUs
        { duration: '30s', target: 500 },  // Ramp up to stress load
        { duration: '30s', target: 500 },  // Hold at 500 VUs
        { duration: '1m', target: 0 },     // Ramp down
    ],

    thresholds: {
        http_req_duration: ['p(90)<1500', 'p(95)<3000'], // 90% of all requests must complete in under 1500ms, 95% of all requests must complete in under 3000ms
        http_req_failed: ['rate<0.01'], // Error rate must be below 1%
    },
};

/**
 * Setup phase: Runs once before VU execution.
 * - Logs in to obtain a JWT token
 * - Fetches available products to build a realistic cart
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

    // Fetch available products for building the cart
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
 * We will simulate a customer completing a checkout:
 *   1. Generates a Braintree client token (GET /braintree/token)
 *   2. Submits a payment (POST /braintree/payment) with a random cart
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

    // Request a Braintree client token
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

    sleep(Math.random() + 2);
}
