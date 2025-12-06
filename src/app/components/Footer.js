
"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useSiteData } from '../../hooks/usePortfolioData';
import { FaGithub, FaLinkedin, FaInstagram, FaEnvelope, FaLink } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const iconMap = {
  'GitHub': FaGithub,
  'LinkedIn': FaLinkedin,
  'Instagram': FaInstagram,
  'Email': FaEnvelope,
  'Twitter': FaLink, // Generic link icon for unknown social media
};

export default function Footer() {
    const { theme } = useTheme();
    const { data: siteData, loading } = useSiteData();

    const socials = siteData?.socials || [];
    
    return (
        <footer 
            className="w-full px-4 sm:px-6 py-6 sm:py-4 border-t transition-colors duration-300"
            style={{
                borderColor: theme === 'dark' ? 'rgba(34, 211, 238, 0.3)' : 'rgba(8, 145, 178, 0.3)',
                background: theme === 'dark'
                    ? 'linear-gradient(to bottom, #111827, #0f1419)'
                    : 'linear-gradient(to bottom, #f8fafc, #f1f5f9)',
            }}
        >
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between max-w-6xl mx-auto gap-4 sm:gap-0">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
                    <span 
                        className="text-base font-semibold text-center sm:text-left"
                        style={{ color: 'var(--accent-cyan)' }}
                    >
                        {"<"} find me in: {"/>"}
                    </span>
                    
                    <div className="flex items-center gap-4 sm:gap-3">
                        {socials.filter(social => social.url).map((social, index) => {
                            const IconComponent = iconMap[social.icon] || iconMap[social.name] || FaLink;
                            return (
                            <div key={index}>
                                <Link 
                                    href={social.url} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={social.name}
                                >
                                    <motion.div
                                        className="transition-colors duration-300 p-2 rounded-lg"
                                        style={{
                                            color: 'var(--text-tertiary)',
                                        }}
                                        whileHover={{ 
                                            scale: 1.2, 
                                            y: -5,
                                            color: 'var(--accent-cyan)',
                                            backgroundColor: theme === 'dark' ? '#1f2937' : '#e2e8f0',
                                        }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <IconComponent className="w-6 h-6 sm:w-5 sm:h-5" />
                                    </motion.div>
                                </Link>
                            </div>
                        )})}
                    </div>
                </div>
                
                <div className="text-sm text-center sm:text-right" style={{ color: 'var(--text-muted)' }}>
                    <p>© 2025 Ayaan Ansari. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
