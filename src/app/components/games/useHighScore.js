"use client";

import { useCallback, useEffect, useState } from 'react';
import { highScoreKey } from './registry';

/**
 * localStorage-backed high score for one arcade game. Reads after mount so
 * SSR markup stays deterministic; write failures (private mode) are ignored —
 * worst case the score just isn't remembered.
 */
export function useHighScore(slug) {
    const [highScore, setHighScore] = useState(0);

    useEffect(() => {
        try {
            const stored = Number(window.localStorage.getItem(highScoreKey(slug)));
            if (Number.isFinite(stored) && stored > 0) {
                setHighScore(stored);
            }
        } catch {
            // localStorage unavailable — session-only high score.
        }
    }, [slug]);

    const submitScore = useCallback(
        (score) => {
            setHighScore((current) => {
                if (score <= current) return current;
                try {
                    window.localStorage.setItem(highScoreKey(slug), String(score));
                } catch {
                    // Ignore storage failures.
                }
                return score;
            });
        },
        [slug]
    );

    return [highScore, submitScore];
}
