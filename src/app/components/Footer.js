
"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { socials } from '../data/siteData';

export default function Footer() {
    return (
        <footer className="w-full px-4 sm:px-6 py-6 sm:py-4 border-t border-cyan-500/30 bg-gradient-to-b from-gray-900 to-gray-950">
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between max-w-6xl mx-auto gap-4 sm:gap-0">
                <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
                    <motion.span 
                        className="text-cyan-400 text-base font-semibold text-center sm:text-left"
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5 }}
                    >
                        {"<"} find me in: {"/>"}
                    </motion.span>
                    
                    <div className="flex items-center gap-4 sm:gap-3">
                        {socials.filter(social => social.url).map((social, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1, duration: 0.5 }}
                            >
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
                            </motion.div>
                        ))}
                    </div>
                </div>
                
                <motion.div
                    className="text-gray-500 text-sm text-center sm:text-right"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                >
                    <p>© 2025 Ayaan Ansari. All rights reserved.</p>
                </motion.div>
            </div>
        </footer>
    );
}
