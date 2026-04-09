import http from 'k6/http';
import { check, sleep } from 'k6';

// Lim Jia Wei, A0277381W

export const options = {
  stages: [
    { duration: '10s', target: 20 },
    { duration: '30s', target: 100 }, // set a spike of 100 VUs for 2 durations of 30s
    { duration: '30s', target: 100 },
    { duration: '10s', target: 20 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'], // Order processing involves payment gateways, allowing up to 1.5s for 95% of requests
    http_req_failed: ['rate<0.01'],    // Errors should be less than 1%
    checks: ['rate>0.99'],             // Assertions should pass 99% of the time
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';

/**
 * AI Usage Declaration
 *
 * Tool Used: Gemini 3.1 Pro
 *
 * Prompt: Help me write a Random String Generator function for my k6 spike testing that is used for random name generation
 *
 * How the AI Output Was Used:
 * - Some of the output was used in the below function
 */

// Helper function for random names
function makeRandomString(length) {

  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;

}

export function setup() {

  const name = `k6user_order_${makeRandomString(8)}`;
  const email = `${name}@example.com`;
  const password = 'password123';

  const registerPayload = JSON.stringify({
    name: name,
    email: email,
    password: password,
    phone: '1234567890',
    address: '123 Test Street',
    answer: 'testanswer'
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  http.post(`${BASE_URL}/api/v1/auth/register`, registerPayload, params);

  const loginPayload = JSON.stringify({
    email: email,
    password: password,
  });

  let loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, params);

  let token;
  try {
    token = loginRes.json('token');
  } catch (e) {
    console.error('Failed to login in setup phase', loginRes.status, loginRes.body);
  }

  // Fetch valid product from database
  let productRes = http.get(`${BASE_URL}/api/v1/product/get-product`);
  let products = [];
  try {
    products = productRes.json('products') || [];
  } catch (e) {
    console.error('Failed to fetch products in setup');
  }

  let validProductId = null;
  let validProductPrice = 99.99;

  if (products.length > 0) {

    validProductId = products[0]._id;
    validProductPrice = products[0].price;

  }

  return { token: token, productId: validProductId, price: validProductPrice };
}

export default function (data) {

  if (!data || !data.token) {

    console.error('No token available');
    return;

  }
  if (!data.productId) {

    console.error('No valid products found in DB to place order');
    return;

  }

  const nonce = 'fake-valid-nonce';
  const paymentPayload = JSON.stringify({

    nonce: nonce,
    cart: [
      { _id: data.productId, price: data.price }
    ],

  });

  const params = {

    headers: {
      'Content-Type': 'application/json',
      'Authorization': data.token,
    },

  };

  let res = http.post(`${BASE_URL}/api/v1/product/braintree/payment`, paymentPayload, params);

  check(res, { 'payment status is 200': (r) => r.status === 200, });

  sleep(Math.random() * 2);
}
