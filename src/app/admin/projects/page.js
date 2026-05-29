"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

const getStatusMeta = (status) => {
    const normalizedStatus = String(status || '').trim().toLowerCase();

    if (normalizedStatus === 'done' || normalizedStatus === 'completed') {
        return {
            label: 'Done',
            badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            dotClass: 'bg-emerald-500',
        };
    }

    if (normalizedStatus === 'deferred' || normalizedStatus === 'deffered' || normalizedStatus === 'on hold') {
        return {
            label: 'Deferred',
            badgeClass: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
            dotClass: 'bg-slate-400',
        };
    }

    return {
        label: 'In Progress',
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        dotClass: 'bg-amber-500',
    };
};

export default function AdminProjects() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

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

    const persistProjectOrder = async (reorderedProjects, previousProjects) => {
        setProjects(reorderedProjects);
        setIsSavingOrder(true);

        try {
            const response = await fetch('/api/projects/reorder', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderedIds: reorderedProjects.map((project) => project._id),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save project order');
            }
        } catch (error) {
            console.error('Error reordering projects', error);
            setProjects(previousProjects);
            alert('Failed to save project order. Please try again.');
        } finally {
            setIsSavingOrder(false);
        }
    };

    const handleDragStart = (event, index) => {
        if (isSavingOrder) {
            event.preventDefault();
            return;
        }

        setDraggedIndex(index);
        setDragOverIndex(index);
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
    };

    const handleDragOver = (event, index) => {
        if (isSavingOrder) return;

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = async (event, dropIndex) => {
        event.preventDefault();

        if (isSavingOrder) return;

        const sourceIndex = draggedIndex;
        if (sourceIndex === null || sourceIndex === dropIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const previousProjects = projects;
        const reorderedProjects = [...projects];
        const [movedProject] = reorderedProjects.splice(sourceIndex, 1);
        reorderedProjects.splice(dropIndex, 0, movedProject);

        setDraggedIndex(null);
        setDragOverIndex(null);
        await persistProjectOrder(reorderedProjects, previousProjects);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    if (loading) return <div className="p-4 md:p-8 text-white">Loading...</div>;

    const filteredProjects = projects.filter(p => 
        (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.projectType || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Project Database</h1>
                        <p className="text-slate-400">Manage, edit, and track your portfolio projects.</p>
                        {isSavingOrder && (
                            <p className="text-xs font-mono text-cyan-400 mt-2">SAVING_PROJECT_ORDER...</p>
                        )}
                    </div>
                    <Link href="/admin/projects/new" className="group relative px-6 py-3 rounded-lg overflow-hidden bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/50 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-cyan-500/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                        <span className="relative text-cyan-400 font-bold tracking-wide flex items-center gap-2">
                            <span className="text-lg">+</span> INITIALIZE_PROJECT
                        </span>
                    </Link>
                </div>
            </div>

            <div className="mb-6 relative max-w-2xl">
                <div className="absolute -inset-1 bg-linear-to-r from-cyan-500 to-purple-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000 group-focus-within:duration-200"></div>
                <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search projects..."
                        className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-slate-200 focus:outline-none focus:border-cyan-500/50 shadow-inner transition-all"
                    />
                </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400 font-medium">
                            <tr>
                                <th className="px-6 py-5">Order</th>
                                <th className="px-6 py-5">Project Name</th>
                                <th className="px-6 py-5">Type / Category</th>
                                <th className="px-6 py-5">Year</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5 text-right">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-sm">
                            {filteredProjects.map((project, index) => {
                                const statusMeta = getStatusMeta(project.status);
                                const isDragging = draggedIndex === index;
                                const isDragTarget = dragOverIndex === index && draggedIndex !== index;

                                return (
                                    <motion.tr
                                        key={project._id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        onDragOver={(event) => handleDragOver(event, index)}
                                        onDrop={(event) => handleDrop(event, index)}
                                        className={`group transition-colors ${isDragTarget ? 'bg-cyan-500/5' : 'hover:bg-white/2'} ${isDragging ? 'opacity-50' : ''}`}
                                    >
                                        <td className="px-6 py-5 text-slate-500 font-mono">
                                            <span className="inline-flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    draggable={!isSavingOrder}
                                                    onDragStart={(event) => handleDragStart(event, index)}
                                                    onDragEnd={handleDragEnd}
                                                    disabled={isSavingOrder}
                                                    title="Drag to reorder"
                                                    className="text-slate-600 hover:text-cyan-400 transition-colors select-none disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    ⋮⋮
                                                </button>
                                                <span>{index + 1}</span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                                            {project.name}
                                        </td>
                                        <td className="px-6 py-5 text-slate-400">{project.projectType}</td>
                                        <td className="px-6 py-5 text-slate-500 font-mono">{project.year}</td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusMeta.badgeClass}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                                                {statusMeta.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <span className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500 border border-white/10 rounded">
                                                    Drag Row
                                                </span>
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
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                            {filteredProjects.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        No projects found matching your search.
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
