/**
 * NF-P01: Performance – Response Time
 *
 * Mục tiêu: Đánh giá thời gian phản hồi của hệ thống khi người dùng
 *           thực hiện các thao tác thông thường.
 *
 * Kịch bản: Mô phỏng người dùng truy cập trang chính, truy vấn danh sách
 *           robot, xem chi tiết robot và kiểm tra mã robot.
 *
 * Chỉ số đo: Average Response Time, P95 Latency
 * Tiêu chí:  Avg < 2s
 *
 * Cách chạy:
 *   k6 run test/k6/NF-P01-response-time.js
 *   k6 run test/k6/NF-P01-response-time.js --env BASE_URL=http://130.33.114.1:8080
 *   k6 run test/k6/NF-P01-response-time.js --env TOKEN=<your_token>
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ─── Custom Metrics ──────────────────────────────────────────────────────────

const getUserMeDuration     = new Trend('get_user_me_duration', true);
const getConnectionDuration = new Trend('get_connection_duration', true);
const getWorkspaceDuration  = new Trend('get_workspace_duration', true);
const getProcessesDuration  = new Trend('get_processes_duration', true);
const getRobotsDuration     = new Trend('get_robots_duration', true);

const errorRate = new Rate('errors');
const requestCount = new Counter('total_requests');

// ─── Configuration ──────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://130.33.114.1:8080';
const TOKEN    = __ENV.TOKEN    || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im1pbmhjaGllbjY2MjAwNEBnbWFpbC5jb20iLCJpZCI6MSwiaWF0IjoxNzczMTI5NjY4LCJleHAiOjE3NzM3MzQ0Njh9.cjKCDpDfqQGYX6iwmvvjo7XVLVA_H7ogZdojnIhffok';

// ─── k6 Options ──────────────────────────────────────────────────────────────

export const options = {
  // Simulate a moderate, steady load to measure response times accurately
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 VUs
    { duration: '1m',  target: 10 },   // Stay at 10 VUs for 1 minute
    { duration: '30s', target: 20 },   // Ramp up to 20 VUs
    { duration: '1m',  target: 20 },   // Stay at 20 VUs for 1 minute
    { duration: '30s', target: 0 },    // Ramp down
  ],

  thresholds: {
    // Overall HTTP request duration thresholds
    'http_req_duration':          ['avg<2000', 'p(95)<5000'],

    // Per-endpoint thresholds
    'get_user_me_duration':       ['avg<2000', 'p(95)<5000'],
    'get_connection_duration':    ['avg<2000', 'p(95)<5000'],
    'get_workspace_duration':     ['avg<2000', 'p(95)<5000'],
    'get_processes_duration':     ['avg<2000', 'p(95)<5000'],
    'get_robots_duration':        ['avg<2000', 'p(95)<5000'],

    // Error rate should be below 1%
    'errors':                     ['rate<0.01'],
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

// ─── Main Scenario ───────────────────────────────────────────────────────────

export default function () {
  // 1) Truy cập thông tin người dùng (trang chính)
  group('GET /users/me – Thông tin người dùng', () => {
    const res = http.get(`${BASE_URL}/users/me`, authHeaders());
    requestCount.add(1);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(!success);
    getUserMeDuration.add(res.timings.duration);
  });

  sleep(1);

  // 2) Truy vấn danh sách kết nối
  group('GET /connection – Danh sách kết nối', () => {
    const res = http.get(`${BASE_URL}/connection`, authHeaders());
    requestCount.add(1);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(!success);
    getConnectionDuration.add(res.timings.duration);
  });

  sleep(1);

  // 3) Truy vấn workspace
  group('GET /workspace – Danh sách workspace', () => {
    const res = http.get(`${BASE_URL}/workspace`, authHeaders());
    requestCount.add(1);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(!success);
    getWorkspaceDuration.add(res.timings.duration);
  });

  sleep(1);

  // 4) Truy vấn danh sách processes
  group('GET /processes – Danh sách processes', () => {
    const res = http.get(`${BASE_URL}/processes?limit=10&page=1`, authHeaders());
    requestCount.add(1);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(!success);
    getProcessesDuration.add(res.timings.duration);
  });

  sleep(1);

  // 5) Truy vấn danh sách robot
  group('GET /robot – Danh sách robot', () => {
    const res = http.get(`${BASE_URL}/robot?limit=10&page=1`, authHeaders());
    requestCount.add(1);

    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 2s': (r) => r.timings.duration < 2000,
    });
    errorRate.add(!success);
    getRobotsDuration.add(res.timings.duration);
  });

  // Think time between iterations
  sleep(Math.random() * 2 + 1);
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  const summary = {
    test_id: 'NF-P01',
    test_name: 'Performance – Response Time',
    timestamp: new Date().toISOString(),
    thresholds_passed: !Object.values(data.root_group?.checks || {}).some(
      (c) => c.fails > 0
    ),
    metrics: {
      http_req_duration: {
        avg: data.metrics?.http_req_duration?.values?.avg,
        p95: data.metrics?.http_req_duration?.values?.['p(95)'],
        max: data.metrics?.http_req_duration?.values?.max,
      },
      total_requests: data.metrics?.total_requests?.values?.count,
      error_rate: data.metrics?.errors?.values?.rate,
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
    '/scripts/results/NF-P01-result.json': JSON.stringify(summary, null, 2),
  };
}

// k6 built-in text summary helper
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.3/index.js';
