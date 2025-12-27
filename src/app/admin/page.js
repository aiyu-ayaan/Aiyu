"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

    const menuItems = {
        main: [
            { label: 'Home', description: 'Hero & Intro', icon: <FaHouse />, color: 'from-purple-500/10 to-purple-500/5', textColor: 'text-purple-400', path: '/admin/home' },
            { label: 'About', description: 'Bio & Skills', icon: <FaUser />, color: 'from-green-500/10 to-green-500/5', textColor: 'text-green-400', path: '/admin/about' },
            { label: 'Projects', description: 'Portfolio Items', icon: <FaBriefcase />, color: 'from-blue-500/10 to-blue-500/5', textColor: 'text-blue-400', path: '/admin/projects' },
            { label: 'Blogs', description: 'Articles & Posts', icon: <FaPenNib />, color: 'from-teal-500/10 to-teal-500/5', textColor: 'text-teal-400', path: '/admin/blogs' },
            { label: 'Gallery', description: 'Photos & Certs', icon: <FaImages />, color: 'from-indigo-500/10 to-indigo-500/5', textColor: 'text-indigo-400', path: '/admin/gallery' },
        ],
        secondary: [
            { label: 'Header', description: 'Nav & Logo', icon: <FaHeading />, color: 'from-orange-500/10 to-orange-500/5', textColor: 'text-orange-400', path: '/admin/header' },
            { label: 'Footer', description: 'Links & Profiles', icon: <FaShareNodes />, color: 'from-pink-500/10 to-pink-500/5', textColor: 'text-pink-400', path: '/admin/footer' },
            { label: 'Contact', description: 'Messages & Info', icon: <FaEnvelope />, color: 'from-red-500/10 to-red-500/5', textColor: 'text-red-400', path: '/admin/contact' },
        ],
        system: [
            { label: 'Themes', description: 'Colors & Style', icon: <FaPalette />, color: 'from-violet-500/10 to-violet-500/5', textColor: 'text-violet-400', path: '/admin/themes' },
            { label: 'GitHub', description: 'Repo Stats', icon: <FaGithub />, color: 'from-gray-500/10 to-gray-500/5', textColor: 'text-gray-400', path: '/admin/github' },
            { label: 'Config', description: 'Site Settings', icon: <FaSliders />, color: 'from-slate-500/10 to-slate-500/5', textColor: 'text-slate-400', path: '/admin/config' },
            { label: 'Database', description: 'Backups & JSON', icon: <FaDatabase />, color: 'from-yellow-500/10 to-yellow-500/5', textColor: 'text-yellow-400', path: '/admin/database' },
        ]
    };

    return (
        <div className="p-8 max-w-7xl mx-auto" >
            <header className="mb-12 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Command Center</h1>
                    <p className="text-slate-300">Welcome back, Admin. Select a module to configure.</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="group flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all text-xs font-mono uppercase tracking-wider"
                >
                    Terminate_Session
                    <FaRightFromBracket size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </header>

            <div className="space-y-12">
                {/* Main Content Modules */}
                <section>
                    <h2 className="text-sm font-mono text-cyan-400 mb-6 uppercase tracking-widest flex items-center gap-2">
                        Main Content
                        <div className="h-px bg-cyan-900/30 flex-grow" />
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {menuItems.main.map((item) => (
                            <Link
                                key={item.path}
                                href={item.path}
                                className="group relative p-6 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] overflow-hidden"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors ${item.textColor}`}>
                                            {item.icon}
                                        </div>
                                        <FaArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                                        {item.label}
                                    </h3>
                                    <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                                        {item.description}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* Secondary Modules */}
                <section>
                    <h2 className="text-sm font-mono text-cyan-400 mb-6 uppercase tracking-widest flex items-center gap-2">
                        Components
                        <div className="h-px bg-cyan-900/30 flex-grow" />
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {menuItems.secondary.map((item) => (
                            <Link
                                key={item.path}
                                href={item.path}
                                className="group relative p-6 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] overflow-hidden"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className={`p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors ${item.textColor}`}>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                                            {item.label}
                                        </h3>
                                        <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                                            {item.description}
                                        </p>
                                    </div>
                                    <FaArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>

                {/* System Modules */}
                <section>
                    <h2 className="text-sm font-mono text-cyan-400 mb-6 uppercase tracking-widest flex items-center gap-2">
                        System Configuration
                        <div className="h-px bg-cyan-900/30 flex-grow" />
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {menuItems.system.map((item) => (
                            <Link
                                key={item.path}
                                href={item.path}
                                className="group relative p-6 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all hover:shadow-[0_0_20px_rgba(245,158,11,0.1)] overflow-hidden"
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors ${item.textColor}`}>
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors">
                                                {item.label}
                                            </h3>
                                            <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </div >
    );
}
