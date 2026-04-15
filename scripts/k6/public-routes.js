/* global __ENV */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const DURATION = __ENV.DURATION || '60s';
const VUS = Number(__ENV.VUS || 20);

const htmlLatency = new Trend('public_html_latency_ms');
const apiLatency = new Trend('public_api_latency_ms');
const failures = new Counter('public_failures');

export const options = {
  scenarios: {
    publicHtml: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
      exec: 'hitPublicHtml',
    },
    publicApi: {
      executor: 'constant-vus',
      vus: Math.max(5, Math.floor(VUS / 2)),
      duration: DURATION,
      exec: 'hitPublicApi',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2500', 'p(99)<5000'],
    public_html_latency_ms: ['p(95)<2500'],
    public_api_latency_ms: ['p(95)<1800'],
  },
};

const htmlRoutes = [
  '/',
  '/about-me',
  '/blogs',
  '/projects',
  '/apps',
  '/gallery',
  '/github',
  '/contact-us',
];

const apiRoutes = [
  '/api/config',
  '/api/gallery',
  '/api/blogs',
  '/api/github/stats',
];

function randomPick(list) {
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

export function hitPublicHtml() {
  const path = randomPick(htmlRoutes);
  const response = http.get(`${BASE_URL}${path}`);
  htmlLatency.add(response.timings.duration, { route: path });

  const ok = check(response, {
    'html status is 200': (r) => r.status === 200,
    'html latency < 5s': (r) => r.timings.duration < 5000,
  });

  if (!ok) {
    failures.add(1, { type: 'html', route: path });
  }

  sleep(0.5);
}

export function hitPublicApi() {
  const path = randomPick(apiRoutes);
  const response = http.get(`${BASE_URL}${path}`);
  apiLatency.add(response.timings.duration, { route: path });

  const ok = check(response, {
    'api status is 2xx': (r) => r.status >= 200 && r.status < 300,
    'api latency < 4s': (r) => r.timings.duration < 4000,
  });

  if (!ok) {
    failures.add(1, { type: 'api', route: path });
  }

  sleep(0.5);
}
