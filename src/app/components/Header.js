"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useHeaderData } from '../../hooks/usePortfolioData';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();
    const { theme } = useTheme();
    const { scrollY } = useScroll();
    const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.95]);
    const headerBlur = useTransform(scrollY, [0, 100], [0, 10]);
    const { data: headerData, loading } = useHeaderData();

    const navLinks = headerData?.navLinks || [];
    const contactLink = headerData?.contactLink || { name: 'contact-me', href: '#' };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <motion.header 
            className={clsx(
                "sticky top-0 z-50 w-full px-4 sm:px-6 py-4 border-b transition-all duration-300",
                scrolled 
                    ? "backdrop-blur-lg shadow-lg"
                    : "backdrop-blur-sm"
            )}
            style={{ 
                opacity: headerOpacity,
                backgroundColor: scrolled 
                    ? theme === 'dark' 
                        ? 'rgba(13, 17, 23, 0.95)' // --bg-primary with opacity
                        : 'rgba(255, 255, 255, 0.95)' // --bg-primary with opacity
                    : theme === 'dark'
                        ? 'rgba(13, 17, 23, 0.7)' // --bg-primary with lower opacity
                        : 'rgba(255, 255, 255, 0.7)', // --bg-primary with lower opacity
                borderColor: scrolled 
                    ? 'var(--border-cyan)' 
                    : 'var(--border-secondary)',
                boxShadow: scrolled && theme === 'dark'
                    ? '0 10px 30px rgba(34, 211, 238, 0.1)'
                    : scrolled 
                        ? '0 10px 30px rgba(8, 145, 178, 0.1)'
                        : 'none',
            }}
        >
            <nav className="flex items-center justify-between max-w-full mx-auto">
                {/* Logo/Brand - Left */}
                <div className="flex-shrink-0">
                    <Link href="/">
                        <motion.div
                            className="text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent"
                            style={{
                                backgroundImage: theme === 'dark'
                                    ? 'linear-gradient(to right, #22d3ee, #f97316)'
                                    : 'linear-gradient(to right, #0891b2, #ea580c)',
                            }}
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.3 }}
                        >
                            {"<"} aiyu {"/>"}
                        </motion.div>
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <motion.button
                    className="md:hidden transition-colors duration-200"
                    style={{ color: 'var(--text-bright)' }}
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                    whileHover={{ scale: 1.1, color: 'var(--accent-cyan)' }}
                    whileTap={{ scale: 0.9 }}
                >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                    </svg>
                </motion.button>

                {/* Navigation Links - Desktop Center */}
                <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
                    <div className="flex space-x-8">
                        {navLinks.map((link, index) => (
                            <motion.div
                                key={link.name}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link
                                    href={link.href}
                                    target={link.target}
                                    rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                                    className={clsx(
                                        "relative transition-colors duration-300 pb-1 font-medium",
                                        {
                                            "": pathname === link.href,
                                        }
                                    )}
                                    style={{
                                        color: pathname === link.href 
                                            ? 'var(--accent-cyan)' 
                                            : 'var(--text-bright)',
                                    }}
                                >
                                    {link.name}
                                    {pathname === link.href && (
                                        <motion.div
                                            className="absolute bottom-0 left-0 right-0 h-0.5"
                                            style={{
                                                background: theme === 'dark'
                                                    ? 'linear-gradient(to right, #22d3ee, #3b82f6)'
                                                    : 'linear-gradient(to right, #0891b2, #2563eb)',
                                            }}
                                            layoutId="navbar-indicator"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Contact Link and Theme Toggle - Desktop Right */}
                <div className="hidden md:flex items-center gap-3 flex-shrink-0">
                    <ThemeToggle />
                    <Link href={contactLink.href}>
                        <motion.div
                            className="px-4 py-2 rounded-lg font-semibold transition-all duration-300 shadow-lg"
                            style={{
                                background: theme === 'dark'
                                    ? 'linear-gradient(to right, #22d3ee, #3b82f6)'
                                    : 'linear-gradient(to right, #0891b2, #2563eb)',
                                color: '#ffffff',
                                boxShadow: theme === 'dark'
                                    ? '0 10px 30px rgba(34, 211, 238, 0.3)'
                                    : '0 10px 30px rgba(8, 145, 178, 0.3)',
                            }}
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            {contactLink.name}
                        </motion.div>
                    </Link>
                </div>
            </nav>

            {/* Animated Mobile Menu */}
            <motion.div
                className="md:hidden overflow-hidden border-t z-50"
                style={{ borderColor: 'var(--border-secondary)' }}
                initial={false}
                animate={{
                    height: isMenuOpen ? "auto" : 0,
                    opacity: isMenuOpen ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                <div 
                    className="px-4 py-4 space-y-4 backdrop-blur-lg"
                    style={{
                        backgroundColor: theme === 'dark'
                            ? 'rgba(13, 17, 23, 0.98)' // --bg-primary with high opacity for mobile
                            : 'rgba(255, 255, 255, 0.98)', // --bg-primary with high opacity for mobile
                    }}
                >
                    {navLinks.map((link, index) => (
                        <motion.div
                            key={link.name}
                            initial={{ x: -20, opacity: 0 }}
                            animate={isMenuOpen ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Link
                                href={link.href}
                                target={link.target}
                                rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                                className={clsx(
                                    "block transition-colors duration-200 pb-2 font-medium text-lg",
                                    {
                                        "border-b-2": pathname === link.href,
                                    }
                                )}
                                style={{
                                    color: pathname === link.href 
                                        ? 'var(--accent-cyan)' 
                                        : 'var(--text-bright)',
                                    borderColor: pathname === link.href ? 'var(--accent-cyan)' : 'transparent',
                                }}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        </motion.div>
                    ))}
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={isMenuOpen ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                        transition={{ delay: navLinks.length * 0.1 }}
                    >
                        <Link
                            href={contactLink.href}
                            className="block w-full text-center text-white font-semibold py-3 rounded-lg transition-all duration-300 mt-4"
                            style={{
                                background: theme === 'dark'
                                    ? 'linear-gradient(to right, #22d3ee, #3b82f6)'
                                    : 'linear-gradient(to right, #0891b2, #2563eb)',
                            }}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {contactLink.name}
                        </Link>
                    </motion.div>
                    <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={isMenuOpen ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                        transition={{ delay: (navLinks.length + 1) * 0.1 }}
                        className="flex items-center justify-center pt-4 border-t"
                        style={{ borderColor: 'var(--border-secondary)' }}
                    >
                        <ThemeToggle />
                    </motion.div>
                </div>
            </motion.div>
        </motion.header>
    );
}
