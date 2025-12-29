
"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaGithub, FaPalette } from 'react-icons/fa';
// import { socials } from '../data/siteData';
import { getIconByName } from '../../lib/icons';
import { useTheme } from '../context/ThemeContext';

export default function Footer({ socialData, name, config }) {
    const { theme, activeThemeData, mounted } = useTheme();
    const socials = socialData?.map(s => ({
        ...s,
        icon: getIconByName(s.iconName)
    })) || [];
    const currentYear = new Date().getFullYear();

    return (
        <footer
            className="w-full px-4 sm:px-6 border-t transition-all duration-300"
            style={{
                borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                backgroundColor: theme === 'dark' ? 'rgba(13, 17, 23, 0.6)' : 'rgba(255, 255, 255, 0.6)',
                backdropFilter: 'blur(16px)',
                paddingTop: '2rem', // py-8 equivalent
                paddingBottom: 'calc(2rem + var(--terminal-height, 4rem))', // base padding + terminal height
            }}
        >
            <div className="flex flex-col md:flex-row items-center justify-between max-w-7xl mx-auto gap-6 md:gap-0">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
                    <motion.div
                        className="flex items-center gap-2 px-4 py-2 rounded-full border border-transparent"
                        style={{
                            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                            borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        }}
                    >
                        <span className="text-sm font-semibold text-[var(--accent-orange)]">
                            {"<"}
                        </span>
                        <span
                            className="text-sm font-semibold bg-gradient-to-r bg-clip-text text-transparent"
                            style={{
                                backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-orange))',
                            }}
                        >
                            find me in:
                        </span>
                        <span className="text-sm font-semibold text-[var(--accent-cyan)]">
                            {"/>"}
                        </span>
                    </motion.div>

                    <div className="flex items-center gap-3">
                        {socials.filter(social => social.url && !social.isHidden && social.icon).map((social, index) => (
                            <div key={index}>
                                <Link
                                    href={social.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.name}
                                >
                                    <motion.div
                                        className="p-2.5 rounded-xl border transition-all duration-300 relative group overflow-hidden"
                                        style={{
                                            backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                            borderColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                                            color: 'var(--text-secondary)',
                                        }}
                                        whileHover={{
                                            scale: 1.05,
                                            y: -2,
                                            color: 'var(--accent-orange)',
                                            borderColor: 'var(--accent-orange)',
                                            boxShadow: '0 0 20px rgba(249, 115, 22, 0.2)'
                                        }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <div className="absolute inset-0 bg-[var(--accent-orange)] opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                                        <social.icon className="w-5 h-5 relative z-10" />
                                    </motion.div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6 text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    {config?.showWorkStatus && (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-[var(--status-success)] animate-pulse" />
                            <span>{config?.workStatus || 'Available for work'}</span>
                        </div>
                    )}
                    {config?.showWorkStatus && <p className="hidden md:block opacity-20">|</p>}
                    <p>{config?.footerText || `© ${currentYear} ${name || 'Ayaaan'}. All rights reserved.`}</p>
                    {config?.footerVersion && (
                        <>
                            <p className="hidden md:block opacity-20">|</p>
                            {config.footerVersionLink ? (
                                <Link
                                    href={config.footerVersionLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="opacity-50 hover:opacity-100 transition-opacity cursor-pointer hover:text-[var(--accent-orange)] flex items-center gap-2"
                                >
                                    <FaGithub className="w-4 h-4" />
                                    {config.footerVersion}
                                </Link>
                            ) : (
                                <p className="opacity-50 hover:opacity-100 transition-opacity cursor-default">{config.footerVersion}</p>
                            )}
                        </>
                    )}
                    {mounted && activeThemeData?.name && (
                        <>
                            <p className="hidden md:block opacity-20">|</p>
                            <div className="flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity cursor-default">
                                <FaPalette className="w-4 h-4" />
                                <span>{activeThemeData.name}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </footer>
    );
}
