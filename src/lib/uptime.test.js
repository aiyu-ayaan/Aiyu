import { describe, it, expect } from 'vitest';
import { classifyStatus } from './uptime';

describe('classifyStatus', () => {
    it('treats 2xx as up', () => {
        expect(classifyStatus(200)).toBe('up');
        expect(classifyStatus(204)).toBe('up');
    });
    it('treats 3xx as up (redirects still reachable)', () => {
        expect(classifyStatus(301)).toBe('up');
        expect(classifyStatus(399)).toBe('up');
    });
    it('treats 4xx/5xx as down', () => {
        expect(classifyStatus(404)).toBe('down');
        expect(classifyStatus(500)).toBe('down');
        expect(classifyStatus(503)).toBe('down');
    });
    it('treats 0 (network error sentinel) as down', () => {
        expect(classifyStatus(0)).toBe('down');
    });
});
