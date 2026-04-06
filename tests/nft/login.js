import http from 'k6/http';
import { check, sleep } from 'k6';

// k6 options to define the load stages and pass/fail thresholds
export const options = {
    stages: [
        { duration: '30s', target: 20 },  // Ramp-up: 0 to 20 users over 30s
        { duration: '10s', target: 20 },   // Plateaus: Stay at 20 users for 10s
        { duration: '30s', target: 40 },  // Ramp-up: 20 to 40 users over 30s
        { duration: '10s', target: 40 },   // Plateaus: Stay at 40 users for 10s
        { duration: '30s', target: 80 },  // Ramp-up: 40 to 80 users over 30s
        { duration: '10s', target: 80 },   // Plateaus: Stay at 80 users for 10s
        { duration: '30s', target: 160 },  // Ramp-up: 80 to 160 users over 30s
        { duration: '10s', target: 160 },   // Plateaus: Stay at 160 users for 10s
        { duration: '20s', target: 0 },   // Ramp-down: Back to 0
    ],
    thresholds: {

        // 95% of requests must complete below 500ms
        http_req_duration: [{
            threshold: 'p(95)<500',
            abortOnFail: true,
            delayAbortEval: '10s',
        }],
        // Less than 1% of requests should fail as a threshold recommended in lecture
        http_req_failed: ['rate<0.01'],
        // Throughput threshold of 20 requests per second
        http_reqs: ['rate>20'],
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
