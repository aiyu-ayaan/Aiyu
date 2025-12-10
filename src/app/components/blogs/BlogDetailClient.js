"use client";
import React, { useState, useEffect } from 'react';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import LinkPreview from './LinkPreview';
import Divider from '../landing/Divider';
import dynamic from 'next/dynamic';

const SyntaxHighlighter = dynamic(() => import('react-syntax-highlighter').then(mod => mod.Prism), { ssr: false });
import { FaShareAlt } from "react-icons/fa";
import { IoCheckmark } from "react-icons/io5";
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function BlogDetailClient({ blog }) {
    const { theme } = useTheme();

    const [selectedImage, setSelectedImage] = useState(null);
    const [extractedLinks, setExtractedLinks] = useState([]);
    const [showShareToast, setShowShareToast] = useState(false);

    useEffect(() => {
        if (blog?.content) {
            const urls = new Set();
            // Regex to find markdown links [text](url)
            const mdLinkRegex = /\[.*?\]\((https?:\/\/[^\)]+)\)/g;
            let match;
            while ((match = mdLinkRegex.exec(blog.content)) !== null) {
                urls.add(match[1]);
            }

            // Regex for raw links (simple version, might overlap with above but Set handles dupes)
            // We can just rely on the above extracting all markdown links. 
            // If we want raw urls not in markdown links, it gets complex. 
            // Assuming most links are markdown links or just raw text that user wants previewed.
            const rawLinkRegex = /(?<!\()(https?:\/\/[^\s\)>"]+)/g;
            while ((match = rawLinkRegex.exec(blog.content)) !== null) {
                urls.add(match[1]);
            }

            setExtractedLinks(Array.from(urls));
        }
    }, [blog]);

    const handleShare = async () => {
        const url = new URL(window.location.href);
        url.searchParams.set('utm_source', 'portfolio_share');
        url.searchParams.set('utm_medium', 'social');
        url.searchParams.set('utm_campaign', 'blog_share');

        try {
            await navigator.clipboard.writeText(url.toString());
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 3000);
        } catch (err) {
            console.error('Failed to copy code', err);
        }
    };

    if (!blog) {
        return <div className="min-h-screen pt-20 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Blog not found</div>;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="min-h-screen p-4 lg:p-8 transition-colors duration-300 relative"
            style={{
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
            }}
        >
            <div className="max-w-6xl mx-auto">
                <Link href="/blogs" className="inline-block mb-12 text-lg font-medium hover:underline transition-colors" style={{ color: 'var(--text-accent)' }}>
                    ← Back to Blogs
                </Link>

                <header className="mb-12 text-center relative">
                    {/* Share URL Button - Desktop */}
                    <div className="absolute right-0 top-0 hidden md:block">
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleShare}
                            className="p-3 rounded-full bg-gray-800/50 hover:bg-gray-700/50 text-cyan-400 border border-gray-700 transition-colors"
                            title="Share this blog"
                        >
                            {showShareToast ? <IoCheckmark size={20} /> : <FaShareAlt size={18} />}
                        </motion.button>
                    </div>

                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 pb-2 bg-gradient-to-r bg-clip-text text-transparent"
                        style={{
                            backgroundImage: theme === 'dark'
                                ? 'linear-gradient(to right, #22d3ee, #3b82f6, #8b5cf6)'
                                : 'linear-gradient(to right, #0891b2, #2563eb, #7c3aed)'
                        }}
                    >
                        {blog.title}
                    </h1>
                    <p className="text-xl mb-6" style={{ color: 'var(--text-secondary)' }}>
                        {blog.date}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 mb-8 items-center">
                        {blog.tags && blog.tags.map((tag, index) => (
                            <span
                                key={index}
                                className="px-4 py-1.5 rounded-full text-sm font-medium border transition-all hover:scale-105 cursor-default"
                                style={{
                                    backgroundColor: 'rgba(34, 211, 238, 0.1)',
                                    color: 'var(--accent-cyan)',
                                    borderColor: 'var(--accent-cyan)',
                                    boxShadow: '0 0 10px rgba(34, 211, 238, 0.2)'
                                }}
                            >
                                #{tag}
                            </span>
                        ))}
                        {/* Mobile Share Button */}
                        <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={handleShare}
                            className="md:hidden p-2 rounded-full bg-gray-800/50 hover:bg-gray-700/50 text-cyan-400 border border-gray-700 transition-colors ml-2"
                            title="Share this blog"
                        >
                            {showShareToast ? <IoCheckmark size={16} /> : <FaShareAlt size={14} />}
                        </motion.button>
                    </div>
                </header>

                {/* Share Toast Notification */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: showShareToast ? 1 : 0, y: showShareToast ? 0 : 50 }}
                    className="fixed bottom-8 right-8 px-6 py-3 bg-gray-900 border border-cyan-500/50 rounded-lg shadow-lg z-50 flex items-center gap-3 pointer-events-none"
                >
                    <IoCheckmark className="text-cyan-400" size={20} />
                    <span className="text-gray-200 font-medium">Link copied to clipboard!</span>
                </motion.div>

                {blog.image && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-12 rounded-2xl overflow-hidden shadow-2xl bg-black/20 flex justify-center cursor-zoom-in"
                        onClick={() => setSelectedImage(blog.image)}
                    >
                        <img
                            src={blog.image}
                            alt={blog.title}
                            className="w-auto h-auto max-h-[600px] max-w-full object-contain"
                        />
                    </motion.div>
                )}

                <div
                    className="prose prose-lg max-w-none prose-invert"
                    style={{
                        color: 'var(--text-secondary)',
                        '--tw-prose-headings': 'var(--text-primary)',
                        '--tw-prose-links': 'var(--text-accent)',
                        '--tw-prose-bold': 'var(--text-primary)',
                        '--tw-prose-quotes': 'var(--text-secondary)',
                        '--tw-prose-code': 'var(--text-accent)',
                        backgroundColor: 'transparent'
                    }}
                >
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            a: ({ node, className, href, children, ...props }) => {
                                return (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`${className} text-cyan-400 hover:underline`}
                                        {...props}
                                    >
                                        {children}
                                    </a>
                                );
                            },
                            code({ node, inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || '')
                                return !inline && match ? (
                                    <div className="rounded-lg overflow-hidden my-6 border border-gray-700">
                                        <div className="bg-gray-800 px-4 py-1 text-xs text-gray-400 border-b border-gray-700">{match[1]}</div>
                                        <SyntaxHighlighter
                                            style={vscDarkPlus}
                                            language={match[1]}
                                            PreTag="div"
                                            customStyle={{ margin: 0, borderRadius: 0 }}
                                            {...props}
                                        >
                                            {String(children).replace(/\n$/, '')}
                                        </SyntaxHighlighter>
                                    </div>
                                ) : (
                                    <code className={className} style={{ backgroundColor: 'rgba(100,100,100,0.2)', padding: '0.2em 0.4em', borderRadius: '3px' }} {...props}>
                                        {children}
                                    </code>
                                )
                            },
                            pre: ({ children }) => <>{children}</>
                        }}
                    >
                        {blog.content}
                    </ReactMarkdown>
                </div>




                {extractedLinks.length > 0 && (
                    <div className="mt-8">
                        <Divider />
                        <h2 className="text-2xl font-bold mb-6 text-white text-center">Resources & Links</h2>
                        <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto">
                            {extractedLinks.map((link, index) => (
                                <LinkPreview key={index} url={link} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Image Popup Modal */}
            {selectedImage && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSelectedImage(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative max-w-[90vw] max-h-[90vh]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 text-xl font-bold bg-white/10 p-2 rounded-full"
                        >
                            ✕ Close
                        </button>
                        <img
                            src={selectedImage}
                            alt="Full screen view"
                            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                        />
                    </motion.div>
                </motion.div>
            )}
        </motion.div>
    );
}
