"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Helper for Sortable Items
function SortableItem({ id, children, className }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={className} {...attributes} {...listeners}>
            {children}
        </div>
    );
}

const HeaderForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        navLinks: [],
        contactLink: { name: '', href: '' },
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchData();
    }, []);

    // Helper to ensure all items have a unique ID for DnD
    const ensureIds = (items) => {
        return items.map(item => ({
            ...item,
            _id: item._id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
    };

    const fetchData = async () => {
        try {
            const res = await fetch('/api/header');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData({
                        ...data,
                        navLinks: ensureIds(data.navLinks || []),
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch header data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setFormData((prev) => {
                const oldIndex = prev.navLinks.findIndex((item) => item._id === active.id);
                const newIndex = prev.navLinks.findIndex((item) => item._id === over.id);

                return {
                    ...prev,
                    navLinks: arrayMove(prev.navLinks, oldIndex, newIndex),
                };
            });
        }
    };

    const handleNavLinkChange = (index, field, value) => {
        const newNavLinks = [...formData.navLinks];
        newNavLinks[index] = { ...newNavLinks[index], [field]: value };
        setFormData({ ...formData, navLinks: newNavLinks });
    };

    const handleContactLinkChange = (field, value) => {
        setFormData({
            ...formData,
            contactLink: { ...formData.contactLink, [field]: value },
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        // Prepare payload: strict navLink structure without temp _ids to avoid CastError
        const payload = {
            ...formData,
            navLinks: formData.navLinks.map(({ _id, ...rest }) => rest),
        };

        try {
            const response = await fetch('/api/header', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                router.push('/admin');
                router.refresh();
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong');
            }
        } catch (err) {
            setError('An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center p-12">
            <span className="font-mono text-cyan-400 animate-pulse">LOADING_DATA_STREAM...</span>
        </div>
    );

    const handleAddNavLink = () => {
        setFormData({
            ...formData,
            navLinks: [...formData.navLinks, { _id: `temp-${Date.now()}`, name: '', href: '', visible: true }]
        });
    };

    const handleRemoveNavLink = (index) => {
        const newNavLinks = formData.navLinks.filter((_, i) => i !== index);
        setFormData({ ...formData, navLinks: newNavLinks });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-12">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl font-mono text-sm">
                    ERROR: {error}
                </div>
            )}

            {/* Navigation Links Section */}
            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <div className="flex justify-between items-center mb-8 relative z-10">
                    <h2 className="text-sm font-mono text-blue-500/70 uppercase tracking-widest flex items-center gap-4">
                        Navigation Sequence
                        <div className="h-px w-20 bg-blue-500/10" />
                    </h2>
                    <button
                        type="button"
                        onClick={handleAddNavLink}
                        className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg border border-blue-500/20 hover:border-blue-500/50 transition-all font-mono uppercase tracking-wide flex items-center gap-2"
                    >
                        + Add Checkpoint
                    </button>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={formData.navLinks.map(link => link._id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-4 relative z-10">
                            {formData.navLinks.map((link, index) => (
                                <SortableItem key={link._id} id={link._id} className="bg-white/[0.02] p-6 rounded-xl border border-white/5 relative group hover:border-blue-500/30 transition-colors">
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveNavLink(index)}
                                        className="absolute top-3 right-3 text-white/20 hover:text-red-400 transition-colors z-20"
                                        title="Remove link"
                                    >
                                        <div className="p-1">✕</div>
                                    </button>

                                    <div className="flex gap-4 items-center">
                                        {/* Drag Handle Icon (Visual only, handled by SortableItem parent item) */}
                                        <div className="text-slate-600 cursor-move">
                                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Display Label</label>
                                                <input
                                                    type="text"
                                                    value={link.name}
                                                    onChange={(e) => handleNavLinkChange(index, 'name', e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-blue-500/50 outline-none text-sm font-bold placeholder:text-slate-700"
                                                    placeholder="Link Text"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Target Route</label>
                                                <input
                                                    type="text"
                                                    value={link.href}
                                                    onChange={(e) => handleNavLinkChange(index, 'href', e.target.value)}
                                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-blue-400 focus:border-blue-500/50 outline-none text-sm font-mono placeholder:text-blue-900/50"
                                                    placeholder="/path"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center gap-2 border-l border-white/5 pl-4 ml-2">
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500">Visible</label>
                                            <input
                                                type="checkbox"
                                                checked={link.visible !== false}
                                                onChange={(e) => handleNavLinkChange(index, 'visible', e.target.checked)}
                                                className="w-5 h-5 rounded border-white/20 bg-black/40 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-transparent transition-all cursor-pointer accent-blue-500"
                                            />
                                        </div>
                                    </div>
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Contact Link Section */}
            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <div className="flex justify-between items-center mb-8 relative z-10">
                    <h2 className="text-sm font-mono text-cyan-500/70 uppercase tracking-widest flex items-center gap-4">
                        Contact Vector
                        <div className="h-px w-20 bg-cyan-500/10" />
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Action Label</label>
                        <input
                            type="text"
                            value={formData.contactLink?.name || ''}
                            onChange={(e) => handleContactLinkChange('name', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 outline-none text-sm font-bold placeholder:text-slate-700"
                            placeholder="e.g. Hire Me"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Target Action</label>
                        <input
                            type="text"
                            value={formData.contactLink?.href || ''}
                            onChange={(e) => handleContactLinkChange('href', e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-cyan-400 focus:border-cyan-500/50 outline-none text-sm font-mono placeholder:text-cyan-900/50"
                            placeholder="e.g. #contact"
                        />
                    </div>
                </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="sticky bottom-8 flex justify-end gap-4 pt-6 border-t border-white/5 bg-[#030014]/80 backdrop-blur-lg p-4 rounded-xl border border-white/5 shadow-2xl z-50">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 rounded bg-white/5 hover:bg-white/10 text-slate-400 transition-colors text-sm font-medium"
                >
                    CANCEL
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-8 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(34,211,238,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-sm tracking-wide"
                >
                    {saving ? 'UPDATING_SYSTEM...' : 'CONFIRM_UPDATE'}
                </button>
            </div>
        </form>
    );
};

export default HeaderForm;
