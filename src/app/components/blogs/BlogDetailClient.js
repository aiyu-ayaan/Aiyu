"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import dynamic from 'next/dynamic';

const SyntaxHighlighter = dynamic(() => import('react-syntax-highlighter').then(mod => mod.Prism), { ssr: false });
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export default function BlogDetailClient({ blog }) {
    const { theme } = useTheme();

    if (!blog) {
        return <div className="min-h-screen pt-20 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Blog not found</div>;
    }

    return (
        <div className="min-h-screen pt-24 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <motion.article
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-6xl mx-auto"
            >
                <Link href="/blogs" className="inline-block mb-8 text-lg font-medium hover:underline transition-colors" style={{ color: 'var(--text-accent)' }}>
                    ← Back to Blogs
                </Link>

                <header className="mb-12 text-center">
                    <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r"
                        style={{
                            backgroundImage: theme === 'dark'
                                ? 'linear-gradient(to right, #22d3ee, #3b82f6)'
                                : 'linear-gradient(to right, #0891b2, #2563e5)'
                        }}
                    >
                        {blog.title}
                    </h1>
                    <p className="text-xl mb-6" style={{ color: 'var(--text-secondary)' }}>
                        {blog.date}
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 mb-8">
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
                    </div>
                </header>

                {blog.image && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-12 rounded-2xl overflow-hidden shadow-2xl"
                    >
                        <img
                            src={blog.image}
                            alt={blog.title}
                            className="w-full h-[400px] md:h-[600px] object-cover"
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
            </motion.article>
        </div>
    );
}
