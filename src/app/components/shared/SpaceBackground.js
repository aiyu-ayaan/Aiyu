"use client";
import React from 'react';

/**
 * CleanThemeBackground - A performant, theme-fill background
 * Replaces the laggy SpaceBackground with subtle, CSS-only gradients
 * that match the accent colors without any animation overhead.
 */
const CleanThemeBackground = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Base background - matches theme primary */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundColor: 'var(--bg-primary)',
                }}
            />

            {/* Subtle radial gradients for depth - no animations */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: `
                        radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--accent-cyan) 8%, transparent), transparent 40%),
                        radial-gradient(circle at 85% 15%, color-mix(in srgb, var(--accent-purple) 7%, transparent), transparent 40%),
                        radial-gradient(circle at 50% 90%, color-mix(in srgb, var(--accent-pink) 5%, transparent), transparent 40%),
                        radial-gradient(circle at 80% 80%, color-mix(in srgb, var(--accent-orange) 6%, transparent), transparent 45%)
                    `,
                    opacity: 0.6,
                }}
            />

            {/* Very subtle grid pattern for tech feel - optional */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        linear-gradient(color-mix(in srgb, var(--border-secondary) 20%, transparent) 1px, transparent 1px),
                        linear-gradient(90deg, color-mix(in srgb, var(--border-secondary) 20%, transparent) 1px, transparent 1px)
                    `,
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Bottom fade for depth */}
            <div
                className="absolute inset-0"
                style={{
                    backgroundImage: 'linear-gradient(to top, var(--bg-primary) 0%, transparent 60%)',
                }}
            />
        </div>
    );
};

export default CleanThemeBackground;
export { CleanThemeBackground };

