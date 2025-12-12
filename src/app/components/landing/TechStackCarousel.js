"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import { getIcon } from '../../../lib/iconLibrary';

const TechStackCarousel = ({ data }) => {
    const { theme } = useTheme();
    // Duplicating the array to ensure seamless infinite scroll
    const skills = data?.skills || [];
    const duplicatedSkills = [...skills, ...skills];

    return (
        <div className="py-12 overflow-hidden relative"
            style={{
                background: theme === 'dark' ? 'transparent' : 'transparent',
                borderTop: '1px solid var(--border-secondary)',
                borderBottom: '1px solid var(--border-secondary)',
            }}>

            <div className="max-w-6xl mx-auto px-4 mb-8 text-center">
                <h2
                    className="text-2xl font-bold mb-2 flex items-center justify-center gap-2"
                    style={{ color: 'var(--accent-cyan)' }}
                >
                    <span style={{ color: 'var(--accent-orange)' }}>{"//"}</span>
                    Technologies I Work With
                </h2>
            </div>

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
                {duplicatedSkills.map((skill, index) => {
                    // Clean the name (remove " (Basic)", etc.)
                    const cleanName = skill.name.split('(')[0].trim();
                    const iconName = skill.icon || cleanName;

                    // 1. Try to get a React Component from our library using the cleaner name
                    const LibraryIcon = getIcon(iconName);

                    // 2. Determine if we should use CDN
                    // If the user deliberately set an icon string that isn't in our local map, OR if local lookup failed
                    // We check if it returns the fallback FaCode. 
                    const isFallback = LibraryIcon.name === 'FaCode';

                    // Generate a safe slug from the intended icon name (not necessarily the full skill name)
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
                                    background: theme === 'dark' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(0,0,0,0.05)', // Subtle cyan bg in dark mode
                                    color: '#22d3ee' // Force Cyan Color
                                }}
                            >
                                {(skill.icon && isFallback) || (isFallback && iconSlug) ? (
                                    <img
                                        src={`https://cdn.simpleicons.org/${iconSlug}/22d3ee`}
                                        alt={cleanName}
                                        className="w-8 h-8 object-contain"
                                        onError={(e) => {
                                            // Fallback to generic code icon if CDN fails
                                            e.target.style.display = 'none';
                                            e.target.parentNode.innerHTML = '<svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 640 512" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M278.9 511.5l-61-17.7c-6.4-1.8-10-8.5-8.2-14.9L346.2 8.7c1.8-6.4 8.5-10 14.9-8.2l61 17.7c6.4 1.8 10 8.5 8.2 14.9L293.8 503.3c-1.8 6.4-8.5 10-14.9 8.2zm-114-112.2l43.5-46.4c4.6-4.9 4.3-12.7-.8-17.2L117.3 256l90.3-79.7c5.1-4.5 5.5-12.3.8-17.2l-43.5-46.4c-4.5-4.8-12.1-5.1-17-.5L3.8 247.2c-5.1 4.7-5.1 12.8 0 17.5l144.1 135.1c4.9 4.6 12.5 4.3 17-.5zm327.2.6l144.1-135.1c5.1-4.7 5.1-12.8 0-17.5L492.1 112.1c-4.8-4.5-12.4-4.3-17 .5L431.6 159c-4.6 4.9-4.3 12.7.8 17.2L522.7 256l-90.3 79.7c-5.1 4.5-5.5 12.3-.8 17.2l43.5 46.4c4.5 4.9 12.1 5.1 17 .6z"></path></svg>';
                                        }}
                                    />
                                ) : (
                                    <LibraryIcon className="text-[#22d3ee]" />
                                )}
                            </div>
                            <span className="text-sm font-medium whitespace-nowrap">
                                {skill.name.split('(')[0].trim()}
                            </span>
                        </div>
                    );
                })}
            </motion.div>


            {/* Gradient Overlays for Fade Effect */}
            <div className="absolute top-0 left-0 h-full w-20 md:w-40 z-10 pointer-events-none"
                style={{
                    background: theme === 'dark'
                        ? 'linear-gradient(to right, var(--bg-primary), transparent)'
                        : 'linear-gradient(to right, var(--bg-primary), transparent)'
                }}
            />
            <div className="absolute top-0 right-0 h-full w-20 md:w-40 z-10 pointer-events-none"
                style={{
                    background: theme === 'dark'
                        ? 'linear-gradient(to left, var(--bg-primary), transparent)'
                        : 'linear-gradient(to left, var(--bg-primary), transparent)'
                }}
            />
        </div>
    );
};

export default TechStackCarousel;
