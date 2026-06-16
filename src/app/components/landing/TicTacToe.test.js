import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../context/ThemeContext', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));
vi.mock('react-confetti', () => ({ default: () => null }));

import TicTacToe from './TicTacToe';

// The 9 board cells are the only buttons that wrap a <span> mark.
const getCells = () =>
  screen.getAllByRole('button').filter((b) => b.querySelector('span'));

describe('TicTacToe', () => {
  it('starts at the mode-select screen', () => {
    render(<TicTacToe onBack={() => {}} />);
    expect(screen.getByText('Choose Game Mode')).toBeInTheDocument();
  });

  it('plays a PvP game and detects a winner via clicks', async () => {
    const user = userEvent.setup();
    render(<TicTacToe onBack={() => {}} />);

    await user.click(screen.getByText(/Player vs Player/));
    expect(screen.getByText('Next player: X')).toBeInTheDocument();

    const cells = getCells();
    // X:0, O:3, X:1, O:4, X:2 -> X wins top row
    await user.click(cells[0]); // X
    await user.click(cells[3]); // O
    await user.click(cells[1]); // X
    await user.click(cells[4]); // O
    await user.click(cells[2]); // X wins

    expect(screen.getByText('Winner: X')).toBeInTheDocument();
  });

  it('ignores clicks on an already-filled cell', async () => {
    const user = userEvent.setup();
    render(<TicTacToe onBack={() => {}} />);
    await user.click(screen.getByText(/Player vs Player/));

    const cells = getCells();
    await user.click(cells[0]); // X -> now O's turn
    await user.click(cells[0]); // ignored, still O's turn
    expect(screen.getByText('Next player: O')).toBeInTheDocument();
  });
});
