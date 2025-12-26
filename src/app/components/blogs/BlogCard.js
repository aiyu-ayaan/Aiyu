
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

import Link from 'next/link';

const stripMarkdown = (markdown) => {
    if (!markdown) return '';
    return markdown
        .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '') // Remove images
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Replace links with text
        .replace(/#{1,6} /g, '') // Remove headers
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // Remove bold
        .replace(/(\*|_)(.*?)\1/g, '$2') // Remove italic
        .replace(/`{3,}[\s\S]*?`{3,}/g, '') // Remove code blocks
        .replace(/`(.+?)`/g, '$1') // Remove inline code
        .replace(/^\s*>\s+/gm, '') // Remove blockquotes
        .replace(/^\s*[\*\-\+]\s+/gm, '') // Remove list items
        .replace(/^\s*\d+\.\s+/gm, '') // Remove ordered list items
        .replace(/\n{2,}/g, '\n') // Consolidate newlines
        .trim();
};

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
                background: 'linear-gradient(to bottom right, var(--bg-surface), var(--bg-secondary))',
                borderColor: 'var(--border-secondary)',
            }}
        >
            {blog.image && blog.image.trim() !== '' && (
                <div className="h-48 overflow-hidden relative">
                    <img
                        src={blog.image}
                        alt={blog.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.style.display = 'none';
                        }}
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
                    {stripMarkdown(blog.content)}
                </p>

                <Link href={`/blogs/${blog._id}`} passHref legacyBehavior>
                    <motion.a
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full py-2 px-4 rounded-lg font-medium text-sm transition-colors mt-auto text-center block"
                        style={{
                            backgroundColor: 'var(--bg-hover)',
                            color: 'var(--accent-cyan)',
                            border: '1px solid',
                            borderColor: 'var(--border-cyan)',
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
