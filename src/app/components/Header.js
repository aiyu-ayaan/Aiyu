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
            className="relative w-full px-4 sm:px-6 py-4 border-b border-gray-600/50 backdrop-blur-sm bg-gray-900/80 sticky top-0 z-40"
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
                <button
                    className="md:hidden text-white hover:text-orange-400 transition-colors duration-200"
                    onClick={toggleMenu}
                    aria-label="Toggle menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                    </svg>
                </button>

                {/* Navigation Links - Desktop Center */}
                <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
                    <div className="flex space-x-8">
                        {navLinks.map((link) => (
                            <motion.div
                                key={link.name}
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Link
                                    href={link.href}
                                    target={link.target}
                                    rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                                    className={clsx(
                                        "text-white hover:text-orange-400 transition-colors duration-200 pb-1 font-medium",
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
                <div className="hidden md:block flex-shrink-0">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Link
                            href={contactLink.href}
                            className="text-white hover:text-orange-400 transition-colors duration-200 px-4 py-2 border border-orange-400 rounded-lg hover:bg-orange-400 hover:text-gray-900 font-medium"
                        >
                            {contactLink.name}
                        </Link>
                    </motion.div>
                </div>
            </nav>

            {/* Animated Mobile Menu */}
            <motion.div
                initial={false}
                animate={{
                    height: isMenuOpen ? "auto" : 0,
                    opacity: isMenuOpen ? 1 : 0
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="md:hidden overflow-hidden border-t border-gray-600/50 backdrop-blur-sm bg-gray-900/80"
            >
                {isMenuOpen && (
                    <div className="px-4 py-4 space-y-4">
                        {navLinks.map((link, index) => (
                            <motion.div
                                key={link.name}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Link
                                    href={link.href}
                                    target={link.target}
                                    rel={link.target === '_blank' ? 'noopener noreferrer' : undefined}
                                    className={clsx(
                                        "block text-white hover:text-orange-400 transition-colors duration-200 pb-1 font-medium",
                                        {
                                            "border-b-2 border-orange-400": pathname === link.href,
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
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: navLinks.length * 0.1 }}
                        >
                            <Link
                                href={contactLink.href}
                                className="block text-white hover:text-orange-400 transition-colors duration-200 pt-2 border-t border-gray-600/50 font-medium"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {contactLink.name}
                            </Link>
                        </motion.div>
                    </div>
                )}
            </motion.div>
        </motion.header>
    );
}
