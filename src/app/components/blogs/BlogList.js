"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BlogCard from './BlogCard';
import { useTheme } from '../../context/ThemeContext';

const BlogList = () => {
    const { theme } = useTheme();
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlogs = async () => {
            try {
                const res = await fetch('/api/blogs');
                const data = await res.json();
                if (data.success) {
                    setBlogs(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch blogs:', error);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-8"
            >
                <h1
                    className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r"
                    style={{
                        backgroundImage: theme === 'dark'
                            ? 'linear-gradient(to right, #22d3ee, #3b82f6)'
                            : 'linear-gradient(to right, #0891b2, #2563eb)'
                    }}
                >
                    Latest Insights
                </h1>
                <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                    Thoughts, tutorials, and updates on web development and technology.
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
    );
};

export default BlogList;
