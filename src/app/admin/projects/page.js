"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function AdminProjects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
            setProjects(data);
        } catch (error) {
            console.error('Failed to fetch projects', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this project?')) return;

        try {
            const res = await fetch(`/api/projects/${id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setProjects(projects.filter((p) => p._id !== id));
            } else {
                alert('Failed to delete project');
            }
        } catch (error) {
            console.error('Error deleting project', error);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Project Database</h1>
                        <p className="text-slate-400">Manage, edit, and track your portfolio projects.</p>
                    </div>
                    <Link href="/admin/projects/new" className="group relative px-6 py-3 rounded-lg overflow-hidden bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/50 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                        <span className="relative text-cyan-400 font-bold tracking-wide flex items-center gap-2">
                            <span className="text-lg">+</span> INITIALIZE_PROJECT
                        </span>
                    </Link>
                </div>
            </div>

            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/5 text-xs uppercase tracking-wider text-slate-400 font-medium">
                            <tr>
                                <th className="px-6 py-5">Project Name</th>
                                <th className="px-6 py-5">Type / Category</th>
                                <th className="px-6 py-5">Year</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5 text-right">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {projects.map((project, index) => (
                                <motion.tr
                                    key={project._id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group hover:bg-white/[0.02] transition-colors"
                                >
                                    <td className="px-6 py-5 font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                                        {project.name}
                                    </td>
                                    <td className="px-6 py-5 text-slate-400">{project.projectType}</td>
                                    <td className="px-6 py-5 text-slate-500 font-mono">{project.year}</td>
                                    <td className="px-6 py-5">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${project.status === 'Done'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${project.status === 'Done' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            {project.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-right flex items-center justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            href={`/admin/projects/${project._id}`}
                                            className="px-3 py-1.5 rounded hover:bg-cyan-500/20 text-cyan-400 transition-colors text-xs font-medium uppercase tracking-wider border border-transparent hover:border-cyan-500/30"
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(project._id)}
                                            className="px-3 py-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors text-xs font-medium uppercase tracking-wider border border-transparent hover:border-red-500/30"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                            {projects.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        No projects found in the database.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
