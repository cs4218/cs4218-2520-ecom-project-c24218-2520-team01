import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '10s', target: 20 },
        { duration: '30s', target: 200 }, // Set a spike of 200 VUs for 2 durations of 30s
        { duration: '30s', target: 200 },
        { duration: '10s', target: 20 },
        { duration: '10s', target: 0 },
    ],
    thresholds: {
        http_req_duration: ['p(95)<1000'], // 95% of requests should be <1s
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

export default function () {
    const name = `k6user_${makeRandomString(8)}`;
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

    // Register
    let res = http.post(`${BASE_URL}/api/v1/auth/register`, registerPayload, params);

    check(res, {
        'register status is 201': (r) => r.status === 201,
    });

    sleep(Math.random() * 2);

    // Login
    const loginPayload = JSON.stringify({
        email: email,
        password: password,
    });

    res = http.post(`${BASE_URL}/api/v1/auth/login`, loginPayload, params);

    check(res, { 'login status is 200': (r) => r.status === 200, });

    sleep(Math.random() * 2);
}
