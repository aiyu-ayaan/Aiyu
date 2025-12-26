"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { motion, useScroll, useTransform } from 'framer-motion';
// import { navLinks, contactLink } from '../data/headerData';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../context/ThemeContext';

export default function Header({ data, logoText }) {
    const { navLinks, contactLink } = data || { navLinks: [], contactLink: {} };
    // Filter out hidden links
    const visibleNavLinks = navLinks.filter(link => link.visible !== false);

    const displayLogo = logoText || "< aiyu />";
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();
    const { theme } = useTheme();
    const { scrollY } = useScroll();
    const headerOpacity = useTransform(scrollY, [0, 100], [1, 0.95]);
    const headerBlur = useTransform(scrollY, [0, 100], [0, 10]);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMenuOpen]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.documentElement.style.overflow = 'unset';
        };
    }, [isMenuOpen]);

    return (
        <>
            <motion.header
                className={clsx(
                    "sticky top-0 z-50 w-full transition-all duration-300",
                    scrolled ? "py-2" : "py-4"
                )}
                style={{
                    backgroundColor: scrolled
                        ? theme === 'dark' ? 'rgba(13, 17, 23, 0.6)' : 'rgba(255, 255, 255, 0.6)'
                        : 'transparent',
                    backdropFilter: scrolled ? 'blur(16px)' : 'none',
                    borderBottom: scrolled
                        ? `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
                        : '1px solid transparent',
                    boxShadow: scrolled ? '0 4px 30px rgba(0, 0, 0, 0.1)' : 'none',
                }}
            >
                <nav className="flex items-center justify-between w-full mx-auto px-4 sm:px-6">
                    {/* Logo/Brand - Left */}
                    <div className="flex-shrink-0">
                        <Link href="/">
                            <motion.div
                                className="text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent cursor-pointer flex items-center gap-2"
                                style={{
                                    backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-orange))',
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                {displayLogo}
                            </motion.div>
                        </Link>
                    </div>

                    {/* Mobile Menu Button - Styled */}
                    <motion.button
                        className="md:hidden relative z-[110] p-2 rounded-full transition-colors"
                        style={{
                            color: 'var(--text-primary)',
                            backgroundColor: isMenuOpen ? 'transparent' : 'rgba(125, 125, 125, 0.1)',
                            opacity: isMenuOpen ? 0 : 1,
                            pointerEvents: isMenuOpen ? 'none' : 'auto',
                        }}
                        onClick={toggleMenu}
                        whileTap={{ scale: 0.9 }}
                    >
                        <div className="w-6 h-5 flex flex-col justify-between items-center">
                            <motion.span
                                animate={isMenuOpen ? { rotate: 45, y: 9 } : { rotate: 0, y: 0 }}
                                className="w-full h-0.5 bg-current rounded-full origin-center transition-transform"
                            />
                            <motion.span
                                animate={isMenuOpen ? { opacity: 0 } : { opacity: 1 }}
                                className="w-full h-0.5 bg-current rounded-full transition-opacity"
                            />
                            <motion.span
                                animate={isMenuOpen ? { rotate: -45, y: -9 } : { rotate: 0, y: 0 }}
                                className="w-full h-0.5 bg-current rounded-full origin-center transition-transform"
                            />
                        </div>
                    </motion.button>

                    {/* Navigation Links - Desktop Center */}
                    <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
                        <div className="flex items-center gap-1 p-1 rounded-full border border-transparent transition-all duration-300"
                            style={{
                                backgroundColor: scrolled ? (theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)') : 'transparent',
                                borderColor: scrolled ? (theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)') : 'transparent',
                            }}
                        >
                            {visibleNavLinks.map((link) => {
                                const isActive = pathname === link.href;
                                return (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        target={link.target}
                                        className="relative px-4 py-2 rounded-full text-sm font-medium transition-all duration-300"
                                        style={{
                                            color: isActive
                                                ? (theme === 'dark' ? '#fff' : '#000')
                                                : 'var(--text-secondary)'
                                        }}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="navbar-pill"
                                                className="absolute inset-0 rounded-full z-[-1]"
                                                style={{
                                                    backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                                                }}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}
                                        <span className="relative z-10">{link.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Contact Link and Theme Toggle - Desktop Right */}
                    <div className="hidden md:flex items-center gap-4">
                        <ThemeToggle />
                        <Link href={contactLink.href}>
                            <motion.button
                                className="px-5 py-2 rounded-full font-semibold text-sm transition-all shadow-lg relative overflow-hidden group"
                                style={{
                                    background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))',
                                    color: '#ffffff',
                                }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <span className="relative z-10">{contactLink.name}</span>
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            </motion.button>
                        </Link>
                    </div>
                </nav>
            </motion.header>

            {/* Full Screen Mobile Menu - Moved OUTSIDE header */}
            <motion.div
                className="fixed inset-0 z-[100] md:hidden backdrop-blur-3xl flex flex-col pt-6 px-6 gap-6 overflow-y-auto"
                style={{
                    backgroundColor: theme === 'dark' ? 'rgba(13, 17, 23, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                    overscrollBehavior: 'contain',
                }}
                initial={{ y: "-100%" }}
                animate={{ y: isMenuOpen ? "0%" : "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
                {/* Close Button Row */}
                <div className="flex justify-end pb-2">
                    <motion.button
                        className="p-2 rounded-full transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                        onClick={() => setIsMenuOpen(false)}
                        whileTap={{ scale: 0.9 }}
                    >
                        <div className="w-6 h-5 flex flex-col justify-between items-center relative">
                            <span className="w-full h-0.5 bg-current rounded-full absolute top-1/2 -translate-y-1/2 rotate-45" />
                            <span className="w-full h-0.5 bg-current rounded-full absolute top-1/2 -translate-y-1/2 -rotate-45" />
                        </div>
                    </motion.button>
                </div>

                <div className="flex flex-col gap-4">
                    {visibleNavLinks.map((link, index) => (
                        <motion.div
                            key={link.name}
                            initial={{ x: -20, opacity: 0 }}
                            animate={isMenuOpen ? { x: 0, opacity: 1 } : { x: -20, opacity: 0 }}
                            transition={{ delay: 0.1 + index * 0.1 }}
                        >
                            <Link
                                href={link.href}
                                onClick={() => setIsMenuOpen(false)}
                                className="text-3xl font-bold tracking-tight block py-2"
                                style={{
                                    color: pathname === link.href ? 'var(--accent-cyan)' : 'var(--text-primary)'
                                }}
                            >
                                {link.name}
                            </Link>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    className="mt-auto mb-10 space-y-6"
                    initial={{ opacity: 0 }}
                    animate={isMenuOpen ? { opacity: 1 } : { opacity: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="h-px w-full bg-[var(--border-secondary)]" />
                    <div className="flex items-center justify-between">
                        <span className="text-lg font-medium text-[var(--text-secondary)]">Appearance</span>
                        <ThemeToggle />
                    </div>
                    <Link href={contactLink.href} onClick={() => setIsMenuOpen(false)}>
                        <button
                            className="w-full py-4 rounded-xl font-bold text-white text-lg shadow-lg"
                            style={{
                                background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))',
                            }}
                        >
                            {contactLink.name}
                        </button>
                    </Link>
                </motion.div>
            </motion.div>
        </>
    );
}
