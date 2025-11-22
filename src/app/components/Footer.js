
"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { socials } from '../data/siteData';
import { useTheme } from '../context/ThemeContext';

export default function Footer() {
    const { theme } = useTheme();
    
    return (
        <footer 
            className="w-full px-4 sm:px-6 py-6 sm:py-4 border-t transition-colors duration-300"
            style={{
                borderColor: 'var(--border-secondary)',
                background: 'var(--bg-primary)',
            }}
        >
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between max-w-6xl mx-auto gap-4 sm:gap-0">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
                    <span 
                        className="text-base font-semibold text-center sm:text-left"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        find me in:
                    </span>
                    
                    <div className="flex items-center gap-4 sm:gap-3">
                        {socials.filter(social => social.url).map((social, index) => (
                            <div key={index}>
                                <Link 
                                    href={social.url} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.name}
                                >
                                    <motion.div
                                        className="transition-opacity duration-200 p-2"
                                        style={{
                                            color: 'var(--text-tertiary)',
                                        }}
                                        whileHover={{ 
                                            opacity: 0.6,
                                        }}
                                    >
                                        <social.icon className="w-6 h-6 sm:w-5 sm:h-5" />
                                    </motion.div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="text-sm text-center sm:text-right" style={{ color: 'var(--text-muted)' }}>
                    <p>© 2025 Ayaan Ansari. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
