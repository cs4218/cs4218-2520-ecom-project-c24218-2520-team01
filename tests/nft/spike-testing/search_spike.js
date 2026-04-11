import http from 'k6/http';
import { check, sleep } from 'k6';

// Lim Jia Wei, A0277381W

export const options = {
  stages: [
    { duration: '10s', target: 50 },
    { duration: '30s', target: 300 }, // Set a spike of 300 VUs for 2 durations of 30s
    { duration: '30s', target: 300 },
    { duration: '10s', target: 50 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // Search query should be fast, so 95% < 500ms
    http_req_failed: ['rate<0.01'],   // Errors should be less than 1%
    checks: ['rate>0.99'],            // Assertions should pass 99% of the time
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:6060';
const KEYWORDS = ['mac', 'macbook', 'iphone', 'samsung', 'rtx5070ti', 'watch', 'rtx5090', 'testtest67'];

export default function () {

  const keyword = KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];

  // Search
  let res = http.get(`${BASE_URL}/api/v1/product/search/${keyword}`);

  check(res, { 'search status is 200': (r) => r.status === 200, });

  sleep(Math.random() * 2);

}
