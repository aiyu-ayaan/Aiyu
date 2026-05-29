import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Book, Search, X, ChevronRight, ExternalLink } from 'lucide-react';

export default function BlogLinkInput({ value, onChange }) {
    const [mode, setMode] = useState(value && !value.startsWith('/blogs/') ? 'external' : 'internal');
    const [blogs, setBlogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Initialize mode if value changes from outside
    useEffect(() => {
        if (value && mode === 'internal' && !value.startsWith('/blogs/')) {
            setMode('external');
        }
    }, [value]);

    useEffect(() => {
        if (mode === 'internal' && blogs.length === 0) {
            fetch('/api/blogs?all=true')
                .then(r => r.json())
                .then(d => { if (d.success) setBlogs(d.data); })
                .catch(console.error);
        }
    }, [mode, blogs.length]);

    const filteredBlogs = blogs.filter(b => 
        b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.slug?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const selectedBlog = blogs.find(b => `/blogs/${b.slug}` === value);

    const handleModeSwitch = (newMode) => {
        if (newMode === mode) return;
        setMode(newMode);
        // Clear if current value doesn't match new mode format
        if (newMode === 'internal' && value && !value.startsWith('/blogs/')) {
            onChange({ target: { name: 'blogLink', value: '' } });
        } else if (newMode === 'external' && value && value.startsWith('/blogs/')) {
            onChange({ target: { name: 'blogLink', value: '' } });
        }
    };

    const handleSelectBlog = (blog) => {
        onChange({ target: { name: 'blogLink', value: `/blogs/${blog.slug}` } });
        setIsModalOpen(false);
        setSearchQuery('');
    };

    return (
        <div className="mt-6 md:col-span-2">
            <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400">Blog / Article Link</label>
                <div className="flex bg-slate-950/50 rounded-lg p-1 border border-white/10">
                    <button
                        type="button"
                        onClick={() => handleModeSwitch('internal')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${mode === 'internal' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Internal Blog
                    </button>
                    <button
                        type="button"
                        onClick={() => handleModeSwitch('external')}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${mode === 'external' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        External URL
                    </button>
                </div>
            </div>

            {mode === 'external' ? (
                <div className="relative group/input">
                    <Globe className="absolute left-4 top-3.5 text-slate-400 group-focus-within/input:text-purple-400 transition-colors" size={18} />
                    <input
                        type="url"
                        name="blogLink"
                        value={value || ''}
                        onChange={onChange}
                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all placeholder:text-slate-600 font-mono"
                        placeholder="https://yourblog.com/post..."
                    />
                </div>
            ) : (
                <div 
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-4 px-5 text-slate-200 flex justify-between items-center cursor-pointer hover:border-purple-500/40 hover:bg-slate-900/50 transition-all group/btn"
                    onClick={() => setIsModalOpen(true)}
                >
                    <div className="flex items-center gap-4 overflow-hidden">
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 group-hover/btn:bg-purple-500/20 transition-colors">
                            <Book size={20} />
                        </div>
                        <div className="truncate">
                            {selectedBlog ? (
                                <>
                                    <div className="text-sm font-bold text-slate-100 truncate">{selectedBlog.title}</div>
                                    <div className="text-[10px] text-slate-500 font-mono truncate">/blogs/{selectedBlog.slug}</div>
                                </>
                            ) : (
                                <span className="text-sm text-slate-500 font-medium">Select a blog post from your writing catalog...</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-purple-500/60 group-hover/btn:text-purple-400 transition-colors">
                        {selectedBlog ? 'ChangeSelection' : 'OpenCatalog'}
                        <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
                    </div>
                </div>
            )}

            {/* Modal Portal Alternative (Using absolute fixed since we're in the same layout) */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-4 md:p-8">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                            onClick={() => setIsModalOpen(false)}
                        />
                        
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
                            style={{ maxHeight: '80vh' }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-950/40">
                                <div>
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Book className="text-purple-400" size={20} />
                                        Select Internal Blog
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">Link an existing article to this application resource.</p>
                                </div>
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Modal Search Bar */}
                            <div className="p-4 bg-slate-950/20 border-b border-white/5">
                                <div className="relative group/search">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-purple-400 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        autoFocus
                                        placeholder="Search by title or system slug..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-slate-200 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all font-mono text-sm"
                                    />
                                </div>
                            </div>

                            {/* Modal Content - List */}
                            <div className="flex-1 overflow-y-auto p-3 hide-scrollbar">
                                {filteredBlogs.length === 0 ? (
                                    <div className="py-12 flex flex-col items-center text-slate-500">
                                        <Search size={48} className="opacity-10 mb-4" />
                                        <p className="text-sm font-medium">No results matching your query.</p>
                                        <button 
                                            onClick={() => setSearchQuery('')}
                                            className="mt-2 text-xs text-purple-400 hover:underline"
                                        >
                                            Clear search filters
                                        </button>
                                    </div>
                                ) : (
                                    <div className="grid gap-2">
                                        {filteredBlogs.map(blog => {
                                            const isActive = `/blogs/${blog.slug}` === value;
                                            return (
                                                <div
                                                    key={blog._id}
                                                    className={`p-4 rounded-2xl cursor-pointer transition-all flex items-center justify-between group ${isActive ? 'bg-purple-500/10 border border-purple-500/30' : 'hover:bg-white/5 border border-transparent'}`}
                                                    onClick={() => handleSelectBlog(blog)}
                                                >
                                                    <div className="flex-1 truncate pr-4">
                                                        <div className={`font-bold transition-colors ${isActive ? 'text-purple-300' : 'text-slate-200 group-hover:text-white'}`}>
                                                            {blog.title}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="text-[10px] font-mono text-slate-500">/blogs/{blog.slug}</div>
                                                            {blog.date && (
                                                                <>
                                                                    <div className="h-1 w-1 rounded-full bg-slate-700"></div>
                                                                    <div className="text-[10px] text-slate-600 font-mono">{new Date(blog.date).toLocaleDateString()}</div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className={`shrink-0 h-10 w-10 rounded-xl border flex items-center justify-center transition-all ${isActive ? 'bg-purple-500 border-purple-400 text-white' : 'bg-slate-950/50 border-white/5 text-slate-600 group-hover:border-purple-500/30 group-hover:text-purple-400'}`}>
                                                        {isActive ? (
                                                            <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
                                                        ) : (
                                                            <ExternalLink size={16} />
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 bg-slate-950/40 border-t border-white/10 text-[10px] font-mono text-slate-500 text-center uppercase tracking-widest">
                                Total Data Entries: {blogs.length} | Catalog Synced
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
