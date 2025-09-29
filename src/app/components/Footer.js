
"use client";

import Link from 'next/link';
import { socials } from '../data/siteData';

export default function Footer() {
    return (
        <footer className="w-full px-4 sm:px-6 py-4 sm:py-3 border-t border-gray-600 bg-gray-900">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between max-w-full mx-auto gap-3 sm:gap-0">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                    <span className="text-gray-300 text-sm text-center sm:text-left">
                        find me in:
                    </span>
                    
                    <div className="flex items-center gap-3 sm:gap-2">
                        {socials.filter(social => social.url).map((social, index) => (
                            <Link 
                                key={index}
                                href={social.url} 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-white transition-colors duration-200 p-2 sm:p-1 hover:bg-gray-800 sm:hover:bg-transparent rounded-md sm:rounded-none"
                                aria-label={social.name}
                            >
                                <social.icon className="w-6 h-6 sm:w-5 sm:h-5" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
