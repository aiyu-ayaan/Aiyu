"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FaCalendarAlt, FaArrowRight } from 'react-icons/fa';
import { useTheme } from '../../context/ThemeContext';

const HomeBlogs = ({ blogs }) => {
    const { theme } = useTheme();

    // Sort by date (newest first) just in case, though backend should handle it
    const sortedBlogs = blogs?.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) || [];
    const recentBlogs = sortedBlogs.slice(0, 3);

    if (recentBlogs.length === 0) return null;

    return (
        <section className="py-20 px-4 sm:px-6">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <h2
                        className="text-3xl sm:text-4xl font-bold mb-4 flex items-center justify-center gap-3"
                        style={{ color: 'var(--accent-cyan)' }}
                    >
                        <span style={{ color: 'var(--accent-orange)' }}>{"<"}</span>
                        Recent Writings
                        <span style={{ color: 'var(--accent-orange)' }}>{"/>"}</span>
                    </h2>
                    <p style={{ color: 'var(--text-secondary)' }} className="max-w-2xl mx-auto">
                        Thoughts, tutorials, and insights on development and technology.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {recentBlogs.map((blog, index) => (
                        <motion.div
                            key={blog._id}
                            initial={{ y: 30, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="group flex flex-col h-full rounded-2xl overflow-hidden border transition-all duration-300 shadow-lg hover:shadow-2xl"
                            style={{
                                background: 'linear-gradient(to bottom right, rgba(30, 20, 51, 0.6), rgba(10, 25, 41, 0.6))',
                                backdropFilter: 'blur(10px)',
                                borderColor: 'var(--border-secondary)',
                            }}
                        >
                            {/* Card Content */}
                            <div className="p-6 flex flex-col flex-grow">
                                <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                                    <FaCalendarAlt className="w-4 h-4" />
                                    <span>
                                        {new Date(blog.date || blog.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        })}
                                    </span>
                                </div>

                                <Link href={`/blogs/${blog._id}`} className="block group-hover:underline decoration-2 underline-offset-4 decoration-blue-500">
                                    <h3
                                        className="text-xl font-bold mb-3 line-clamp-2 transition-colors"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        {blog.title}
                                    </h3>
                                </Link>

                                <div
                                    className="mb-6 line-clamp-3 text-sm flex-grow"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    {/* Simple way to strip markdown or just show content raw if not markdown heavy */}
                                    {blog.content?.replace(/[#*`_\[\]]/g, '').substring(0, 150)}...
                                </div>

                                <div className="mt-auto pt-4 border-t" style={{ borderColor: 'var(--border-secondary)' }}>
                                    <Link
                                        href={`/blogs/${blog._id}`}
                                        className="inline-flex items-center gap-2 font-medium transition-colors"
                                        style={{ color: 'var(--accent-cyan)' }}
                                    >
                                        Read Article <FaArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <Link href="/blogs">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-8 py-3 rounded-full font-semibold transition-all shadow-lg"
                            style={{
                                background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))',
                                color: '#ffffff',
                            }}
                        >
                            View All Posts
                        </motion.button>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default HomeBlogs;
