"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import WorkInProgressComponent from './WorkInProgressComponent';
import clsx from 'clsx';

export default function Header() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const pathname = usePathname();

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <header className="relative w-full px-4 sm:px-6 py-4 border-b border-gray-600">
            <nav className="flex items-center justify-between max-w-full mx-auto">
                {/* Logo/Brand - Left */}
                <div className="flex-shrink-0">
                    <Link href="/" className="text-xl font-semibold text-white">
                        aiyu
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
                        <Link 
                            href="/" 
                            className={clsx(
                            "text-white hover:text-orange-400 transition-colors duration-200 pb-1",
                            {
                                "border-b-2 border-orange-400": pathname === '/',
                            }
                        )}
                        >
                            _hello
                        </Link>
                        <Link 
                                                        href="/about-me" 
                                                        className={clsx(
                                                        "text-white hover:text-orange-400 transition-colors duration-200 pb-1",
                                                        {
                                                            "border-b-2 border-orange-400": pathname === '/about-me',
                                                        }
                                                    )}                        >
                            _about-me
                        </Link>
                        <Link 
                            href="/projects" 
                            className={clsx(
                            "text-white hover:text-orange-400 transition-colors duration-200 pb-1",
                            {
                                "border-b-2 border-orange-400": pathname === '/projects',
                            }
                        )}
                        >
                            _projects
                        </Link>
                    </div>
                </div>

                {/* Contact Link - Desktop Right */}
                <div className="hidden md:block flex-shrink-0">
                    <Link 
                        href="http://bento.me/aiyu" 
                        className="text-white hover:text-orange-400 transition-colors duration-200"
                    >
                        contact-me
                    </Link>
                </div>
            </nav>

            {/* Animated Mobile Menu (bg removed) */}
            <div
                className={clsx(
                    "md:hidden overflow-hidden transition-all duration-300 border-t border-gray-600 z-50",
                    isMenuOpen ? "max-h-96 opacity-100 py-4" : "max-h-0 opacity-0 py-0"
                )}
            >
                <div className="px-4 space-y-4">
                    <Link 
                        href="/" 
                        className={clsx(
                        "block text-white hover:text-orange-400 transition-colors duration-200 pb-1",
                        {
                            "border-b-2 border-orange-400": pathname === '/',
                        }
                    )}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        _hello
                    </Link>
                    <Link 
                        href="/about-me" 
                        className={clsx(
                                                "block text-white hover:text-orange-400 transition-colors duration-200 pb-1",
                                                {
                                                    "border-b-2 border-orange-400": pathname === '/about-me',
                                                }
                                            )}                        onClick={() => setIsMenuOpen(false)}
                    >
                        _about-me
                    </Link>
                    <Link 
                        href="/projects" 
                        className={clsx(
                        "block text-white hover:text-orange-400 transition-colors duration-200 pb-1",
                        {
                            "border-b-2 border-orange-400": pathname === '/projects',
                        }
                    )}
                        onClick={() => setIsMenuOpen(false)}
                    >
                        _projects
                    </Link>
                    <Link 
                        href="http://bento.me/aiyu" 
                        className="block text-white hover:text-orange-400 transition-colors duration-200 pt-2 border-t border-gray-600"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        contact-me
                    </Link>
                </div>
            </div>
        </header>
    );
}
