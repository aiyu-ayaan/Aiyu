import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    stages: [
        { duration: '1m', target: 1000 },
        { duration: '1m', target: 2500 },
        { duration: '1m', target: 5000 },
        { duration: '1m', target: 7500 },
        { duration: '1m', target: 10000 },
        { duration: '5m', target: 10000 },
        { duration: '2m', target: 0 },
    ],

    thresholds: {
        http_req_failed: [
            {
                threshold: 'rate<0.05', // less than 5% failures
                abortOnFail: true,
            },
        ],
    },
};

export default function () {
    const res = http.get('http://localhost:3000');

    check(res, {
        'status was 200': (r) => r.status === 200,
    });

    sleep(1);
}