import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RepoSyncPanel from './RepoSyncPanel';

const REPOS = [
    { name: 'Aiyu', fullName: 'aiyu-ayaan/Aiyu', description: 'portfolio', language: 'JavaScript', stars: 7, forks: 2, isPrivate: false, isFork: false, isArchived: false, pushedAt: new Date().toISOString() },
    { name: 'Switchboard', fullName: 'aiyu-ayaan/Switchboard', description: 'hardware', language: 'Python', stars: 0, forks: 0, isPrivate: false, isFork: false, isArchived: false, pushedAt: new Date().toISOString() },
];

beforeEach(() => {
    global.fetch = vi.fn(async (url) => {
        if (String(url).includes('/api/github/config')) {
            return { ok: true, json: async () => ({ success: true, data: REPOS.map((r) => r.name), repos: REPOS }) };
        }
        return { ok: true, json: async () => ([]) };
    });
});

describe('RepoSyncPanel selection', () => {
    it('checks a repo when its row is clicked', async () => {
        const user = userEvent.setup();
        render(<RepoSyncPanel username="aiyu-ayaan" hiddenRepos={[]} />);

        await waitFor(() => expect(screen.getByText('Aiyu')).toBeTruthy());

        const boxes = screen.getAllByRole('checkbox');
        expect(boxes).toHaveLength(2);
        expect(boxes[0].checked).toBe(false);

        await user.click(boxes[0]);

        expect(boxes[0].checked).toBe(true);
        expect(screen.getByText('1 selected')).toBeTruthy();
    });
});
