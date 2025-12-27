"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getIconNames, IconList } from '@/lib/iconLibrary';

// Helper for Icon Preview
const IconPreview = ({ name }) => {
    const Icon = IconList[name];
    if (Icon) return <Icon className="w-5 h-5 text-cyan-400" />;

    // Fallback to CDN if not in local list
    if (name) {
        return (
            <img
                src={`https://cdn.simpleicons.org/${name.toLowerCase().replace(/[^a-z0-9]/g, '')}/22d3ee`}
                alt={name}
                className="w-5 h-5 object-contain"
                onError={(e) => { e.target.style.display = 'none'; }}
            />
        );
    }

    return <span className="text-xs text-gray-500">?</span>;
};

// ... SortableItem (unchanged) ...
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
            <div className="flex items-start gap-4 h-full">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="mt-4 text-slate-600 hover:text-cyan-400 cursor-grab active:cursor-grabbing touch-none transition-colors"
                    title="Reorder Element"
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

const AboutForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        name: '',
        roles: '',
        professionalSummary: '',
        skills: [],
        experiences: [],
        education: [],
        certifications: [],
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Icon Picker State
    const [iconSearchTerm, setIconSearchTerm] = useState('');
    const [activeIconIndex, setActiveIconIndex] = useState(null);
    const [allCdnIcons, setAllCdnIcons] = useState([]); // Store 3000+ icons here
    const availableIcons = getIconNames(); // Local icons

    // Fetch full icon list on mount
    useEffect(() => {
        const fetchIcons = async () => {
            try {
                // Load icons from the installed simple-icons package
                console.log("Loading icons from simple-icons package...");
                const iconsModule = await import('simple-icons/icons');
                const iconArray = Object.values(iconsModule).map(icon => ({
                    title: icon.title,
                    slug: icon.slug
                }));
                console.log(`Loaded ${iconArray.length} icons from package`);
                setAllCdnIcons(iconArray);
            } catch (err) {
                console.error("Failed to load icon library:", err);
            }
        };
        fetchIcons();
        fetchData();
    }, []);

    // Hybrid Search: Match local icons first, then CDN icons
    // Hybrid Search: Match local icons first, then CDN icons
    const getFilteredIcons = () => {
        // Prepare local matches first (always normalized to objects)
        const normalizedLocal = availableIcons.map(name => ({
            name,
            slug: name, // Local icons use name as slug for key purposes
            isCdn: false
        }));

        if (!iconSearchTerm) return normalizedLocal.slice(0, 50);

        const term = iconSearchTerm.toLowerCase();

        // 1. Local Matches
        const localMatches = normalizedLocal.filter(icon =>
            icon.name.toLowerCase().includes(term)
        );

        // 2. CDN Matches (that aren't already in local)
        const cdnMatches = (allCdnIcons || [])
            .filter(icon => icon.title.toLowerCase().includes(term))
            .map(icon => ({
                name: icon.title,
                slug: icon.slug,
                isCdn: true
            }))
            .filter(cdnIcon => !localMatches.some(local => local.name === cdnIcon.name)); // Dedup

        return [...localMatches, ...cdnMatches].slice(0, 50);
    };

    const filteredIcons = getFilteredIcons();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Helper to ensure all items have a unique ID for DnD
    const ensureIds = (items) => {
        return items.map(item => ({
            ...item,
            _id: item._id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
    };

    const fetchData = async () => {
        try {
            const res = await fetch('/api/about');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData({
                        ...data,
                        roles: data.roles ? data.roles.join(', ') : '',
                        skills: ensureIds(data.skills || []),
                        experiences: ensureIds(data.experiences || []),
                        education: ensureIds(data.education || []),
                        certifications: ensureIds(data.certifications || []),
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch about data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleDragEnd = (event, listKey) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setFormData((prev) => {
                const oldIndex = prev[listKey].findIndex((item) => item._id === active.id);
                const newIndex = prev[listKey].findIndex((item) => item._id === over.id);

                return {
                    ...prev,
                    [listKey]: arrayMove(prev[listKey], oldIndex, newIndex),
                };
            });
        }
    };

    // --- Skills Handlers ---
    const handleSkillChange = (index, field, value) => {
        const newSkills = [...formData.skills];
        newSkills[index] = { ...newSkills[index], [field]: value };
        setFormData((prev) => ({ ...prev, skills: newSkills }));
    };

    const addSkill = () => {
        setFormData((prev) => ({
            ...prev,
            skills: [...prev.skills, { _id: `temp-${Date.now()}`, name: '', level: 50, icon: '' }],
        }));
    };

    const removeSkill = (index) => {
        setFormData((prev) => ({
            ...prev,
            skills: prev.skills.filter((_, i) => i !== index),
        }));
    };

    const getProficiencyLabel = (level) => {
        if (level < 40) return 'Basic';
        if (level < 75) return 'Intermediate';
        return 'Advanced';
    };

    // --- Experience Handlers ---
    const handleExperienceChange = (index, field, value) => {
        const newExperiences = [...formData.experiences];
        newExperiences[index] = { ...newExperiences[index], [field]: value };
        setFormData((prev) => ({ ...prev, experiences: newExperiences }));
    };

    const addExperience = () => {
        setFormData((prev) => ({
            ...prev,
            experiences: [...prev.experiences, { _id: `temp-${Date.now()}`, company: '', role: '', duration: '', description: '' }],
        }));
    };

    const removeExperience = (index) => {
        setFormData((prev) => ({
            ...prev,
            experiences: prev.experiences.filter((_, i) => i !== index),
        }));
    };

    // --- Education Handlers ---
    const handleEducationChange = (index, field, value) => {
        const newEducation = [...formData.education];
        newEducation[index] = { ...newEducation[index], [field]: value };
        setFormData((prev) => ({ ...prev, education: newEducation }));
    };

    const addEducation = () => {
        setFormData((prev) => ({
            ...prev,
            education: [...prev.education, { _id: `temp-${Date.now()}`, institution: '', degree: '', duration: '', cgpa: '' }],
        }));
    };

    const removeEducation = (index) => {
        setFormData((prev) => ({
            ...prev,
            education: prev.education.filter((_, i) => i !== index),
        }));
    };

    // --- Certification Handlers ---
    const handleCertificationChange = (index, field, value) => {
        const newCertifications = [...formData.certifications];
        if (field === 'skills') {
            // Handle skills as comma-separated string for input, array for state
            value = value.split(',').map(s => s.trim());
        }
        newCertifications[index] = { ...newCertifications[index], [field]: value };
        setFormData((prev) => ({ ...prev, certifications: newCertifications }));
    };

    const addCertification = () => {
        setFormData((prev) => ({
            ...prev,
            certifications: [...prev.certifications, { _id: `temp-${Date.now()}`, name: '', issuer: '', date: '', url: '', skills: [] }],
        }));
    };

    const removeCertification = (index) => {
        setFormData((prev) => ({
            ...prev,
            certifications: prev.certifications.filter((_, i) => i !== index),
        }));
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const payload = {
            ...formData,
            roles: formData.roles.split(',').map((item) => item.trim()),
        };

        try {
            const response = await fetch('/api/about', {
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

    return (
        <form onSubmit={handleSubmit} className="space-y-12 max-w-5xl mx-auto">
            {/* Icon Picker Modal */}
            {activeIconIndex !== null && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] rounded-2xl p-6 w-full max-w-2xl border border-white/10 shadow-2xl space-y-6 max-h-[80vh] flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

                        <div className="flex justify-between items-center border-b border-white/10 pb-4 relative z-10">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="w-1 h-6 bg-cyan-500 rounded-full" />
                                Select Visualization Icon
                            </h3>
                            <button
                                type="button"
                                onClick={() => setActiveIconIndex(null)}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                <div className="p-2 rounded-full hover:bg-white/10">✕</div>
                            </button>
                        </div>

                        <div className="relative z-10">
                            <input
                                type="text"
                                placeholder="Search icon matrix..."
                                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-600 font-mono text-sm"
                                value={iconSearchTerm}
                                onChange={(e) => setIconSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto grid grid-cols-4 sm:grid-cols-6 gap-3 min-h-[300px] content-start relative z-10 pr-2 custom-scrollbar">
                            {filteredIcons.map(({ name, slug, isCdn }) => (
                                <button
                                    key={`${isCdn ? 'cdn' : 'local'}-${slug}`}
                                    type="button"
                                    onClick={() => {
                                        const value = isCdn ? slug : name;
                                        handleSkillChange(activeIconIndex, 'icon', value);
                                        setActiveIconIndex(null);
                                        setIconSearchTerm('');
                                    }}
                                    className="p-3 rounded-xl bg-white/[0.02] hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 flex flex-col items-center gap-3 transition-all aspect-square justify-center relative group"
                                >
                                    <div className="text-2xl text-slate-400 group-hover:text-cyan-400 transition-colors w-8 h-8 flex items-center justify-center">
                                        {isCdn ? (
                                            <img
                                                src={`https://cdn.simpleicons.org/${slug}/22d3ee`}
                                                alt={name}
                                                className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all opacity-70 group-hover:opacity-100"
                                                onError={(e) => { e.target.style.opacity = '0.3'; }}
                                            />
                                        ) : (
                                            <IconPreview name={name} />
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 group-hover:text-cyan-200 truncate w-full text-center font-mono">
                                        {name}
                                    </span>
                                    {isCdn && (
                                        <span className="absolute top-1 right-1 text-[8px] bg-cyan-900/50 text-cyan-300 px-1 rounded border border-cyan-500/20">
                                            WEB
                                        </span>
                                    )}
                                </button>
                            ))}

                            {/* Fallback */}
                            {iconSearchTerm && filteredIcons.length === 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        const slug = iconSearchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
                                        handleSkillChange(activeIconIndex, 'icon', slug);
                                        setActiveIconIndex(null);
                                        setIconSearchTerm('');
                                    }}
                                    className="p-3 rounded-xl bg-white/[0.02] border-2 border-dashed border-white/10 hover:border-cyan-500/50 flex flex-col items-center gap-2 transition-all aspect-square justify-center group"
                                >
                                    <div className="text-xl text-cyan-400">?</div>
                                    <span className="text-[10px] text-cyan-200 truncate w-full text-center">
                                        Use &quot;{iconSearchTerm}&quot;
                                    </span>
                                </button>
                            )}

                            {filteredIcons.length === 0 && !iconSearchTerm && (
                                <div className="col-span-full flex flex-col items-center justify-center text-slate-500 py-12 gap-2">
                                    <span className="text-2xl opacity-20">⌨️</span>
                                    <p className="text-sm font-mono">Awaiting search input...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded">
                    {error}
                </div>
            )}

            {/* Basic Info Section */}
            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <h2 className="text-sm font-mono text-cyan-500/70 uppercase tracking-widest mb-8 flex items-center gap-4">
                    Core Metadata
                    <div className="h-px bg-cyan-500/10 flex-grow" />
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Full Identification</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-700 font-bold"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Role Vectors</label>
                        <input
                            type="text"
                            name="roles"
                            value={formData.roles}
                            onChange={handleChange}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-700 font-mono text-sm"
                            required
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Professional Narrative</label>
                    <textarea
                        name="professionalSummary"
                        value={formData.professionalSummary}
                        onChange={handleChange}
                        rows="6"
                        className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-slate-300 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all placeholder:text-slate-700 leading-relaxed"
                        required
                    />
                </div>
            </div>

            {/* Skills Section */}
            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <div className="flex justify-between items-center mb-8 relative z-10">
                    <h2 className="text-sm font-mono text-green-500/70 uppercase tracking-widest flex items-center gap-4">
                        Skill Competencies
                        <div className="h-px w-20 bg-green-500/10" />
                    </h2>
                    <button
                        type="button"
                        onClick={addSkill}
                        className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 px-4 py-2 rounded-lg border border-green-500/20 hover:border-green-500/50 transition-all font-mono uppercase tracking-wide flex items-center gap-2"
                    >
                        + Add Node
                    </button>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, 'skills')}
                >
                    <SortableContext
                        items={formData.skills.map(s => s._id)}
                        strategy={rectSortingStrategy}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                            {formData.skills.map((skill, index) => (
                                <SortableItem key={skill._id} id={skill._id} className="bg-white/[0.02] p-4 rounded-xl border border-white/5 relative group hover:border-green-500/30 transition-colors">
                                    <button
                                        type="button"
                                        onClick={() => removeSkill(index)}
                                        className="absolute top-3 right-3 text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all z-20"
                                        title="Remove"
                                    >
                                        ✕
                                    </button>
                                    <div className="mb-4 flex items-center gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setActiveIconIndex(index)}
                                            className="w-12 h-12 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center hover:border-green-500/50 transition-colors group/icon shrink-0"
                                            title="Configure Icon"
                                        >
                                            {skill.icon ? (
                                                <div className="text-2xl text-slate-400 group-hover/icon:text-green-400 transition-colors">
                                                    <IconPreview name={skill.icon} />
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-slate-600 font-mono">ICON</span>
                                            )}
                                        </button>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={skill.name}
                                                onChange={(e) => handleSkillChange(index, 'name', e.target.value)}
                                                placeholder="Skill Identifier"
                                                className="w-full bg-transparent border-b border-white/10 focus:border-green-500/50 focus:outline-none text-slate-200 font-bold text-sm pb-1 transition-colors placeholder:text-slate-700"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-2 uppercase tracking-wider">
                                            <span>{getProficiencyLabel(skill.level)}</span>
                                            <span className="text-green-500/80">{skill.level}%</span>
                                        </div>
                                        <div className="relative h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={skill.level}
                                                onChange={(e) => handleSkillChange(index, 'level', parseInt(e.target.value))}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div
                                                className="h-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all duration-300"
                                                style={{ width: `${skill.level}%` }}
                                            />
                                        </div>
                                    </div>
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Experience Section */}
            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <div className="flex justify-between items-center mb-8 relative z-10">
                    <h2 className="text-sm font-mono text-orange-500/70 uppercase tracking-widest flex items-center gap-4">
                        Career Trajectory
                        <div className="h-px w-20 bg-orange-500/10" />
                    </h2>
                    <button
                        type="button"
                        onClick={addExperience}
                        className="text-xs bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 px-4 py-2 rounded-lg border border-orange-500/20 hover:border-orange-500/50 transition-all font-mono uppercase tracking-wide flex items-center gap-2"
                    >
                        + Add Event
                    </button>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, 'experiences')}
                >
                    <SortableContext
                        items={formData.experiences.map(e => e._id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-6 relative z-10">
                            {formData.experiences.map((exp, index) => (
                                <SortableItem key={exp._id} id={exp._id} className="bg-white/[0.02] p-8 rounded-xl border border-white/5 relative group hover:border-orange-500/30 transition-colors">
                                    <button
                                        type="button"
                                        onClick={() => removeExperience(index)}
                                        className="absolute top-4 right-4 text-xs font-mono uppercase tracking-wider text-red-400/50 hover:text-red-400 border border-red-500/10 hover:border-red-500/50 px-3 py-1 rounded transition-all opacity-0 group-hover:opacity-100 z-10"
                                    >
                                        Delete
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div>
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Organization</label>
                                            <input
                                                type="text"
                                                value={exp.company}
                                                onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-orange-500/50 outline-none text-sm font-bold"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Designation</label>
                                            <input
                                                type="text"
                                                value={exp.role}
                                                onChange={(e) => handleExperienceChange(index, 'role', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-orange-500/50 outline-none text-sm"
                                                required
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Timeline</label>
                                            <input
                                                type="text"
                                                value={exp.duration}
                                                onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-orange-500/50 outline-none text-sm font-mono"
                                                placeholder="e.g. 2020 - Present"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Responsibilities</label>
                                        <textarea
                                            value={exp.description}
                                            onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                                            rows="3"
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-slate-300 focus:border-orange-500/50 outline-none text-sm leading-relaxed"
                                            required
                                        />
                                    </div>
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Education Section */}
            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <div className="flex justify-between items-center mb-8 relative z-10">
                    <h2 className="text-sm font-mono text-purple-500/70 uppercase tracking-widest flex items-center gap-4">
                        Academic Records
                        <div className="h-px w-20 bg-purple-500/10" />
                    </h2>
                    <button
                        type="button"
                        onClick={addEducation}
                        className="text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 px-4 py-2 rounded-lg border border-purple-500/20 hover:border-purple-500/50 transition-all font-mono uppercase tracking-wide flex items-center gap-2"
                    >
                        + Add Record
                    </button>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, 'education')}
                >
                    <SortableContext
                        items={formData.education.map(e => e._id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-4 relative z-10">
                            {formData.education.map((edu, index) => (
                                <SortableItem key={edu._id} id={edu._id} className="bg-white/[0.02] p-6 rounded-xl border border-white/5 relative group hover:border-purple-500/30 transition-colors">
                                    <button
                                        type="button"
                                        onClick={() => removeEducation(index)}
                                        className="absolute top-3 right-3 text-white/20 hover:text-red-400 transition-colors z-20"
                                    >
                                        <div className="p-1">✕</div>
                                    </button>

                                    <div className="flex flex-wrap gap-4 items-end w-full pr-8">
                                        <div className="flex-1 min-w-[200px]">
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Institution</label>
                                            <input
                                                type="text"
                                                value={edu.institution}
                                                onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-purple-500/50 outline-none text-sm font-bold"
                                                required
                                            />
                                        </div>
                                        <div className="flex-1 min-w-[200px]">
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Degree / Major</label>
                                            <input
                                                type="text"
                                                value={edu.degree}
                                                onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-purple-500/50 outline-none text-sm"
                                                required
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Years</label>
                                            <input
                                                type="text"
                                                value={edu.duration}
                                                onChange={(e) => handleEducationChange(index, 'duration', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-purple-500/50 outline-none text-sm font-mono text-center"
                                                required
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Grade</label>
                                            <input
                                                type="text"
                                                value={edu.cgpa}
                                                onChange={(e) => handleEducationChange(index, 'cgpa', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-purple-400 focus:border-purple-500/50 outline-none text-sm font-mono text-center font-bold"
                                            />
                                        </div>
                                    </div>
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Certifications Section */}
            <div className="bg-[#0a0a0a]/60 backdrop-blur-xl rounded-2xl border border-white/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-[100px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />

                <div className="flex justify-between items-center mb-8 relative z-10">
                    <h2 className="text-sm font-mono text-yellow-500/70 uppercase tracking-widest flex items-center gap-4">
                        Credentials & Licenses
                        <div className="h-px w-20 bg-yellow-500/10" />
                    </h2>
                    <button
                        type="button"
                        onClick={addCertification}
                        className="text-xs bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 px-4 py-2 rounded-lg border border-yellow-500/20 hover:border-yellow-500/50 transition-all font-mono uppercase tracking-wide flex items-center gap-2"
                    >
                        + Add Credential
                    </button>
                </div>

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, 'certifications')}
                >
                    <SortableContext
                        items={formData.certifications.map(c => c._id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-4 relative z-10">
                            {formData.certifications.map((cert, index) => (
                                <SortableItem key={cert._id} id={cert._id} className="bg-white/[0.02] p-6 rounded-xl border border-white/5 relative group hover:border-yellow-500/30 transition-colors">
                                    <button
                                        type="button"
                                        onClick={() => removeCertification(index)}
                                        className="absolute top-3 right-3 text-white/20 hover:text-red-400 transition-colors z-20"
                                    >
                                        <div className="p-1">✕</div>
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                                        <div>
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">License Name</label>
                                            <input
                                                type="text"
                                                value={cert.name}
                                                onChange={(e) => handleCertificationChange(index, 'name', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-yellow-500/50 outline-none text-sm font-bold"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Issuing Authority</label>
                                            <input
                                                type="text"
                                                value={cert.issuer}
                                                onChange={(e) => handleCertificationChange(index, 'issuer', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-yellow-500/50 outline-none text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Date of Issue</label>
                                            <input
                                                type="text"
                                                value={cert.date}
                                                onChange={(e) => handleCertificationChange(index, 'date', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-yellow-500/50 outline-none text-sm font-mono"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Validation URL (Optional)</label>
                                            <input
                                                type="url"
                                                value={cert.url || ''}
                                                onChange={(e) => handleCertificationChange(index, 'url', e.target.value)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-yellow-500/50 outline-none text-sm font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-2">Associated Skills (Comma Separated)</label>
                                        <input
                                            type="text"
                                            value={Array.isArray(cert.skills) ? cert.skills.join(', ') : cert.skills || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const newCerts = [...formData.certifications];
                                                newCerts[index] = { ...newCerts[index], skills: val.split(',') };
                                                setFormData(prev => ({ ...prev, certifications: newCerts }));
                                            }}
                                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2.5 text-slate-200 focus:border-yellow-500/50 outline-none text-sm"
                                        />
                                    </div>
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
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
                    {saving ? 'UPDATING_MATRIX...' : 'CONFIRM_UPDATE'}
                </button>
            </div>
        </form>
    );
};

export default AboutForm;
