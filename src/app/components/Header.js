"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { navLinks, contactLink } from '../data/headerData';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const pathname = usePathname();

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <motion.header 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative w-full px-4 sm:px-6 py-4 border-b border-gray-600 backdrop-blur-sm bg-gray-900/80"
        >
            <nav className="flex items-center justify-between max-w-full mx-auto">
                {/* Logo/Brand - Left */}
                <div className="flex-shrink-0">
                    <Link href="/" className="text-xl font-semibold text-white">
                        <motion.div
                            whileHover={{ scale: 1.1, color: '#F97316' }}
                            transition={{ duration: 0.3 }}
                        >
                            aiyu
                        </motion.div>
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <motion.button
                    whileTap={{ scale: 0.9 }}
                    className="md:hidden text-white hover:text-orange-400 transition-colors duration-200"
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
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
                                transition={{ duration: 0.5, delay: 0.1 * index }}
                            >
                                <Link
                                    href={link.href}
                                    target={link.target}
                                    rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                                    className={clsx(
                                        "text-white hover:text-orange-400 transition-colors duration-200 pb-1",
                                        {
                                            "border-b-2 border-orange-400": pathname === link.href,
                                        }
                                    )}
                                >
                                    {link.name}
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Contact Link - Desktop Right */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="hidden md:block flex-shrink-0"
                >
                    <Link
                        href={contactLink.href}
                        className="text-white hover:text-orange-400 transition-colors duration-200"
                    >
                        {contactLink.name}
                    </Link>
                </motion.div>
            </nav>

            {/* Animated Mobile Menu (bg removed) */}
            <div
                className={clsx(
                    "md:hidden overflow-hidden transition-all duration-300 border-t border-gray-600 z-50",
                    isMenuOpen ? "max-h-96 opacity-100 py-4" : "max-h-0 opacity-0 py-0"
                )}
            >
                <div className="px-4 space-y-4">
                    {navLinks.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            target={link.target}
                            rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                            className={clsx(
                                "block text-white hover:text-orange-400 transition-colors duration-200 pb-1",
                                {
                                    "border-b-2 border-orange-400": pathname === link.href,
                                }
                            )}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <Link
                        href={contactLink.href}
                        className="block text-white hover:text-orange-400 transition-colors duration-200 pt-2 border-t border-gray-600"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        {contactLink.name}
                    </Link>
                </div>
            </div>
        </header>
    );
}
