
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

import Link from 'next/link';

const BlogCard = ({ blog }) => {
    const { theme } = useTheme();

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileHover={{ y: -5 }}
            className="rounded-xl overflow-hidden shadow-lg transition-all duration-300 flex flex-col h-full border border-opacity-50"
            style={{
                background: theme === 'dark'
                    ? 'linear-gradient(to bottom right, #1f2937, #111827)'
                    : 'linear-gradient(to bottom right, #ffffff, #f1f5f9)',
                borderColor: 'var(--border-secondary)',
            }}
        >
            {blog.image && (
                <div className="h-48 overflow-hidden relative">
                    <img
                        src={blog.image}
                        alt={blog.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                    />
                </div>
            )}

            <div className="p-6 flex flex-col flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider opacity-70" style={{ color: 'var(--text-tertiary)' }}>
                        {blog.date}
                    </span>
                </div>

                <h3
                    className="text-xl font-bold mb-3 line-clamp-2"
                    style={{ color: 'var(--text-primary)' }}
                >
                    {blog.title}
                </h3>

                <p
                    className="text-sm mb-4 line-clamp-3 flex-grow"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    {blog.content}
                </p>

                <Link href={`/blogs/${blog._id}`} passHref legacyBehavior>
                    <motion.a
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors mt-auto text-center block"
                        style={{
                            backgroundColor: theme === 'dark' ? 'rgba(34, 211, 238, 0.1)' : 'rgba(8, 145, 178, 0.1)',
                            color: theme === 'dark' ? '#22d3ee' : '#0891b2',
                            border: '1px solid',
                            borderColor: theme === 'dark' ? 'rgba(34, 211, 238, 0.2)' : 'rgba(8, 145, 178, 0.2)',
                        }}
                    >
                        Read Story
                    </motion.a>
                </Link>
            </div>
        </motion.div>
    );
};

export default BlogCard;
