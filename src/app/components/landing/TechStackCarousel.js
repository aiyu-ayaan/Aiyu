"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getIcon } from '../../../lib/iconLibrary';

const TechStackCarousel = ({ data }) => {
    const { theme } = useTheme();
    const skills = data?.skills || [];
    const [accentColor, setAccentColor] = useState('#22d3ee');

    // Get the accent color from CSS custom properties
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const color = getComputedStyle(document.documentElement)
                .getPropertyValue('--accent-cyan')
                .trim();
            if (color) {
                // Convert to hex for CDN URLs
                setAccentColor(color.startsWith('#') ? color.slice(1) : color);
            }
        }
    }, [theme]);

    // If we have 6 or fewer items, don't duplicate (use static grid)
    // Otherwise duplicate for infinite scroll
    const shouldAnimate = skills.length > 6;
    const displayedSkills = shouldAnimate ? [...skills, ...skills] : skills;

    const renderSkillIcon = (skill, index) => {
        const cleanName = skill.name.split('(')[0].trim();
        const iconName = skill.icon || cleanName;
        const LibraryIcon = getIcon(iconName);
        const isFallback = LibraryIcon.name === 'FaCode';
        const iconSlug = iconName.toLowerCase().replace(/[^a-z0-9]/g, '');

        return (
            <div
                key={`${skill.name}-${index}`}
                className="flex flex-col items-center gap-3 min-w-[100px] justify-center"
                style={{ color: 'var(--text-secondary)' }}
            >
                <div
                    className="p-4 rounded-xl text-4xl transition-all duration-300 flex items-center justify-center w-16 h-16"
                    style={{
                        background: 'var(--bg-hover)',
                        color: 'var(--accent-cyan)'
                    }}
                >
                    {(skill.icon && isFallback) || (isFallback && iconSlug) ? (
                        <img
                            src={`https://cdn.simpleicons.org/${iconSlug}/${accentColor}`}
                            alt={cleanName}
                            className="w-8 h-8 object-contain"
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 640 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M278.9 511.5l-61-17.7c-6.4-1.8-10-8.5-8.2-14.9L346.2 8.7c1.8-6.4 8.5-10 14.9-8.2l61 17.7c6.4 1.8 10 8.5 8.2 14.9L293.8 503.3c-1.8 6.4-8.5 10-14.9 8.2zm-114-112.2l43.5-46.4c4.6-4.9 4.3-12.7-.8-17.2L117.3 256l90.3-79.7c5.1-4.5 5.5-12.3.8-17.2l-43.5-46.4c-4.5-4.8-12.1-5.1-17-.5L3.8 247.2c-5.1 4.7-5.1 12.8 0 17.5l144.1 135.1c4.9 4.6 12.5 4.3 17-.5zm327.2.6l144.1-135.1c5.1-4.7 5.1-12.8 0-17.5L492.1 112.1c-4.8-4.5-12.4-4.3-17 .5L431.6 159c-4.6 4.9-4.3 12.7.8 17.2L522.7 256l-90.3 79.7c-5.1 4.5-5.5 12.3-.8 17.2l43.5 46.4c4.5 4.9 12.1 5.1 17 .6z"></path></svg>';
                            }}
                        />
                    ) : (
                        <LibraryIcon style={{ color: 'var(--accent-cyan)' }} />
                    )}
                </div>
                <span className="text-sm font-medium whitespace-nowrap">
                    {cleanName}
                </span>
            </div>
        );
    };

    return (
        <div className="py-12 overflow-hidden relative"
            style={{
                background: 'transparent',
                borderTop: '1px solid var(--border-secondary)',
                borderBottom: '1px solid var(--border-secondary)',
            }}>

            <div className="max-w-6xl mx-auto px-4 mb-8 text-center">
                <h2
                    className="text-xl sm:text-2xl font-bold mb-2 flex items-center justify-center gap-2"
                    style={{ color: 'var(--accent-cyan)' }}
                >
                    <span style={{ color: 'var(--accent-orange)' }}>{"//"}</span>
                    Technologies I Work With
                </h2>
            </div>

            {shouldAnimate ? (
                <motion.div
                    className="flex gap-12 items-center"
                    animate={{
                        x: ["0%", "-50%"]
                    }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: "loop",
                            duration: 30,
                            ease: "linear",
                        },
                    }}
                    style={{ width: "fit-content" }}
                >
                    {displayedSkills.map((skill, index) => renderSkillIcon(skill, index))}
                </motion.div>
            ) : (
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex flex-wrap gap-8 items-center justify-center">
                        {displayedSkills.map((skill, index) => renderSkillIcon(skill, index))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechStackCarousel;
