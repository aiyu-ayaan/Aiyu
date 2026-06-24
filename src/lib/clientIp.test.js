import { describe, it, expect } from 'vitest';
import { getClientIP } from '@/lib/clientIp';

function makeRequest(headers) {
    return { headers: new Headers(headers) };
}

describe('getClientIP', () => {
    it('prefers cf-connecting-ip over everything else', () => {
        const ip = getClientIP(makeRequest({
            'cf-connecting-ip': '203.0.113.5',
            'x-real-ip': '10.0.0.1',
            'x-forwarded-for': '1.1.1.1',
        }));
        expect(ip).toBe('203.0.113.5');
    });

    it('falls back to x-real-ip when no cf header is present', () => {
        const ip = getClientIP(makeRequest({
            'x-real-ip': '198.51.100.9',
            'x-forwarded-for': '1.1.1.1, 2.2.2.2',
        }));
        expect(ip).toBe('198.51.100.9');
    });

    it('uses the LAST x-forwarded-for hop, not the client-controlled first', () => {
        const ip = getClientIP(makeRequest({
            'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12',
        }));
        expect(ip).toBe('9.10.11.12');
    });

    it('does not let a spoofed leading XFF entry become the identity', () => {
        const ip = getClientIP(makeRequest({
            'x-forwarded-for': 'attacker-spoofed-value, 9.10.11.12',
        }));
        expect(ip).toBe('9.10.11.12');
        expect(ip).not.toBe('attacker-spoofed-value');
    });

    it('falls back to x-client-ip then unknown', () => {
        expect(getClientIP(makeRequest({ 'x-client-ip': '172.16.0.4' }))).toBe('172.16.0.4');
        expect(getClientIP(makeRequest({}))).toBe('unknown');
    });
});
