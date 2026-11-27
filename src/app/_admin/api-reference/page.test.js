import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('next/navigation', () => ({
    usePathname: () => '/admin/api-reference',
}));

import { AdminFeedbackProvider } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import AdminApiReferencePage from './page';

function renderPage() {
    return render(
        <AdminFeedbackProvider>
            <AdminApiReferencePage />
        </AdminFeedbackProvider>
    );
}

const FUTURE_ISO = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString();
const PAST_ISO = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
const CREATED_ISO = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

const INITIAL_TOKENS = [
    {
        id: 'tok-active',
        name: 'Claude Desktop',
        lastFour: '1a2b',
        scope: 'read',
        createdAt: CREATED_ISO,
        expiresAt: FUTURE_ISO,
        lastUsedAt: CREATED_ISO,
        revokedAt: null,
    },
    {
        id: 'tok-expired',
        name: 'Old Audit Script',
        lastFour: '3c4d',
        scope: 'write',
        createdAt: CREATED_ISO,
        expiresAt: PAST_ISO,
        lastUsedAt: null,
        revokedAt: null,
    },
    {
        id: 'tok-revoked',
        name: 'Retired Bot',
        lastFour: '5e6f',
        scope: 'read',
        createdAt: CREATED_ISO,
        expiresAt: FUTURE_ISO,
        lastUsedAt: null,
        revokedAt: CREATED_ISO,
    },
];

describe('AdminApiReferencePage - Code Mode Agent Tokens panel', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('renders tokens with masked preview, scope, status, and active-only revoke buttons', async () => {
        global.fetch = vi.fn(async (url) => {
            if (String(url) === '/api/admin/blogs/token') {
                return { ok: true, json: async () => ({ success: true, data: { hasToken: false, last4: '', createdAt: null } }) };
            }
            if (String(url) === '/api/admin/codemode/tokens') {
                return { ok: true, json: async () => ({ success: true, tokens: INITIAL_TOKENS }) };
            }
            return { ok: false, json: async () => ({ success: false }) };
        });

        renderPage();

        const panel = document.getElementById('codemode-tokens');
        expect(panel).toBeTruthy();
        expect(within(panel).getByText(/30 days/i)).toBeTruthy();
        expect(within(panel).getByText(/POST \/api\/codemode\/search/i)).toBeTruthy();
        expect(within(panel).getByText(/POST \/api\/codemode\/execute/i)).toBeTruthy();
        expect(within(panel).getByText(/prompt injections/i)).toBeTruthy();

        const table = await waitFor(() => within(panel).getByRole('table'));
        const rows = within(table).getAllByRole('row');
        // 1 header row + 3 token rows
        expect(rows).toHaveLength(4);

        // Active token row
        expect(within(rows[1]).getByText('Claude Desktop')).toBeTruthy();
        expect(within(rows[1]).getByText('aiyu_agent_…1a2b')).toBeTruthy();
        expect(within(rows[1]).getByText('read')).toBeTruthy();
        expect(within(rows[1]).getByText('active')).toBeTruthy();
        expect(within(rows[1]).getByRole('button', { name: /revoke/i })).toBeTruthy();

        // Expired token row (no revoke button)
        expect(within(rows[2]).getByText('Old Audit Script')).toBeTruthy();
        expect(within(rows[2]).getByText('aiyu_agent_…3c4d')).toBeTruthy();
        expect(within(rows[2]).getByText('write')).toBeTruthy();
        expect(within(rows[2]).getByText('expired')).toBeTruthy();
        expect(within(rows[2]).queryByRole('button', { name: /revoke/i })).toBeNull();

        // Revoked token row (no revoke button)
        expect(within(rows[3]).getByText('Retired Bot')).toBeTruthy();
        expect(within(rows[3]).getByText('aiyu_agent_…5e6f')).toBeTruthy();
        expect(within(rows[3]).getByText('revoked')).toBeTruthy();
        expect(within(rows[3]).queryByRole('button', { name: /revoke/i })).toBeNull();
    });

    it('validates empty name, creates a token with selected scope, and shows one-time reveal banner', async () => {
        const user = userEvent.setup();
        const createdItem = {
            id: 'tok-new',
            name: 'Release Agent',
            lastFour: '9z8y',
            scope: 'write',
            createdAt: new Date().toISOString(),
            expiresAt: FUTURE_ISO,
            lastUsedAt: null,
            revokedAt: null,
        };

        global.fetch = vi.fn(async (url, opts) => {
            if (String(url) === '/api/admin/blogs/token') {
                return { ok: true, json: async () => ({ success: true, data: { hasToken: false, last4: '', createdAt: null } }) };
            }
            if (String(url) === '/api/admin/codemode/tokens' && (!opts || opts.method !== 'POST')) {
                return { ok: true, json: async () => ({ success: true, tokens: [] }) };
            }
            if (String(url) === '/api/admin/codemode/tokens' && opts?.method === 'POST') {
                return {
                    ok: true,
                    json: async () => ({
                        success: true,
                        token: 'aiyu_agent_secret_full_value_9z8y',
                        item: createdItem,
                    }),
                };
            }
            return { ok: false, json: async () => ({ success: false }) };
        });

        renderPage();

        const panel = document.getElementById('codemode-tokens');
        await waitFor(() => expect(within(panel).getByText(/no code mode agent tokens yet/i)).toBeTruthy());

        // Empty submit shows inline validation error
        await user.click(within(panel).getByRole('button', { name: /create agent token/i }));
        expect(within(panel).getByText(/enter a name for this agent token/i)).toBeTruthy();

        const nameInput = within(panel).getByLabelText(/token name/i);
        const scopeSelect = within(panel).getByLabelText(/scope/i);
        expect(scopeSelect.value).toBe('read');

        await user.type(nameInput, 'Release Agent');
        await user.selectOptions(scopeSelect, 'write');
        await user.click(within(panel).getByRole('button', { name: /create agent token/i }));

        await waitFor(() =>
            expect(within(panel).getByText('aiyu_agent_secret_full_value_9z8y')).toBeTruthy()
        );
        expect(within(panel).getByText(/copy this token now — shown once/i)).toBeTruthy();

        const postCall = global.fetch.mock.calls.find(
            ([url, opts]) => url === '/api/admin/codemode/tokens' && opts?.method === 'POST'
        );
        expect(postCall).toBeTruthy();
        expect(JSON.parse(postCall[1].body)).toEqual({ name: 'Release Agent', scope: 'write' });

        // Form resets to empty name + safe default read scope
        expect(nameInput.value).toBe('');
        expect(scopeSelect.value).toBe('read');

        // New token appears in the table
        const table = within(panel).getByRole('table');
        expect(within(table).getByText('Release Agent')).toBeTruthy();
        expect(within(table).getByText('aiyu_agent_…9z8y')).toBeTruthy();
    });

    it('revokes an active token after confirmation', async () => {
        const user = userEvent.setup();

        global.fetch = vi.fn(async (url, opts) => {
            if (String(url) === '/api/admin/blogs/token') {
                return { ok: true, json: async () => ({ success: true, data: { hasToken: false, last4: '', createdAt: null } }) };
            }
            if (String(url) === '/api/admin/codemode/tokens') {
                return { ok: true, json: async () => ({ success: true, tokens: [INITIAL_TOKENS[0]] }) };
            }
            if (String(url) === '/api/admin/codemode/tokens/tok-active' && opts?.method === 'DELETE') {
                return { ok: true, json: async () => ({ success: true }) };
            }
            return { ok: false, json: async () => ({ success: false }) };
        });

        renderPage();

        const panel = document.getElementById('codemode-tokens');
        const table = await waitFor(() => within(panel).getByRole('table'));
        await user.click(within(table).getByRole('button', { name: /^revoke$/i }));

        // Confirm dialog appears
        const dialog = await screen.findByRole('dialog');
        expect(within(dialog).getByText(/revoke "claude desktop"\?/i)).toBeTruthy();
        await user.click(within(dialog).getByRole('button', { name: /^revoke$/i }));

        await waitFor(() => {
            expect(within(table).getByText('revoked')).toBeTruthy();
            expect(within(table).queryByRole('button', { name: /revoke/i })).toBeNull();
        });
    });

    it('shows an error alert and allows retry when loading tokens fails', async () => {
        const user = userEvent.setup();
        let attempt = 0;

        global.fetch = vi.fn(async (url) => {
            if (String(url) === '/api/admin/blogs/token') {
                return { ok: true, json: async () => ({ success: true, data: { hasToken: false, last4: '', createdAt: null } }) };
            }
            if (String(url) === '/api/admin/codemode/tokens') {
                attempt += 1;
                if (attempt === 1) {
                    return { ok: false, json: async () => ({ success: false, error: 'Database unavailable' }) };
                }
                return { ok: true, json: async () => ({ success: true, tokens: [INITIAL_TOKENS[0]] }) };
            }
            return { ok: false, json: async () => ({ success: false }) };
        });

        renderPage();

        const panel = document.getElementById('codemode-tokens');
        await waitFor(() => expect(within(panel).getByText('Database unavailable')).toBeTruthy());

        await user.click(within(panel).getByRole('button', { name: /retry/i }));

        const table = await waitFor(() => within(panel).getByRole('table'));
        expect(within(table).getByText('Claude Desktop')).toBeTruthy();
    });

    it('renders the Code Mode API reference section with endpoints, sandbox globals, and limits', async () => {
        global.fetch = vi.fn(async (url) => {
            if (String(url) === '/api/admin/blogs/token') {
                return { ok: true, json: async () => ({ success: true, data: { hasToken: false, last4: '', createdAt: null } }) };
            }
            if (String(url) === '/api/admin/codemode/tokens') {
                return { ok: true, json: async () => ({ success: true, tokens: [] }) };
            }
            return { ok: false, json: async () => ({ success: false }) };
        });

        renderPage();

        const panel = document.getElementById('codemode-tokens');
        await waitFor(() =>
            expect(within(panel).getByText(/no code mode agent tokens yet/i)).toBeTruthy()
        );

        const apiPanel = document.getElementById('codemode-api');
        expect(apiPanel).toBeTruthy();
        expect(within(apiPanel).getByText('/api/codemode/search')).toBeTruthy();
        expect(within(apiPanel).getByText('/api/codemode/execute')).toBeTruthy();
        expect(within(apiPanel).getByText(/codemode\.upload/i)).toBeTruthy();
        expect(within(apiPanel).getByText(/64 KB \/ 24,000 chars/i)).toBeTruthy();
        expect(within(apiPanel).getByText(/2 concurrent \/ 30 \/ min per IP/i)).toBeTruthy();
    });

    it('renders VS Code Dark+ syntax-highlighted token spans for javascript, bash, and http blocks and preserves Copy', async () => {
        const user = userEvent.setup();
        const writeText = vi.fn(async () => {});
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });

        global.fetch = vi.fn(async (url) => {
            if (String(url) === '/api/admin/blogs/token') {
                return { ok: true, json: async () => ({ success: true, data: { hasToken: false, last4: '', createdAt: null } }) };
            }
            if (String(url) === '/api/admin/codemode/tokens') {
                return { ok: true, json: async () => ({ success: true, tokens: [] }) };
            }
            return { ok: false, json: async () => ({ success: false }) };
        });

        renderPage();

        const panel = document.getElementById('codemode-tokens');
        await waitFor(() =>
            expect(within(panel).getByText(/no code mode agent tokens yet/i)).toBeTruthy()
        );

        const apiPanel = document.getElementById('codemode-api');
        for (const lang of ['http', 'bash', 'javascript']) {
            const block = apiPanel.querySelector(`[data-code-lang="${lang}"]`);
            expect(block).toBeTruthy();
            const tokenSpans = block.querySelectorAll('span.token');
            expect(tokenSpans.length).toBeGreaterThan(0);
            const coloredSpans = Array.from(tokenSpans).filter((el) => Boolean(el.style.color));
            expect(coloredSpans.length).toBeGreaterThan(0);
        }

        const jsBlock = apiPanel.querySelector('[data-code-lang="javascript"]');
        expect(jsBlock.textContent).toContain('codemode.request');
        await user.click(within(jsBlock).getByRole('button', { name: /copy/i }));
        expect(writeText).toHaveBeenCalledTimes(1);
        expect(writeText.mock.calls[0][0]).toContain('codemode.request');
    });
});
