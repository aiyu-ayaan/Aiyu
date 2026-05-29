"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const getStatusMeta = (status) => {
    const normalizedStatus = String(status || '').trim().toLowerCase();

    if (normalizedStatus === 'live') {
        return {
            label: 'Live',
            badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
            dotClass: 'bg-emerald-500',
        };
    }

    if (normalizedStatus === 'maintenance') {
        return {
            label: 'Maintenance',
            badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
            dotClass: 'bg-amber-500',
        };
    }

    if (normalizedStatus === 'private') {
        return {
            label: 'Private',
            badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
            dotClass: 'bg-purple-500',
        };
    }

    return {
        label: 'Archived',
        badgeClass: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
        dotClass: 'bg-slate-400',
    };
};

export default function AdminApps() {
    const [deployments, setDeployments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);

    useEffect(() => {
        fetchApps();
    }, []);

    const fetchApps = async () => {
        try {
            const response = await fetch('/api/deployments');
            const data = await response.json();
            setDeployments(data);
        } catch (error) {
            console.error('Failed to fetch apps', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this app?')) return;

        try {
            const response = await fetch(`/api/deployments/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setDeployments((previous) => previous.filter((deployment) => deployment._id !== id));
            } else {
                alert('Failed to delete app');
            }
        } catch (error) {
            console.error('Error deleting app', error);
        }
    };

    const persistAppOrder = async (reorderedDeployments, previousDeployments) => {
        setDeployments(reorderedDeployments);
        setIsSavingOrder(true);

        try {
            const response = await fetch('/api/deployments/reorder', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderedIds: reorderedDeployments.map((deployment) => deployment._id),
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save app order');
            }
        } catch (error) {
            console.error('Error reordering apps', error);
            setDeployments(previousDeployments);
            alert('Failed to save app order. Please try again.');
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

        const previousDeployments = deployments;
        const reorderedDeployments = [...deployments];
        const [movedDeployment] = reorderedDeployments.splice(sourceIndex, 1);
        reorderedDeployments.splice(dropIndex, 0, movedDeployment);

        setDraggedIndex(null);
        setDragOverIndex(null);
        await persistAppOrder(reorderedDeployments, previousDeployments);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    if (loading) return <div className="p-4 md:p-8 text-white">Loading...</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="mb-8">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight">Apps</h1>
                        <p className="text-slate-400">Manage hosted apps, services, and active environments.</p>
                        {isSavingOrder && <p className="text-xs font-mono text-cyan-400 mt-2">SAVING_APP_ORDER...</p>}
                    </div>
                    <Link href="/admin/apps/new" className="group relative px-6 py-3 rounded-lg overflow-hidden bg-cyan-500/10 border border-cyan-500/20 hover:border-cyan-500/50 transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                        <div className="absolute inset-0 bg-linear-to-r from-transparent via-cyan-500/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
                        <span className="relative text-cyan-400 font-bold tracking-wide flex items-center gap-2">
                            <span className="text-lg">+</span> ADD_APP
                        </span>
                    </Link>
                </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/10 text-xs uppercase tracking-wider text-slate-400 font-medium">
                            <tr>
                                <th className="px-6 py-5">Order</th>
                                <th className="px-6 py-5">Name</th>
                                <th className="px-6 py-5">Type / Provider</th>
                                <th className="px-6 py-5">Environment</th>
                                <th className="px-6 py-5">Status</th>
                                <th className="px-6 py-5 text-right">Controls</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10 text-sm">
                            {deployments.map((deployment, index) => {
                                const statusMeta = getStatusMeta(deployment.status);
                                const isDragging = draggedIndex === index;
                                const isDragTarget = dragOverIndex === index && draggedIndex !== index;

                                return (
                                    <motion.tr
                                        key={deployment._id}
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
                                        <td className="px-6 py-5 font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">{deployment.name}</td>
                                        <td className="px-6 py-5 text-slate-400">
                                            <div>{deployment.appType}</div>
                                            <div className="text-xs text-slate-500 mt-1">{deployment.hostingProvider}</div>
                                        </td>
                                        <td className="px-6 py-5 text-slate-500 font-mono">{deployment.environment}</td>
                                        <td className="px-6 py-5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusMeta.badgeClass}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`} />
                                                {statusMeta.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <span className="px-2 py-1 text-[10px] uppercase tracking-wider text-slate-500 border border-white/10 rounded">Drag Row</span>
                                                <Link
                                                    href={`/admin/apps/${deployment._id}`}
                                                    className="px-3 py-1.5 rounded hover:bg-cyan-500/20 text-cyan-400 transition-colors text-xs font-medium uppercase tracking-wider border border-transparent hover:border-cyan-500/30"
                                                >
                                                    Edit
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(deployment._id)}
                                                    className="px-3 py-1.5 rounded hover:bg-red-500/20 text-red-400 transition-colors text-xs font-medium uppercase tracking-wider border border-transparent hover:border-red-500/30"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                );
                            })}
                            {deployments.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                        No apps added yet.
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
