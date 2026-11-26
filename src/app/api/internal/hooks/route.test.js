import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createHmac } from 'crypto';

const cache = vi.hoisted(() => ({ invalidatePrefixAsync: vi.fn(), invalidateAsync: vi.fn() }));
const autoPing = vi.hoisted(() => vi.fn());
vi.mock('@/lib/cache', () => ({ default: cache }));
vi.mock('@/lib/autoIndexing', () => ({ autoPing }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { POST } = await import('./route');

const call = (key) => POST(new Request('http://localhost/api/internal/hooks', {
    method: 'POST',
    headers: key ? { 'x-aiyu-internal': key } : {},
    body: JSON.stringify({ prefixes: ['db:blogs'], keys: ['db:home'], pings: [{ paths: ['/blogs'], type: 'URL_DELETED' }] }),
}));

describe('POST /api/internal/hooks', () => {
    beforeAll(() => { process.env.JWT_SECRET = 's'; });

    it('is invisible without the internal key', async () => {
        for (const key of ['', 'wrong', createHmac('sha256', 's').update('internal:export').digest('hex')]) {
            expect((await call(key)).status).toBe(404);
        }
        expect(cache.invalidatePrefixAsync).not.toHaveBeenCalled();
        expect(autoPing).not.toHaveBeenCalled();
    });

    it('clears the caches and queues the pings', async () => {
        const res = await call(createHmac('sha256', 's').update('internal:hooks').digest('hex'));
        expect(res.status).toBe(204);
        expect(cache.invalidatePrefixAsync).toHaveBeenCalledWith('db:blogs');
        expect(cache.invalidateAsync).toHaveBeenCalledWith('db:home');
        expect(autoPing).toHaveBeenCalledWith(['/blogs'], 'URL_DELETED');
    });
});
