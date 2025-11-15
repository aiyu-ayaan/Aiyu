"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { motion, useScroll, useTransform } from 'framer-motion';
import { navLinks as defaultNavLinks, contactLink as defaultContactLink } from '../data/headerData';

export default function Header({ headerData }) {
    // Use props data or fallback to local data
    const navLinks = headerData?.navLinks || defaultNavLinks;
    const contactLink = headerData?.contactLink || defaultContactLink;
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();
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
    }, []);

    return (
        <motion.header 
            className={clsx(
                "sticky top-0 z-50 w-full px-4 sm:px-6 py-4 border-b transition-all duration-300",
                scrolled 
                    ? "bg-gray-900/80 backdrop-blur-lg border-cyan-500/30 shadow-lg shadow-cyan-500/10" 
                    : "bg-gray-900/50 backdrop-blur-sm border-gray-600"
            )}
            style={{ 
                opacity: headerOpacity,
            }}
        >
            <nav className="flex items-center justify-between max-w-full mx-auto">
                {/* Logo/Brand - Left */}
                <div className="flex-shrink-0">
                    <Link href="/" className="text-xl font-semibold text-white">
                        <motion.div
                            className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-orange-500 bg-clip-text text-transparent"
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.3 }}
                        >
                            {"<"} aiyu {"/>"}
                        </motion.div>
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <motion.button
                    className="md:hidden text-white hover:text-cyan-400 transition-colors duration-200"
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                    whileHover={{ scale: 1.1 }}
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
                                        "relative text-white hover:text-cyan-400 transition-colors duration-300 pb-1 font-medium",
                                        {
                                            "text-cyan-400": pathname === link.href,
                                        }
                                    )}
                                >
                                    {link.name}
                                    {pathname === link.href && (
                                        <motion.div
                                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500"
                                            layoutId="navbar-indicator"
                                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                        />
                                    )}
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Contact Link - Desktop Right */}
                <div className="hidden md:block flex-shrink-0">
                    <Link href={contactLink.href}>
                        <motion.div
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg shadow-cyan-500/30"
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
                className="md:hidden overflow-hidden border-t border-gray-600 z-50"
                initial={false}
                animate={{
                    height: isMenuOpen ? "auto" : 0,
                    opacity: isMenuOpen ? 1 : 0,
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
            >
                <div className="px-4 py-4 space-y-4 bg-gray-900/95 backdrop-blur-lg">
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
                                    "block text-white hover:text-cyan-400 transition-colors duration-200 pb-2 font-medium text-lg",
                                    {
                                        "text-cyan-400 border-b-2 border-cyan-400": pathname === link.href,
                                    }
                                )}
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
                            className="block w-full text-center bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold py-3 rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 mt-4"
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {contactLink.name}
                        </Link>
                    </motion.div>
                </div>
            </motion.div>
        </motion.header>
    );
}
