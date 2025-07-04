"use client";

import Link from 'next/link';

export default function Header() {
    return (
        <header className="w-full px-6 py-4 border-b border-gray-600">
            <nav className="flex items-center justify-between max-w-full mx-auto">
                {/* Logo/Brand - Left */}
                <div className="flex-shrink-0">
                    <Link href="/" className="text-xl font-semibold text-white">
                        aiyu
                    </Link>
                </div>

                {/* Navigation Links - Center */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                    <div className="flex space-x-8">
                        <Link 
                            href="/hello" 
                            className="text-white hover:text-orange-400 transition-colors duration-200 border-b-2 border-orange-400 pb-1"
                        >
                            _hello
                        </Link>
                        <Link 
                            href="/about-me" 
                            className="text-white hover:text-orange-400 transition-colors duration-200"
                        >
                            _about-me
                        </Link>
                        <Link 
                            href="/projects" 
                            className="text-white hover:text-orange-400 transition-colors duration-200"
                        >
                            _projects
                        </Link>
                    </div>
                </div>

                {/* Contact Link - Right */}
                <div className="flex-shrink-0">
                    <Link 
                        href="/contact-me" 
                        className="text-white hover:text-orange-400 transition-colors duration-200"
                    >
                        contact-me
                    </Link>
                </div>
            </nav>
        </header>
    );
}