"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    FaHouse, FaUser, FaBriefcase, FaPenNib, FaImages,
    FaHeading, FaShareNodes, FaEnvelope,
    FaPalette, FaGithub, FaSliders, FaDatabase, FaRightFromBracket, FaArrowRight
} from "react-icons/fa6";

export default function AdminDashboard() {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/logout', { method: 'POST' });
            if (response.ok) router.push('/admin/login');
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const sections = [
        {
            title: "Main Content",
            items: [
                { name: 'Home', desc: 'Hero & Intro', icon: FaHouse, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', link: '/admin/home' },
                { name: 'About', desc: 'Bio & Skills', icon: FaUser, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', link: '/admin/about' },
                { name: 'Projects', desc: 'Portfolio Items', icon: FaBriefcase, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', link: '/admin/projects' },
                { name: 'Blogs', desc: 'Articles & Posts', icon: FaPenNib, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', link: '/admin/blogs' },
                { name: 'Gallery', desc: 'Photos & Certs', icon: FaImages, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', link: '/admin/gallery' },
            ]
        },
        {
            title: "Components",
            items: [
                { name: 'Header', desc: 'Nav & Logo', icon: FaHeading, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', link: '/admin/header' },
                { name: 'Footer', desc: 'Links & Profiles', icon: FaShareNodes, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', link: '/admin/socials' },
                { name: 'Contact', desc: 'Messages & Info', icon: FaEnvelope, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', link: '/admin/contact' },
            ]
        },
        {
            title: "System",
            items: [
                { name: 'Themes', desc: 'Colors & Style', icon: FaPalette, color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', link: '/admin/themes' },
                { name: 'GitHub', desc: 'Repo Stats', icon: FaGithub, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', link: '/admin/github' },
                { name: 'Config', desc: 'Site Settings', icon: FaSliders, color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', link: '/admin/config' },
                { name: 'Database', desc: 'Backups & JSON', icon: FaDatabase, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', link: '/admin/database' },
            ]
        }
    ];

    return (
        <div className="p-8 min-h-screen max-w-7xl mx-auto">
            <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono mb-4"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        SYSTEM ONLINE
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-cyan-200"
                    >
                        Command Center
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-400 mt-2 font-mono"
                    >
                        Welcome back, Admin. Select a module to configure.
                    </motion.p>
                </div>
                <motion.button
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={handleLogout}
                    className="group flex items-center gap-3 px-5 py-2.5 rounded-lg bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 text-red-400 transition-all hover:shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                    <span className="font-mono text-sm">TERMINATE_SESSION</span>
                    <FaRightFromBracket className="group-hover:translate-x-1 transition-transform" />
                </motion.button>
            </header>

            <div className="space-y-16">
                {sections.map((section, sectionIndex) => (
                    <div key={section.title}>
                        <motion.h2
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: sectionIndex * 0.1 }}
                            className="text-sm font-mono text-cyan-500/70 uppercase tracking-widest mb-6 flex items-center gap-4"
                        >
                            {section.title}
                            <div className="h-px bg-cyan-500/10 flex-grow" />
                        </motion.h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {section.items.map((item, index) => (
                                <motion.div
                                    key={item.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (sectionIndex * 0.1) + (index * 0.05) }}
                                    onClick={() => router.push(item.link)}
                                    className="group relative"
                                >
                                    <div className={`
                                        relative overflow-hidden rounded-2xl border bg-[#0a0a0a]/60 backdrop-blur-xl p-6 cursor-pointer transition-all duration-300 h-full
                                        border-white/5 hover:border-cyan-500/30 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)]
                                        flex flex-col justify-between gap-6
                                    `}>
                                        <div className="flex justify-between items-start">
                                            <div className={`p-3.5 rounded-xl bg-gradient-to-br ${item.bg} border ${item.border} ${item.color} group-hover:scale-110 transition-transform duration-300`}>
                                                <item.icon className="text-xl" />
                                            </div>
                                            <div className="p-2 rounded-full border border-white/5 bg-white/5 text-slate-400 -rotate-45 group-hover:rotate-0 group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-all duration-300">
                                                <FaArrowRight size={12} />
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-xl font-bold text-slate-200 group-hover:text-cyan-400 transition-colors mb-2">
                                                {item.name}
                                            </h3>
                                            <p className="text-sm text-slate-500 leading-relaxed font-medium">
                                                {item.desc}
                                            </p>
                                        </div>

                                        {/* Hover Gradient Overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
