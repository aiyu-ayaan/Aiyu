import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

let mockPathname = '/v2';

vi.mock('next/navigation', () => ({
    usePathname: () => mockPathname,
}));

vi.mock('../../ThemeToggle', () => ({
    default: () => <button type="button">theme</button>,
}));

vi.mock('../../admin/TerminalPath', () => ({
    default: () => <div data-testid="terminal-path" />,
}));

import V2Header from './V2Header';

describe('V2Header mobile menu', () => {
    beforeEach(() => {
        mockPathname = '/v2';
        document.cookie = 'site-version=; path=/; max-age=0';
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    });

    it('keeps the overlay hidden until [menu] is tapped', async () => {
        const user = userEvent.setup();
        render(<V2Header />, { wrapper: MemoryRouter });

        const overlay = document.getElementById('v2-mobile-menu');
        expect(overlay).toHaveAttribute('aria-hidden', 'true');

        await user.click(screen.getByRole('button', { name: /open navigation menu/i }));
        expect(overlay).toHaveAttribute('aria-hidden', 'false');
        expect(document.body.style.overflow).toBe('hidden');
    });

    it('lists every nav link plus contact in the overlay', async () => {
        const user = userEvent.setup();
        render(<V2Header />, { wrapper: MemoryRouter });
        await user.click(screen.getByRole('button', { name: /open navigation menu/i }));

        const overlayNav = screen.getByRole('navigation', { name: /v2 mobile navigation/i });
        for (const label of ['home', 'about', 'projects', 'gallery', 'apps', 'blogs', 'github']) {
            expect(overlayNav).toHaveTextContent(label);
        }
        expect(overlayNav).toHaveTextContent('contact --me');
    });

    it('closes on [x] and restores body scroll', async () => {
        const user = userEvent.setup();
        render(<V2Header />, { wrapper: MemoryRouter });
        await user.click(screen.getByRole('button', { name: /open navigation menu/i }));
        await user.click(screen.getByRole('button', { name: /close navigation menu/i }));

        expect(document.getElementById('v2-mobile-menu')).toHaveAttribute('aria-hidden', 'true');
        expect(document.body.style.overflow).toBe('');
    });

    it('closes on Escape', async () => {
        const user = userEvent.setup();
        render(<V2Header />, { wrapper: MemoryRouter });
        await user.click(screen.getByRole('button', { name: /open navigation menu/i }));
        await user.keyboard('{Escape}');

        expect(document.getElementById('v2-mobile-menu')).toHaveAttribute('aria-hidden', 'true');
    });

    it('has no classic (/v1) link', async () => {
        const user = userEvent.setup();
        render(<V2Header />, { wrapper: MemoryRouter });
        await user.click(screen.getByRole('button', { name: /open navigation menu/i }));

        const overlayNav = screen.getByRole('navigation', { name: /v2 mobile navigation/i });
        const hrefs = Array.from(overlayNav.querySelectorAll('a')).map((a) => a.getAttribute('href'));
        expect(hrefs.some((h) => h === '/v1' || h?.startsWith('/v1/'))).toBe(false);
    });

    it('renders custom nav links in the sequence defined in data', async () => {
        const mockData = {
            navLinks: [
                { name: 'custom1', href: '/custom-route-1', visible: true },
                { name: 'custom2', href: '/custom-route-2', visible: true },
                { name: 'hidden1', href: '/hidden-route', visible: false },
            ],
        };
        const user = userEvent.setup();
        render(<V2Header data={mockData} />, { wrapper: MemoryRouter });
        await user.click(screen.getByRole('button', { name: /open navigation menu/i }));

        const overlayNav = screen.getByRole('navigation', { name: /v2 mobile navigation/i });
        expect(overlayNav).toHaveTextContent('custom1');
        expect(overlayNav).toHaveTextContent('custom2');
        expect(overlayNav).not.toHaveTextContent('hidden1');
    });

    it('hides classic link if showClassic is set to false', async () => {
        const mockData = {
            showClassic: false,
            navLinks: [
                { name: 'home', href: '/', visible: true },
            ]
        };
        const user = userEvent.setup();
        render(<V2Header data={mockData} />, { wrapper: MemoryRouter });
        await user.click(screen.getByRole('button', { name: /open navigation menu/i }));

        const overlayNav = screen.getByRole('navigation', { name: /v2 mobile navigation/i });
        expect(overlayNav).not.toHaveTextContent('classic');
    });

    it('renders a custom contact link name and action', async () => {
        const mockData = {
            contactLink: { name: 'ping me', href: '/ping' }
        };
        const user = userEvent.setup();
        render(<V2Header data={mockData} />, { wrapper: MemoryRouter });
        await user.click(screen.getByRole('button', { name: /open navigation menu/i }));

        const overlayNav = screen.getByRole('navigation', { name: /v2 mobile navigation/i });
        expect(overlayNav).toHaveTextContent('ping me');
        expect(overlayNav).not.toHaveTextContent('contact --me');
    });
});
