"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function AdminDashboard() {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
            });

            if (response.ok) {
                router.push('/admin/login');
            }
        } catch (error) {
            console.error('Logout failed', error);
        }
    };

    const collections = [
        { name: 'Projects', count: 'Manage', color: 'bg-blue-500', link: '/admin/projects' },
        { name: 'Blogs', count: 'Manage', color: 'bg-teal-500', link: '/admin/blogs' },
        { name: 'About', count: 'Manage', color: 'bg-green-500', link: '/admin/about' },
        { name: 'Home', count: 'Manage', color: 'bg-purple-500', link: '/admin/home' },
        { name: 'Header', count: 'Manage', color: 'bg-orange-500', link: '/admin/header' },
        { name: 'Social', count: 'Manage', color: 'bg-pink-500', link: '/admin/socials' },
        { name: 'Themes', count: 'Customize', color: 'bg-violet-500', link: '/admin/themes' },
        { name: 'Database', count: 'Backup', color: 'bg-yellow-500', link: '/admin/database' },
        { name: 'Config', count: 'Setup', color: 'bg-slate-500', link: '/admin/config' },
        { name: 'Gallery', count: 'Manage', color: 'bg-indigo-500', link: '/admin/gallery' },
        { name: 'GitHub', count: 'Configure', color: 'bg-gray-700', link: '/admin/github' },
        { name: 'Contact', count: 'Manage', color: 'bg-red-500', link: '/admin/contact' },
    ];

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded transition-colors"
                >
                    Logout
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections.map((collection, index) => (
                    <motion.div
                        key={collection.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-cyan-400 transition-colors cursor-pointer group"
                        onClick={() => collection.link && router.push(collection.link)}
                    >
                        <div className={`w-12 h-12 rounded-lg ${collection.color} mb-4 flex items-center justify-center text-white font-bold text-xl`}>
                            {collection.name[0]}
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">{collection.name}</h2>
                        <p className="text-gray-400 group-hover:text-cyan-400 transition-colors">
                            {collection.count} Content →
                        </p>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
