import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 options to define the load stages and pass/fail thresholds
export const options = {
    stages: [
        // RAMP UP: Gradually increase traffic to find the breaking point
        { duration: '15s', target: 10 },
        { duration: '15s', target: 20 },
        { duration: '15s', target: 40 },
        { duration: '15s', target: 60 },
        { duration: '15s', target: 80 },
        { duration: '15s', target: 100 },

        // PLATEAU: Hold the peak load to test system stability over time
        // 15 seconds is too short to catch memory leaks or DB pool queues.
        { duration: '3m', target: 100 },

        // RAMP DOWN: Cool down gracefully
        { duration: '30s', target: 0 },
    ],
    thresholds: {

        http_req_duration: [
            {
                // 95% of requests must complete below 500ms
                threshold: 'p(95)<500',
                abortOnFail: true,
                delayAbortEval: '10s',
            },
            {
                // Catch the worst 1% of outliers (changed from p90)
                threshold: 'p(99)<1000',
                abortOnFail: true,
                delayAbortEval: '10s',
            }
        ],
        // Less than 1% of requests should fail
        http_req_failed: ['rate<0.01'],
    },
};

// Use an environment variable for the base URL, defaulting to local dev port
const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';

/**
 * setup() runs once before the test starts.
 * We use it to ensure a test user exists so the login tests don't fail.
 */
export function setup() {
    const registerUrl = `${BASE_URL}/api/v1/auth/register`;
    const payload = JSON.stringify({
        name: 'Jane Stresser',
        email: 'JaneStresser@test.com',
        password: 'password123',
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
        email: 'JaneStresser@test.com',
        password: 'password123',
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

    // Pacing: Wait 1 second between requests per user to simulate realistic behavior
    sleep(1);
}
