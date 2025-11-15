
"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { socials } from '../data/siteData';

export default function Footer() {
    return (
        <motion.footer 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full px-4 sm:px-6 py-6 sm:py-4 border-t border-gray-600/50 backdrop-blur-sm bg-gray-900/80"
        >
            <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between max-w-full mx-auto gap-3 sm:gap-0">
                <motion.div 
                    initial={{ x: -20, opacity: 0 }}
                    whileInView={{ x: 0, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4"
                >
                    <span className="text-gray-300 text-sm text-center sm:text-left font-medium">
                        find me in:
                    </span>
                    
                    <div className="flex items-center gap-3 sm:gap-2">
                        {socials.filter(social => social.url).map((social, index) => (
                            <motion.div
                                key={index}
                                initial={{ y: 20, opacity: 0 }}
                                whileInView={{ y: 0, opacity: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                                whileHover={{ scale: 1.2, rotate: 5 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <Link 
                                    href={social.url} 
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-orange-400 transition-colors duration-200 p-2 sm:p-1 hover:bg-gray-800/50 rounded-md"
                                    aria-label={social.name}
                                >
                                    <social.icon className="w-6 h-6 sm:w-5 sm:h-5" />
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.footer>
    );
}
