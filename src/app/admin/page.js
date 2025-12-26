"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    FaHouse, FaUser, FaBriefcase, FaPenNib, FaImages,
    FaHeading, FaShareNodes, FaEnvelope,
    FaPalette, FaGithub, FaSliders, FaDatabase, FaRightFromBracket
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
                { name: 'Social', desc: 'Links & Profiles', icon: FaShareNodes, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', link: '/admin/socials' },
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
        <div className="p-8 min-h-screen">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
                    <p className="text-gray-400">Manage your portfolio content and settings</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-lg border border-red-500/20 transition-all"
                >
                    <FaRightFromBracket /> Logout
                </button>
            </div>

            <div className="space-y-12">
                {sections.map((section, sectionIndex) => (
                    <div key={section.title}>
                        <h2 className="text-xl font-semibold text-gray-300 mb-6 pl-2 border-l-4 border-cyan-500/50">
                            {section.title}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {section.items.map((item, index) => (
                                <motion.div
                                    key={item.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: (sectionIndex * 0.2) + (index * 0.05) }}
                                    className={`
                                        relative overflow-hidden rounded-xl border backdrop-blur-sm p-6 cursor-pointer group transition-all duration-300
                                        ${item.border} hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] bg-gray-900/40 hover:bg-gray-800/60
                                    `}
                                    onClick={() => router.push(item.link)}
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className={`p-3 rounded-lg ${item.bg} ${item.color}`}>
                                            <item.icon className="text-2xl" />
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400">
                                            →
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-100 mb-1 group-hover:text-cyan-300 transition-colors">
                                        {item.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 group-hover:text-gray-400 transition-colors">
                                        {item.desc}
                                    </p>

                                    {/* Hover Glow Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                                </motion.div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
