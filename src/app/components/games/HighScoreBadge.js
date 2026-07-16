"use client";

import { useHighScore } from './useHighScore';

/** Menu-card high score readout ("HI 000420"), hydrated from localStorage. */
export default function HighScoreBadge({ slug }) {
    const [highScore] = useHighScore(slug);
    return <span className="arc-hiscore">HI {String(highScore).padStart(6, '0')}</span>;
}
