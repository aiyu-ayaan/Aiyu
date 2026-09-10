import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RepoReadme, { normalizeGithubAlerts } from './RepoReadme';

describe('RepoReadme raw HTML', () => {
    it('renders the <div align="center"> header READMEs open with', () => {
        const { container } = render(
            <RepoReadme markdown={'<div align="center"><h1>Switchboard</h1><p>Control your PC.</p></div>'} />
        );
        expect(screen.getByText('Switchboard')).toBeTruthy();
        expect(screen.getByText('Control your PC.')).toBeTruthy();
        // The literal markup must not survive as text.
        expect(container.textContent).not.toContain('<div');
    });

    it('renders an HTML <img> and keeps its intrinsic size', () => {
        const { container } = render(
            <RepoReadme markdown={'<img src="https://raw.githubusercontent.com/a/b/main/icon.png" width="128" height="128" alt="Logo" />'} />
        );
        const img = container.querySelector('img');
        expect(img).toBeTruthy();
        expect(img.getAttribute('width')).toBe('128');
    });

    it('strips <script> so repo markup cannot execute on this origin', () => {
        const { container } = render(
            <RepoReadme markdown={'<script>window.__pwned = 1</script>\n\nHello'} />
        );
        expect(container.querySelector('script')).toBeNull();
        expect(screen.getByText('Hello')).toBeTruthy();
    });

    it('strips <iframe> and inline event handlers', () => {
        const { container } = render(
            <RepoReadme markdown={'<iframe src="https://evil.test"></iframe><p onclick="alert(1)">hi</p>'} />
        );
        expect(container.querySelector('iframe')).toBeNull();
        expect(container.querySelector('p[onclick]')).toBeNull();
    });

    it('drops javascript: hrefs', () => {
        const { container } = render(<RepoReadme markdown={'<a href="javascript:alert(1)">click</a>'} />);
        const anchor = container.querySelector('a');
        expect(anchor?.getAttribute('href') || '').not.toContain('javascript:');
    });
});

describe('normalizeGithubAlerts', () => {
    it('replaces the [!NOTE] token with a readable label', () => {
        expect(normalizeGithubAlerts('> [!NOTE]\n> Body')).toBe('> **Note**\n> Body');
    });

    it('handles every alert type', () => {
        expect(normalizeGithubAlerts('> [!WARNING]')).toBe('> **Warning**');
        expect(normalizeGithubAlerts('> [!TIP]')).toBe('> **Tip**');
        expect(normalizeGithubAlerts('> [!CAUTION]')).toBe('> **Caution**');
        expect(normalizeGithubAlerts('> [!IMPORTANT]')).toBe('> **Important**');
    });

    it('leaves ordinary quotes and bracket text alone', () => {
        expect(normalizeGithubAlerts('> just a quote')).toBe('> just a quote');
        expect(normalizeGithubAlerts('See [!important] inline')).toBe('See [!important] inline');
    });
});
