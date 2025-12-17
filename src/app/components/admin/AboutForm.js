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
        <form onSubmit={handleSubmit} className="space-y-12 max-w-4xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700 relative">
            {/* Icon Picker Modal */}
            {activeIconIndex !== null && (
                <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg border border-gray-700 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                            <h3 className="text-xl font-bold text-white">Select Icon</h3>
                            <button
                                type="button"
                                onClick={() => setActiveIconIndex(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Search icons (e.g. React, Android)..."
                            className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                            value={iconSearchTerm}
                            onChange={(e) => setIconSearchTerm(e.target.value)}
                            autoFocus
                        />
                        <div className="flex-1 overflow-y-auto grid grid-cols-4 sm:grid-cols-5 gap-2 min-h-[300px] content-start">
                            {filteredIcons.map(({ name, slug, isCdn }) => (
                                <button
                                    key={`${isCdn ? 'cdn' : 'local'}-${slug}`}
                                    type="button"
                                    onClick={() => {
                                        // For CDN icons, use the slug from the API, else use name
                                        const value = isCdn ? slug : name;
                                        handleSkillChange(activeIconIndex, 'icon', value);
                                        setActiveIconIndex(null);
                                        setIconSearchTerm('');
                                    }}
                                    className="p-3 rounded bg-gray-700/50 hover:bg-cyan-900/40 border border-transparent hover:border-cyan-500/50 flex flex-col items-center gap-2 transition-all aspect-square justify-center relative"
                                >
                                    <div className="text-3xl text-cyan-400 w-8 h-8 flex items-center justify-center">
                                        {isCdn ? (
                                            <img
                                                src={`https://cdn.simpleicons.org/${slug}/22d3ee`}
                                                alt={name}
                                                className="w-full h-full object-contain"
                                                onError={(e) => { e.target.style.opacity = '0.3'; }}
                                            />
                                        ) : (
                                            <IconPreview name={name} />
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-300 truncate w-full text-center">{name}</span>
                                    {isCdn && (
                                        <span className="absolute top-1 right-1 text-[8px] bg-cyan-900 text-cyan-300 px-1 rounded">
                                            WEB
                                        </span>
                                    )}
                                </button>
                            ))}

                            {/* Fallback for completely unknown terms (still allows typing custom slug) */}
                            {iconSearchTerm && filteredIcons.length === 0 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        // Normalize slug
                                        const slug = iconSearchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
                                        handleSkillChange(activeIconIndex, 'icon', slug);
                                        setActiveIconIndex(null);
                                        setIconSearchTerm('');
                                    }}
                                    className="p-3 rounded bg-gray-700/50 hover:bg-cyan-900/40 border border-dashed border-gray-500/50 hover:border-cyan-500 flex flex-col items-center gap-2 transition-all aspect-square justify-center relative group"
                                    title={`Use "${iconSearchTerm}" as custom slug`}
                                >
                                    <div className="text-3xl text-cyan-400 w-8 h-8 flex items-center justify-center relative">
                                        <img
                                            src={`https://cdn.simpleicons.org/${iconSearchTerm.toLowerCase().replace(/[^a-z0-9]/g, '')}/22d3ee`}
                                            alt={iconSearchTerm}
                                            className="w-full h-full object-contain"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.parentNode.innerHTML = '<span class="text-[10px] text-red-400">Not Found</span>';
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] text-cyan-200 truncate w-full text-center">
                                        Use &quot;{iconSearchTerm}&quot;
                                    </span>
                                </button>
                            )}

                            {filteredIcons.length === 0 && !iconSearchTerm && (
                                <div className="col-span-full text-center text-gray-500 py-8">
                                    Start typing to search 3000+ icons...
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
            <section className="space-y-6">
                <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-2">Basic Info</h2>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Name <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Roles (comma separated) <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        name="roles"
                        value={formData.roles}
                        onChange={handleChange}
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Professional Summary <span className="text-red-400">*</span></label>
                    <textarea
                        name="professionalSummary"
                        value={formData.professionalSummary}
                        onChange={handleChange}
                        rows="6"
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white"
                        required
                    />
                </div>
            </section>

            {/* Skills Section */}
            <section className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                    <h2 className="text-2xl font-bold text-white">Skills</h2>
                    <button
                        type="button"
                        onClick={addSkill}
                        className="text-sm bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 px-3 py-1 rounded transition-colors"
                    >
                        + Add Skill
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {formData.skills.map((skill, index) => (
                                <SortableItem key={skill._id} id={skill._id} className="bg-gray-700/30 p-4 rounded-lg border border-gray-700 relative group">
                                    <button
                                        type="button"
                                        onClick={() => removeSkill(index)}
                                        className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        title="Remove"
                                    >
                                        ✕
                                    </button>
                                    <div className="mb-2 flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setActiveIconIndex(index)}
                                            className="w-10 h-10 rounded bg-gray-800 border border-gray-600 flex items-center justify-center hover:border-cyan-400 transition-colors"
                                            title="Change Icon"
                                        >
                                            {skill.icon ? (
                                                <div className="text-2xl"><IconPreview name={skill.icon} /></div>
                                            ) : (
                                                <span className="text-xs text-gray-500">Icon</span>
                                            )}
                                        </button>
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={skill.name}
                                                onChange={(e) => handleSkillChange(index, 'name', e.target.value)}
                                                placeholder="Skill Name"
                                                className="w-full bg-transparent border-b border-gray-600 focus:border-cyan-400 focus:outline-none text-white font-medium pl-1"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                                            <span>{getProficiencyLabel(skill.level)}</span>
                                            <span>{skill.level}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={skill.level}
                                            onChange={(e) => handleSkillChange(index, 'level', parseInt(e.target.value))}
                                            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                        />
                                    </div>
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </section>

            {/* Experience Section */}
            <section className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                    <h2 className="text-2xl font-bold text-white">Experience</h2>
                    <button
                        type="button"
                        onClick={addExperience}
                        className="text-sm bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 px-3 py-1 rounded transition-colors"
                    >
                        + Add Experience
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
                        <div className="space-y-6">
                            {formData.experiences.map((exp, index) => (
                                <SortableItem key={exp._id} id={exp._id} className="bg-gray-700/30 p-6 rounded-lg border border-gray-700 relative">
                                    <button
                                        type="button"
                                        onClick={() => removeExperience(index)}
                                        className="absolute top-4 right-4 text-red-400 hover:text-red-300 z-10"
                                        title="Remove Experience"
                                    >
                                        Remove
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Company</label>
                                            <input
                                                type="text"
                                                value={exp.company}
                                                onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Role</label>
                                            <input
                                                type="text"
                                                value={exp.role}
                                                onChange={(e) => handleExperienceChange(index, 'role', e.target.value)}
                                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Duration</label>
                                            <input
                                                type="text"
                                                value={exp.duration}
                                                onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)}
                                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Description</label>
                                        <textarea
                                            value={exp.description}
                                            onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                                            rows="3"
                                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                            required
                                        />
                                    </div>
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </section>

            {/* Education Section */}
            <section className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                    <h2 className="text-2xl font-bold text-white">Education</h2>
                    <button
                        type="button"
                        onClick={addEducation}
                        className="text-sm bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 px-3 py-1 rounded transition-colors"
                    >
                        + Add Education
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
                        <div className="space-y-4">
                            {formData.education.map((edu, index) => (
                                <SortableItem key={edu._id} id={edu._id} className="bg-gray-700/30 p-4 rounded-lg border border-gray-700 relative">
                                    <div className="flex flex-wrap gap-4 items-end w-full">
                                        <button
                                            type="button"
                                            onClick={() => removeEducation(index)}
                                            className="absolute top-2 right-2 text-red-500 hover:text-red-400 text-lg leading-none z-10"
                                            title="Remove"
                                        >
                                            &times;
                                        </button>
                                        <div className="flex-1 min-w-[200px]">
                                            <label className="block text-xs text-gray-400 mb-1">Institution</label>
                                            <input
                                                type="text"
                                                value={edu.institution}
                                                onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                                required
                                            />
                                        </div>
                                        <div className="flex-1 min-w-[200px]">
                                            <label className="block text-xs text-gray-400 mb-1">Degree</label>
                                            <input
                                                type="text"
                                                value={edu.degree}
                                                onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                                required
                                            />
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-xs text-gray-400 mb-1">Duration</label>
                                            <input
                                                type="text"
                                                value={edu.duration}
                                                onChange={(e) => handleEducationChange(index, 'duration', e.target.value)}
                                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                                required
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs text-gray-400 mb-1">CGPA</label>
                                            <input
                                                type="text"
                                                value={edu.cgpa}
                                                onChange={(e) => handleEducationChange(index, 'cgpa', e.target.value)}
                                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </section>

            {/* Certifications Section */}
            <section className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                    <h2 className="text-2xl font-bold text-white">Certifications</h2>
                    <button
                        type="button"
                        onClick={addCertification}
                        className="text-sm bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 px-3 py-1 rounded transition-colors"
                    >
                        + Add Certification
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
                        <div className="space-y-4">
                            {formData.certifications.map((cert, index) => (
                                <SortableItem key={cert._id} id={cert._id} className="bg-gray-700/30 p-6 rounded-lg border border-gray-700 relative">
                                    <button
                                        type="button"
                                        onClick={() => removeCertification(index)}
                                        className="absolute top-4 right-4 text-red-400 hover:text-red-300 z-10"
                                        title="Remove"
                                    >
                                        Remove
                                    </button>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Certification Name</label>
                                            <input
                                                type="text"
                                                value={cert.name}
                                                onChange={(e) => handleCertificationChange(index, 'name', e.target.value)}
                                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Issuer</label>
                                            <input
                                                type="text"
                                                value={cert.issuer}
                                                onChange={(e) => handleCertificationChange(index, 'issuer', e.target.value)}
                                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">Date</label>
                                            <input
                                                type="text"
                                                value={cert.date}
                                                onChange={(e) => handleCertificationChange(index, 'date', e.target.value)}
                                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-400 mb-1">URL (Optional)</label>
                                            <input
                                                type="url"
                                                value={cert.url || ''}
                                                onChange={(e) => handleCertificationChange(index, 'url', e.target.value)}
                                                className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-400 mb-1">Skills (Comma separated)</label>
                                        <input
                                            type="text"
                                            value={cert.skills ? cert.skills.join(', ') : ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const newCerts = [...formData.certifications];
                                                // Temporarily store string to allow typing, but schema needs array. 
                                                // Splitting here works for standard comma-separated input.
                                                // For more robust handling we might need a separate component or state, but this fits the existing pattern.
                                                newCerts[index] = { ...newCerts[index], skills: val.split(',') };
                                                setFormData(prev => ({ ...prev, certifications: newCerts }));
                                            }}
                                            className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                        />
                                    </div>
                                </SortableItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </section>

            <div className="flex justify-end gap-4 pt-8 border-t border-gray-700 sticky bottom-0 bg-gray-800 pb-4">
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
                    className="px-6 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-colors disabled:opacity-50 shadow-lg shadow-cyan-500/20"
                >
                    {saving ? 'Saving...' : 'Update Entire Profile'}
                </button>
            </div>
        </form>
    );
};

export default AboutForm;
