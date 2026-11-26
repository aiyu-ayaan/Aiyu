import { describe, it, expect, vi } from 'vitest';

// These handlers once ran for anyone: editing and deleting posts, reading and deleting contact messages.
vi.mock('@/lib/auth', () => ({ getSession: vi.fn(async () => null) }));
const touched = vi.fn();
vi.mock('@/lib/prisma', () => ({ prisma: new Proxy({}, { get: touched }) }));
vi.mock('@/utils/notificationService', () => ({ sendNotification: vi.fn() }));

const blog = await import('./blogs/[id]/route');
const contact = await import('./contact/message/route');

describe('admin-only API handlers', () => {
    const params = { params: Promise.resolve({ id: 'x' }) };
    const request = (method) => new Request('http://localhost/api/x?id=x', { method });

    it.each([
        ['PUT /api/blogs/[id]', () => blog.PUT(request('PUT'), params)],
        ['DELETE /api/blogs/[id]', () => blog.DELETE(request('DELETE'), params)],
        ['GET /api/contact/message', () => contact.GET(request('GET'))],
        ['DELETE /api/contact/message', () => contact.DELETE(request('DELETE'))],
    ])('%s answers 401 without a session and leaves the database alone', async (_name, call) => {
        const res = await call();
        expect(res.status).toBe(401);
        expect(touched).not.toHaveBeenCalled();
    });
});
