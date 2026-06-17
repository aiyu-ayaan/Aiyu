import { describe, it, expect } from 'vitest';
import { cpuPercentFromSamples, formatBytes } from './serverMetrics';

describe('cpuPercentFromSamples', () => {
    it('returns 0 when fully idle (all delta is idle)', () => {
        const prev = { idle: 1000, total: 2000 };
        const cur = { idle: 1100, total: 2100 }; // 100 idle of 100 total delta
        expect(cpuPercentFromSamples(prev, cur)).toBe(0);
    });
    it('returns 100 when fully busy (no idle delta)', () => {
        const prev = { idle: 1000, total: 2000 };
        const cur = { idle: 1000, total: 2100 }; // 0 idle of 100 total delta
        expect(cpuPercentFromSamples(prev, cur)).toBe(100);
    });
    it('returns 50 for half-idle window', () => {
        const prev = { idle: 1000, total: 2000 };
        const cur = { idle: 1050, total: 2100 }; // 50 idle of 100 total delta
        expect(cpuPercentFromSamples(prev, cur)).toBe(50);
    });
    it('guards against zero/negative total delta', () => {
        expect(cpuPercentFromSamples({ idle: 1, total: 1 }, { idle: 1, total: 1 })).toBe(0);
    });
    it('clamps to the 0–100 range', () => {
        const pct = cpuPercentFromSamples({ idle: 0, total: 0 }, { idle: -10, total: 100 });
        expect(pct).toBeGreaterThanOrEqual(0);
        expect(pct).toBeLessThanOrEqual(100);
    });
});

describe('formatBytes', () => {
    it('formats GB/MB/KB/B thresholds', () => {
        expect(formatBytes(2 * 1024 ** 3)).toBe('2.0 GB');
        expect(formatBytes(5 * 1024 ** 2)).toBe('5 MB');
        expect(formatBytes(3 * 1024)).toBe('3 KB');
        expect(formatBytes(512)).toBe('512 B');
    });
    it('handles nullish/NaN input', () => {
        expect(formatBytes(null)).toBe('—');
        expect(formatBytes(NaN)).toBe('—');
    });
});
