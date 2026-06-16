import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const setThemeMode = vi.fn();
let mockState = { themeMode: 'auto', setThemeMode, mounted: true };

vi.mock('../context/ThemeContext', () => ({
  useTheme: () => mockState,
}));

import ThemeToggle from './ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    setThemeMode.mockClear();
    mockState = { themeMode: 'auto', setThemeMode, mounted: true };
  });

  it('renders the current mode label', () => {
    render(<ThemeToggle />);
    expect(screen.getByText('Auto')).toBeInTheDocument();
  });

  it('cycles auto -> dark on click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button'));
    expect(setThemeMode).toHaveBeenCalledWith('dark');
  });

  it('cycles dark -> light on click', async () => {
    mockState = { themeMode: 'dark', setThemeMode, mounted: true };
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button'));
    expect(setThemeMode).toHaveBeenCalledWith('light');
  });

  it('renders a non-interactive placeholder until mounted', () => {
    mockState = { themeMode: 'auto', setThemeMode, mounted: false };
    render(<ThemeToggle />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
