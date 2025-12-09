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
        <div ref={setNodeRef} style={style} className={className}>
            <div className="flex items-start gap-2 h-full">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="mt-4 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing touch-none"
                    title="Drag to reorder"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6"></line>
                        <line x1="8" y1="12" x2="21" y2="12"></line>
                        <line x1="8" y1="18" x2="21" y2="18"></line>
                        <line x1="3" y1="6" x2="3.01" y2="6"></line>
                        <line x1="3" y1="12" x2="3.01" y2="12"></line>
                        <line x1="3" y1="18" x2="3.01" y2="18"></line>
                    </svg>
                </button>
                <div className="flex-1 w-full">
                    {children}
                </div>
            </div>
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

    if (loading) return <div className="text-white">Loading...</div>;

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
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700">
            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded">
                    {error}
                </div>
            )}

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">Navigation Links</h3>
                <button
                    type="button"
                    onClick={handleAddNavLink}
                    className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-sm transition-colors"
                >
                    + Add Link
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
                    <div className="space-y-4">
                        {formData.navLinks.map((link, index) => (
                            <SortableItem key={link._id} id={link._id} className="mb-4 p-4 bg-gray-700/50 rounded relative group">
                                <button
                                    type="button"
                                    onClick={() => handleRemoveNavLink(index)}
                                    className="absolute top-2 right-2 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    title="Remove link"
                                >
                                    ✕
                                </button>
                                <div className="grid grid-cols-12 gap-4 items-end">
                                    <div className="col-span-5">
                                        <label className="block text-sm font-medium mb-1 text-gray-300">Name</label>
                                        <input
                                            type="text"
                                            value={link.name}
                                            onChange={(e) => handleNavLinkChange(index, 'name', e.target.value)}
                                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-5">
                                        <label className="block text-sm font-medium mb-1 text-gray-300">Href</label>
                                        <input
                                            type="text"
                                            value={link.href}
                                            onChange={(e) => handleNavLinkChange(index, 'href', e.target.value)}
                                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-2 flex items-center justify-center pb-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={link.visible !== false} // Default to true if undefined
                                                onChange={(e) => handleNavLinkChange(index, 'visible', e.target.checked)}
                                                className="w-5 h-5 rounded border-gray-600 text-cyan-500 focus:ring-cyan-500 bg-gray-700"
                                            />
                                            <span className="text-sm text-gray-300">Show</span>
                                        </label>
                                    </div>
                                </div>
                            </SortableItem>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <h3 className="text-xl font-bold text-white mb-4 mt-8">Contact Link</h3>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-700/50 rounded">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Name</label>
                    <input
                        type="text"
                        value={formData.contactLink?.name || ''}
                        onChange={(e) => handleContactLinkChange('name', e.target.value)}
                        className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Href</label>
                    <input
                        type="text"
                        value={formData.contactLink?.href || ''}
                        onChange={(e) => handleContactLinkChange('href', e.target.value)}
                        className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-6 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white transition-colors"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Update Header'}
                </button>
            </div>
        </form>
    );
};

export default HeaderForm;
