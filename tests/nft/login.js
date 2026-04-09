import http from 'k6/http';
import { check, sleep } from 'k6';

// Written by Nicholas Cheng, A0269648H

// Save our base URL as a const
const BASE_URL = 'http://localhost:6060';
const TESTER_EMAIL = "JaneStresser@test.com"
const TESTER_PASSWORD = "password123"

export const options = {
    stages: [
        { duration: '30s', target: 25 },  // Ramp up to a light load in 30 seconds
        { duration: '30s', target: 25 },  // Hold at 25 VUs for 10 seconds
        { duration: '30s', target: 50 },  // Ramp up to expected load in 30 seconds
        { duration: '30s', target: 50 },  // Hold at 50 VUs for 10 seconds
        { duration: '30s', target: 200 }, // Ramp up to heavy load in 1 minute
        { duration: '30s', target: 200 }, // Hold at 200 VUs for 10 seconds
        { duration: '30s', target: 400 }, // Ramp up to stress load in 1 minute
        { duration: '30s', target: 400 }, // Hold at 400 VUs for 30 seconds we want to observe a little longer how the system performs under stress
        { duration: '1m', target: 0 }, // Ramp down to 0 VUs to observe server recovery
    ],

    // Thresholds define what is considered a "pass" or "fail"
    thresholds: {
        http_req_duration: ['p(90)<700', 'p(95)<900'], // 90% of all requests must complete in under 700ms, 95% of all requests must complete in under 1000ms
        http_req_failed: ['rate<0.01'],    // The error rate (like 500 or 404 errors) must be less than 1% which is a guideline to follow
    },
};


/**
 * setup() runs once before the test starts.
 * We use it to ensure a test user exists so the login tests don't fail.
 */
export function setup() {
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
}

/**
 * The default function runs for every Virtual User (VU) iteration.
 */
export default function () {
    const loginUrl = `${BASE_URL}/api/v1/auth/login`;
    const payload = JSON.stringify({
        email: TESTER_EMAIL,
        password: TESTER_PASSWORD,
    });

    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    const res = http.post(loginUrl, payload, params);

    // Validate the response
    check(res, {
        'status is 200': (r) => r.status === 200,
        'login successful': (r) => r.json().success === true,
        'token present': (r) => r.json().token !== undefined,
    });

    // Wait 1 to 2 seconds between requests per user to simulate realistic behavior
    sleep(Math.random() + 1);
}
