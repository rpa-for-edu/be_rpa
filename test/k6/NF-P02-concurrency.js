/**
 * NF-P02: Performance – Concurrency
 *
 * Mục tiêu: Đánh giá khả năng xử lý khi có nhiều người dùng truy cập đồng thời.
 *
 * Kịch bản: Tăng dần số lượng virtual users từ 100 → 1000 để mô phỏng
 *           nhiều người dùng đồng thời truy cập hệ thống.
 *
 * Chỉ số đo: Throughput, Error Rate
 * Tiêu chí:  Không xảy ra lỗi hệ thống (Error Rate = 0%)
 *
 * Cách chạy:
 *   k6 run test/k6/NF-P02-concurrency.js
 *   k6 run test/k6/NF-P02-concurrency.js --env BASE_URL=http://130.33.114.1:8080
 *   k6 run test/k6/NF-P02-concurrency.js --env TOKEN=<your_token>
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

// ─── Custom Metrics ──────────────────────────────────────────────────────────

const throughput       = new Counter('successful_requests');
const errorRate        = new Rate('error_rate');
const concurrentUsers  = new Gauge('concurrent_users');

const getUserMeDuration     = new Trend('get_user_me_duration', true);
const getConnectionDuration = new Trend('get_connection_duration', true);
const getWorkspaceDuration  = new Trend('get_workspace_duration', true);
const getProcessesDuration  = new Trend('get_processes_duration', true);
const getRobotsDuration     = new Trend('get_robots_duration', true);

// ─── Configuration ──────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://130.33.114.1:8080';
const TOKEN    = __ENV.TOKEN    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1pbmhjaGllbjY2MjAwNEBnbWFpbC5jb20iLCJpZCI6MSwiaWF0IjoxNzczMTI5NjY4LCJleHAiOjE3NzM3MzQ0Njh9.cjKCDpDfqQGYX6iwmvvjo7XVLVA_H7ogZdojnIhffok';

// ─── k6 Options ──────────────────────────────────────────────────────────────

export const options = {
  // Ramp from 100 → 1000 VUs to test concurrency
  stages: [
    { duration: '1m',  target: 100 },   // Ramp up to 100 VUs
    { duration: '2m',  target: 100 },   // Hold at 100 VUs
    { duration: '1m',  target: 300 },   // Ramp up to 300 VUs
    { duration: '2m',  target: 300 },   // Hold at 300 VUs
    { duration: '1m',  target: 500 },   // Ramp up to 500 VUs
    { duration: '2m',  target: 500 },   // Hold at 500 VUs
    { duration: '1m',  target: 800 },   // Ramp up to 800 VUs
    { duration: '2m',  target: 800 },   // Hold at 800 VUs
    { duration: '1m',  target: 1000 },  // Ramp up to 1000 VUs
    { duration: '3m',  target: 1000 },  // Hold at 1000 VUs – peak load
    { duration: '1m',  target: 0 },     // Ramp down
  ],

  thresholds: {
    // Zero system errors allowed
    'error_rate':        ['rate==0'],

    // Response time should still be reasonable under load
    'http_req_duration': ['p(95)<10000'],  // P95 < 10s even under peak concurrency

    // HTTP failures should be 0
    'http_req_failed':   ['rate==0'],
  },
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function authHeaders() {
  return {
    headers: {
      'Accept':        'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
  };
}

function trackRequest(res, metricTrend) {
  const isSuccess = res.status >= 200 && res.status < 400;

  check(res, {
    'status is 2xx/3xx': () => isSuccess,
    'no server error (5xx)': () => res.status < 500,
  });

  errorRate.add(!isSuccess);

  if (isSuccess) {
    throughput.add(1);
  }

  metricTrend.add(res.timings.duration);
}

// ─── Main Scenario ───────────────────────────────────────────────────────────

export default function () {
  concurrentUsers.add(__VU);

  // Randomly pick an endpoint each iteration to distribute load across APIs
  const endpoints = [
    { name: 'users_me',    fn: () => http.get(`${BASE_URL}/users/me`, authHeaders()) },
    { name: 'connection',  fn: () => http.get(`${BASE_URL}/connection`, authHeaders()) },
    { name: 'workspace',   fn: () => http.get(`${BASE_URL}/workspace`, authHeaders()) },
    { name: 'processes',   fn: () => http.get(`${BASE_URL}/processes?limit=10&page=1`, authHeaders()) },
    { name: 'robots',      fn: () => http.get(`${BASE_URL}/robot?limit=10&page=1`, authHeaders()) },
  ];

  const metrics = [
    getUserMeDuration,
    getConnectionDuration,
    getWorkspaceDuration,
    getProcessesDuration,
    getRobotsDuration,
  ];

  // Each VU calls ALL endpoints in sequence (simulating a real user session)
  for (let i = 0; i < endpoints.length; i++) {
    group(`${endpoints[i].name}`, () => {
      const res = endpoints[i].fn();
      trackRequest(res, metrics[i]);
    });

    // Short pause between requests within session
    sleep(0.5 + Math.random() * 1);
  }

  // Think time between iterations
  sleep(1 + Math.random() * 2);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  const totalReqs = data.metrics?.http_reqs?.values?.count || 0;
  const failedReqs = data.metrics?.http_req_failed?.values?.passes || 0;

  const summary = {
    test_id: 'NF-P02',
    test_name: 'Performance – Concurrency',
    timestamp: new Date().toISOString(),
    thresholds_passed: Object.values(data.metrics || {}).every(
      (m) => !m.thresholds || Object.values(m.thresholds).every((t) => t.ok)
    ),
    metrics: {
      total_requests: totalReqs,
      successful_requests: data.metrics?.successful_requests?.values?.count || 0,
      failed_requests: failedReqs,
      error_rate: data.metrics?.error_rate?.values?.rate || 0,
      throughput: {
        requests_per_second: data.metrics?.http_reqs?.values?.rate,
      },
      http_req_duration: {
        avg: data.metrics?.http_req_duration?.values?.avg,
        med: data.metrics?.http_req_duration?.values?.med,
        p90: data.metrics?.http_req_duration?.values?.['p(90)'],
        p95: data.metrics?.http_req_duration?.values?.['p(95)'],
        max: data.metrics?.http_req_duration?.values?.max,
      },
      peak_vus: data.metrics?.vus_max?.values?.value,
      endpoints: {
        '/users/me':    data.metrics?.get_user_me_duration?.values,
        '/connection':  data.metrics?.get_connection_duration?.values,
        '/workspace':   data.metrics?.get_workspace_duration?.values,
        '/processes':   data.metrics?.get_processes_duration?.values,
        '/robot':       data.metrics?.get_robots_duration?.values,
      },
    },
  };

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    '/scripts/results/NF-P02-result.json': JSON.stringify(summary, null, 2),
  };
}

// k6 built-in text summary helper
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';
