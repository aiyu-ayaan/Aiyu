
"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { socials } from '../data/siteData';

export default function Footer() {
    return (
        <footer className="w-full px-4 sm:px-6 py-6 sm:py-4 border-t border-cyan-500/30 bg-gradient-to-b from-gray-900 to-gray-950">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between max-w-6xl mx-auto gap-4 sm:gap-0">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
                    <span className="text-cyan-400 text-base font-semibold text-center sm:text-left">
                        {"<"} find me in: {"/>"}
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
                                        className="text-gray-400 hover:text-cyan-400 transition-colors duration-300 p-2 hover:bg-gray-800 rounded-lg"
                                        whileHover={{ scale: 1.2, y: -5 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <social.icon className="w-6 h-6 sm:w-5 sm:h-5" />
                                    </motion.div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="text-gray-500 text-sm text-center sm:text-right">
                    <p>© 2025 Ayaan Ansari. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
