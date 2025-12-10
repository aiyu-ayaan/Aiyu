"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BlogCard from './BlogCard';
import { useTheme } from '../../context/ThemeContext';

const BlogList = () => {
    const { theme } = useTheme();
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [config, setConfig] = useState(null);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const [blogsRes, configRes] = await Promise.all([
                    fetch('/api/blogs'),
                    fetch('/api/config')
                ]);

                const blogsData = await blogsRes.json();
                if (blogsData.success) {
                    setBlogs(blogsData.data);
                }

                if (configRes.ok) {
                    const configData = await configRes.json();
                    setConfig(configData);
                }
            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchBlogs();
    }, []);

    if (loading) {
        return <div className="text-center py-20 text-gray-500">Loading insights...</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="min-h-screen p-4 lg:p-8 transition-colors duration-300"
            style={{
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
            }}
        >
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="text-center mb-12"
                >
                    <h1
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 pb-2 bg-gradient-to-r bg-clip-text text-transparent"
                        style={{
                            backgroundImage: theme === 'dark'
                                ? 'linear-gradient(to right, #22d3ee, #3b82f6, #8b5cf6)'
                                : 'linear-gradient(to right, #0891b2, #2563eb, #7c3aed)'
                        }}
                    >
                        {config?.blogsTitle || 'Latest Insights'}
                    </h1>
                    <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                        {config?.blogsSubtitle || 'Thoughts, tutorials, and updates on web development and technology.'}
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence>
                        {blogs.map((blog) => (
                            <BlogCard key={blog._id} blog={blog} />
                        ))}
                    </AnimatePresence>
                    {blogs.length === 0 && (
                        <div className="col-span-full text-center text-gray-500">No blogs found.</div>
                    )}
                </div>
            </div>
        </motion.div>
    );
};

export default BlogList;
