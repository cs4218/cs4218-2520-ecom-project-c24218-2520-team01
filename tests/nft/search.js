import http from 'k6/http';
import { check, sleep } from 'k6';

// Written by Nicholas Cheng, A0269648H

// Save our base URL as a const
const BASE_URL = 'http://localhost:6060';

const searchTerms = [
    'Smartphone', 'Textbook', "Laptop", "The Law of Contract in Singapore",
    'Novel', 'NUS T-shirt'
];

/**
 * We will increase the number of VU since searching is a core part of the e-commerce website.
 * Even if the user is not a member they can still search on the website
 */

export const options = {
    stages: [
        { duration: '30s', target: 100 },  // Ramp up to a light load in 30 seconds
        { duration: '30s', target: 100 },  // Hold at 100 VUs for 30 seconds
        { duration: '30s', target: 200 },  // Ramp up to expected load in 30 seconds
        { duration: '30s', target: 200 },  // Hold at 200 VUs for 30 seconds
        { duration: '30s', target: 500 }, // Ramp up to heavy load in 30 seconds
        { duration: '30s', target: 500 }, // Hold at 500 VUs for 30 seconds
        { duration: '30s', target: 1000 }, // Ramp up to stress load in 30 seconds
        { duration: '30s', target: 1000 }, // Hold at 1000 VUs for 30 seconds
        { duration: '1m', target: 0 }, // Ramp down to 0 VUs to observe server recovery
    ],

    // Thresholds define what is considered a "pass" or "fail"
    thresholds: {
        http_req_duration: ['p(90)<1000', 'p(95)<1500'], // 90% of all requests must complete in under 1000ms, 95% of all requests must complete in under 1500ms
        http_req_failed: ['rate<0.01'],    // The error rate (like 500 or 404 errors) must be less than 1% which is a guideline to follow
    },
};

/**
 * The default function runs for every Virtual User (VU) iteration.
 */
export default function () {
    // Pick a random search term from our array
    const randomIndex = Math.floor(Math.random() * searchTerms.length);
    const item = searchTerms[randomIndex];


    const searchUrl = `${BASE_URL}/api/v1/product/search/${item}`;

    // Execute the GET request
    const res = http.get(searchUrl);

    // Validate the response
    check(res, {
        'status is 200': (r) => r.status === 200,
        'returned': (r) => r.json() !== undefined, // Check if the API returned an array of results which can be empty
    });

    // Wait 1 to 3 seconds between searches
    sleep(Math.random() * 2 + 1);
}
