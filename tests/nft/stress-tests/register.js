import http from 'k6/http';
import { check, sleep } from 'k6';

// Written by Nicholas Cheng, A0269648H

// Save our base URL as a const
const BASE_URL = 'http://localhost:6060';
const TESTER_PASSWORD = "password123"


/**
 * Since we are doing registration there will be less registration requests as there are login requests.
 * In addition we are also going to be writting to the databse so unlike login we will need to change the thresholds.
 * In addition we also have to account the latency between the server and the database as well.
 */
export const options = {
    stages: [
        { duration: '30s', target: 10 },   // Ramp up to a light load
        { duration: '30s', target: 10 },   // Hold at 10 VUs
        { duration: '30s', target: 40 },  // Ramp up to expected load
        { duration: '30s', target: 40 },  // Hold at 40 VUs
        { duration: '30s', target: 100 },   // Ramp up to heavy load
        { duration: '30s', target: 100 },  // Hold at 100 VUs
        { duration: '30s', target: 200 },  // Push to stress load
        { duration: '4m', target: 200 }, // Hold at 200 VUs for 4 minutes
        { duration: '1m', target: 0 },    // Ramp down to observe recovery
    ],

    // Thresholds define what is considered a "pass" or "fail"
    thresholds: {
        http_req_duration: ['p(90)<1000', 'p(95)<1200'], // 90% of all requests must complete in under 1000ms, 95% of all requests must complete in under 1200ms
        http_req_failed: ['rate<0.01'],    // The error rate (like 500 or 404 errors) must be less than 1% which is a guideline to follow
    },
};

// Helper function to generate a random email
// We combine the current time and a random string to guarantee it is unique
function generateRandomEmail() {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    return `loadtester_${timestamp}_${randomString}@example.com`;
}

export default function () {
    const registerUrl = `${BASE_URL}/api/v1/auth/register`;

    // Generate a fresh, unique email for this specific attempt
    const uniqueEmail = generateRandomEmail();

    const payload = JSON.stringify({
        name: "loadster",
        email: uniqueEmail,
        password: TESTER_PASSWORD,
        phone: "12345678",
        address: "123 Main St",
        answer: "123",
    });

    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    // Send the POST request to the register URL
    const res = http.post(registerUrl, payload, params);

    // Validate the response
    check(res, {
        // We do both just in case our email generation gives a duplicate email but this will still mean its a valid registration attempt
        'status is 200 or 201': (r) => r.status === 200 || r.status === 201,
        'registration successful': (r) => r.json().success === true,
    });

    // Wait 1 to 2 seconds between requests per user to simulate realistic behavior
    sleep(Math.random() + 1);
}
