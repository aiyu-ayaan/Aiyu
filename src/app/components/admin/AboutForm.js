"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getIconNames, IconList } from '@/lib/iconLibrary';
import {
    FaFloppyDisk,
    FaGripVertical,
    FaPlus,
    FaSpinner,
    FaTrash,
    FaWandMagicSparkles,
    FaXmark,
} from 'react-icons/fa6';
import DatePickerInput from './DatePickerInput';
import { Badge, EmptyState, Field, Loading, Panel } from './ui';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import '@/app/styles/admin-showcase.css';

const SECTIONS = [
    { id: 'about-bio', label: 'Bio & summary' },
    { id: 'about-skills', label: 'Skills', countKey: 'skills' },
    { id: 'about-experience', label: 'Experience', countKey: 'experiences' },
    { id: 'about-education', label: 'Education', countKey: 'education' },
    { id: 'about-certifications', label: 'Certifications', countKey: 'certifications' },
];

const IconPreview = ({ name }) => {
    const Icon = IconList[name];
    if (Icon) return <Icon className="h-5 w-5 text-[var(--adm-accent-ink)]" />;

    if (name) {
        return (
            <img
                src={`https://cdn.simpleicons.org/${name.toLowerCase().replace(/[^a-z0-9]/g, '')}/22d3ee`}
                alt={name}
                className="h-5 w-5 object-contain"
                loading="lazy"
                decoding="async"
                onError={(e) => { e.target.style.display = 'none'; }}
            />
        );
    }

    return <span className="font-mono text-xs text-[var(--adm-hint)]">?</span>;
};

function SortableRecord({ id, title, badge, onRemove, removeLabel = 'Delete item', children }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.55 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="adm-sc-item">
            <div className="adm-sc-item-head">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="adm-icon-btn adm-sc-drag"
                    title="Reorder"
                    aria-label={`Reorder ${title}`}
                >
                    <FaGripVertical aria-hidden="true" />
                </button>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--text-bright)]">
                    {title}
                </span>
                {badge}
                {onRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="adm-icon-btn"
                        title={removeLabel}
                        aria-label={removeLabel}
                    >
                        <FaTrash aria-hidden="true" />
                    </button>
                )}
            </div>
            <div className="adm-sc-item-body">
                {children}
            </div>
        </div>
    );
}

const AboutForm = () => {
    const router = useRouter();
    const { toast } = useAdminFeedback();
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
    const [aiEnabled, setAiEnabled] = useState(false);
    const [aiGenerating, setAiGenerating] = useState(null); // ID or 'summary' or 'skills'

    // Icon Picker State
    const [iconSearchTerm, setIconSearchTerm] = useState('');
    const [activeIconIndex, setActiveIconIndex] = useState(null);
    const [allCdnIcons, setAllCdnIcons] = useState([]);
    const availableIcons = getIconNames();

    useEffect(() => {
        const fetchIcons = async () => {
            try {
                const res = await fetch('/api/admin/icons');
                if (!res.ok) throw new Error(`icons request failed: ${res.status}`);
                const data = await res.json();
                if (Array.isArray(data?.icons)) {
                    setAllCdnIcons(data.icons);
                }
            } catch (err) {
                console.error("Failed to load icon library:", err);
            }
        };
        fetchIcons();
        fetchData();
        checkAiConfig();
    }, []);

    const checkAiConfig = async () => {
        try {
            const res = await fetch('/api/admin/ai/config');
            const data = await res.json();
            if (data.success && data.data) {
                setAiEnabled(data.data.enabled);
            }
        } catch (error) {
            console.error('Failed to fetch AI config:', error);
        }
    };

    const handleAiAction = async (mode, contextData = {}) => {
        if (aiGenerating) return;
        setAiGenerating(mode === 'experience' ? contextData.id : mode);

        try {
            let prompt = '';
            let context = {};
            let apiMode = 'proofread';

            if (mode === 'summary') {
                prompt = formData.professionalSummary;
                apiMode = 'refine_summary';
            } else if (mode === 'skills') {
                prompt = formData.experiences.map(e => e.description).join('\n');
                context = { summary: formData.professionalSummary };
                apiMode = 'suggest_skills';
            } else if (mode === 'experience') {
                prompt = contextData.description;
                context = { company: contextData.company, role: contextData.role };
                apiMode = 'refine_experience';
            }

            const res = await fetch('/api/admin/ai/text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: apiMode,
                    prompt,
                    context
                })
            });

            const data = await res.json();

            if (data.success) {
                if (mode === 'summary') {
                    setFormData(prev => ({ ...prev, professionalSummary: data.data }));
                    showNotification(true, 'Summary refined');
                } else if (mode === 'skills') {
                    const skillNames = data.data.split(',').map(s => s.trim());
                    const newSkills = skillNames.map(name => ({
                        _id: `ai-${Math.random().toString(36).substr(2, 9)}`,
                        name,
                        level: 70,
                        icon: ''
                    }));
                    setFormData(prev => ({
                        ...prev,
                        skills: [...newSkills, ...prev.skills]
                    }));
                    showNotification(true, 'Suggested skills added');
                } else if (mode === 'experience') {
                    const newExperiences = formData.experiences.map(exp =>
                        exp._id === contextData.id ? { ...exp, description: data.data } : exp
                    );
                    setFormData(prev => ({ ...prev, experiences: newExperiences }));
                    showNotification(true, 'Experience description refined');
                }
            } else {
                showNotification(false, data.error || 'AI generation failed');
            }
        } catch (error) {
            console.error('AI Error:', error);
            showNotification(false, 'Could not reach the AI service');
        } finally {
            setAiGenerating(null);
        }
    };

    const getFilteredIcons = () => {
        const normalizedLocal = availableIcons.map(name => ({
            name,
            slug: name,
            isCdn: false
        }));

        if (!iconSearchTerm) return normalizedLocal.slice(0, 50);

        const term = iconSearchTerm.toLowerCase();

        const localMatches = normalizedLocal.filter(icon =>
            icon.name.toLowerCase().includes(term)
        );

        const cdnMatches = (allCdnIcons || [])
            .filter(icon => icon.title.toLowerCase().includes(term))
            .map(icon => ({
                name: icon.title,
                slug: icon.slug,
                isCdn: true
            }))
            .filter(cdnIcon => !localMatches.some(local => local.name === cdnIcon.name));

        return [...localMatches, ...cdnMatches].slice(0, 50);
    };

    const filteredIcons = getFilteredIcons();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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

    const showNotification = (success, message) => {
        if (success) toast.success(message);
        else toast.error(message);
    };

    const handleDragEnd = (event, listKey) => {
        const { active, over } = event;
        if (!over) return;

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
            skills: [{ _id: `temp-${Date.now()}`, name: '', level: 50, icon: '' }, ...prev.skills],
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
            experiences: [{ _id: `temp-${Date.now()}`, company: '', role: '', duration: '', description: '' }, ...prev.experiences],
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
            education: [{ _id: `temp-${Date.now()}`, institution: '', degree: '', duration: '', cgpa: '' }, ...prev.education],
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
            value = value.split(',').map(s => s.trim());
        }
        newCertifications[index] = { ...newCertifications[index], [field]: value };
        setFormData((prev) => ({ ...prev, certifications: newCertifications }));
    };

    const addCertification = () => {
        setFormData((prev) => ({
            ...prev,
            certifications: [{ _id: `temp-${Date.now()}`, name: '', issuer: '', date: '', url: '', skills: [] }, ...prev.certifications],
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
                showNotification(true, 'About page saved');
                fetchData();
            } else {
                const data = await response.json();
                setError(data.error || 'Something went wrong');
                showNotification(false, data.error || 'Failed to update');
            }
        } catch {
            setError('An error occurred');
            showNotification(false, 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <Panel><Loading label="Loading about page" rows={6} /></Panel>;
    }

    return (
        <form onSubmit={handleSubmit} className="adm-sc-root adm-sc-split">
            {activeIconIndex !== null && (
                <div className="adm-overlay" role="dialog" aria-modal="true" aria-labelledby="icon-picker-title">
                    <div className="adm-dialog !max-w-2xl">
                        <header className="adm-panel-head">
                            <h3 id="icon-picker-title" className="adm-panel-title">Choose skill icon</h3>
                            <button
                                type="button"
                                onClick={() => setActiveIconIndex(null)}
                                className="adm-icon-btn"
                                aria-label="Close icon picker"
                            >
                                <FaXmark aria-hidden="true" />
                            </button>
                        </header>
                        <div className="adm-panel-body space-y-4">
                            <Field label="Search icons">
                                <input
                                    type="text"
                                    placeholder="Type a technology name (e.g. React, Rust, Docker)…"
                                    className="adm-input"
                                    value={iconSearchTerm}
                                    onChange={(e) => setIconSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </Field>

                            <div className="grid max-h-[22rem] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5">
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
                                        className="adm-sc-choice flex-col items-center justify-center text-center"
                                    >
                                        <span className="flex h-7 w-7 items-center justify-center">
                                            {isCdn ? (
                                                <img
                                                    src={`https://cdn.simpleicons.org/${slug}/22d3ee`}
                                                    alt={name}
                                                    className="h-5 w-5 object-contain"
                                                    loading="lazy"
                                                    decoding="async"
                                                    onError={(e) => { e.target.style.opacity = '0.3'; }}
                                                />
                                            ) : (
                                                <IconPreview name={name} />
                                            )}
                                        </span>
                                        <span className="w-full truncate font-mono text-xs text-[var(--text-secondary)]">
                                            {name}
                                        </span>
                                    </button>
                                ))}

                                {iconSearchTerm && filteredIcons.length === 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const slug = iconSearchTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
                                            handleSkillChange(activeIconIndex, 'icon', slug);
                                            setActiveIconIndex(null);
                                            setIconSearchTerm('');
                                        }}
                                        className="adm-sc-choice col-span-full items-center justify-center"
                                    >
                                        <span className="font-mono text-xs">Use &quot;{iconSearchTerm}&quot;</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="adm-sc-col">
                {error && <div role="alert" className="adm-notice adm-notice-error">{error}</div>}

                <Panel id="about-bio" title="Bio & summary" className="adm-sc-anchor">
                    <div className="space-y-4">
                        <div className="adm-sc-fields">
                            <Field label="Full name">
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="adm-input"
                                    required
                                />
                            </Field>

                            <Field label="Roles" help="Comma-separated roles.">
                                <input
                                    type="text"
                                    name="roles"
                                    value={formData.roles}
                                    onChange={handleChange}
                                    className="adm-input"
                                    required
                                />
                            </Field>
                        </div>

                        <div className="adm-field">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <label htmlFor="about-summary-input" className="adm-label">Professional summary</label>
                                {aiEnabled && (
                                    <button
                                        type="button"
                                        onClick={() => handleAiAction('summary')}
                                        disabled={aiGenerating === 'summary' || !formData.professionalSummary}
                                        className="adm-btn adm-btn-quiet"
                                    >
                                        {aiGenerating === 'summary' ? (
                                            <FaSpinner className="animate-spin" aria-hidden="true" />
                                        ) : (
                                            <FaWandMagicSparkles aria-hidden="true" />
                                        )}
                                        Refine summary
                                    </button>
                                )}
                            </div>
                            <textarea
                                id="about-summary-input"
                                name="professionalSummary"
                                value={formData.professionalSummary}
                                onChange={handleChange}
                                rows={5}
                                className="adm-input"
                                required
                            />
                        </div>
                    </div>
                </Panel>

                <Panel
                    id="about-skills"
                    title="Skills"
                    className="adm-sc-anchor"
                    actions={
                        <>
                            {aiEnabled && (
                                <button
                                    type="button"
                                    onClick={() => handleAiAction('skills')}
                                    disabled={aiGenerating === 'skills' || formData.experiences.length === 0}
                                    className="adm-btn"
                                >
                                    {aiGenerating === 'skills' ? (
                                        <FaSpinner className="animate-spin" aria-hidden="true" />
                                    ) : (
                                        <FaWandMagicSparkles aria-hidden="true" />
                                    )}
                                    Suggest skills
                                </button>
                            )}
                            <button type="button" onClick={addSkill} className="adm-btn">
                                <FaPlus aria-hidden="true" /> Add skill
                            </button>
                        </>
                    }
                >
                    {formData.skills.length === 0 ? (
                        <EmptyState
                            title="No skills added yet"
                            description="Add technologies and tools to display on your about page."
                            action={
                                <button type="button" onClick={addSkill} className="adm-btn">
                                    <FaPlus aria-hidden="true" /> Add first skill
                                </button>
                            }
                        />
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(e, 'skills')}
                        >
                            <SortableContext
                                items={formData.skills.map(s => s._id)}
                                strategy={rectSortingStrategy}
                            >
                                <div className="adm-sc-fields">
                                    {formData.skills.map((skill, index) => (
                                        <SortableRecord
                                            key={skill._id}
                                            id={skill._id}
                                            title={skill.name || `Skill ${index + 1}`}
                                            badge={<Badge>{getProficiencyLabel(skill.level)} · {skill.level}%</Badge>}
                                            onRemove={() => removeSkill(index)}
                                            removeLabel={`Remove ${skill.name || `skill ${index + 1}`}`}
                                        >
                                            <div className="flex items-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveIconIndex(index)}
                                                    className="adm-btn h-10 w-10 !p-0"
                                                    title="Choose icon"
                                                    aria-label={`Choose icon for ${skill.name || `skill ${index + 1}`}`}
                                                >
                                                    {skill.icon ? (
                                                        <IconPreview name={skill.icon} />
                                                    ) : (
                                                        <span className="font-mono text-xs text-[var(--adm-hint)]">Icon</span>
                                                    )}
                                                </button>
                                                <Field className="flex-1" label="Skill name">
                                                    <input
                                                        type="text"
                                                        value={skill.name}
                                                        onChange={(e) => handleSkillChange(index, 'name', e.target.value)}
                                                        placeholder="e.g. TypeScript"
                                                        className="adm-input"
                                                        required
                                                    />
                                                </Field>
                                            </div>
                                            <Field label={`Proficiency (${skill.level}%)`}>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={skill.level}
                                                    onChange={(e) => handleSkillChange(index, 'level', parseInt(e.target.value, 10))}
                                                    className="w-full accent-[var(--accent-cyan)]"
                                                />
                                            </Field>
                                        </SortableRecord>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </Panel>

                <Panel
                    id="about-experience"
                    title="Experience"
                    className="adm-sc-anchor"
                    actions={
                        <button type="button" onClick={addExperience} className="adm-btn">
                            <FaPlus aria-hidden="true" /> Add role
                        </button>
                    }
                >
                    {formData.experiences.length === 0 ? (
                        <EmptyState
                            title="No work experience listed"
                            description="Add your roles and responsibilities."
                            action={
                                <button type="button" onClick={addExperience} className="adm-btn">
                                    <FaPlus aria-hidden="true" /> Add first role
                                </button>
                            }
                        />
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(e, 'experiences')}
                        >
                            <SortableContext
                                items={formData.experiences.map(e => e._id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {formData.experiences.map((exp, index) => (
                                        <SortableRecord
                                            key={exp._id}
                                            id={exp._id}
                                            title={exp.role || exp.company ? `${exp.role || 'Role'} · ${exp.company || 'Company'}` : `Experience ${index + 1}`}
                                            badge={exp.duration ? <Badge>{exp.duration}</Badge> : null}
                                            onRemove={() => removeExperience(index)}
                                            removeLabel={`Delete experience ${index + 1}`}
                                        >
                                            <div className="adm-sc-fields">
                                                <Field label="Company or organization">
                                                    <input
                                                        type="text"
                                                        value={exp.company}
                                                        onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                                                        className="adm-input"
                                                        required
                                                    />
                                                </Field>
                                                <Field label="Role title">
                                                    <input
                                                        type="text"
                                                        value={exp.role}
                                                        onChange={(e) => handleExperienceChange(index, 'role', e.target.value)}
                                                        className="adm-input"
                                                        required
                                                    />
                                                </Field>
                                            </div>

                                            <div className="adm-field">
                                                <label className="adm-label">Dates</label>
                                                <DatePickerInput
                                                    value={exp.duration}
                                                    onChange={(val) => handleExperienceChange(index, 'duration', val)}
                                                    mode="range"
                                                    placeholder="e.g. Jun 2025 - Present"
                                                    required
                                                />
                                            </div>

                                            <div className="adm-field">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <label htmlFor={`exp-desc-${exp._id}`} className="adm-label">Responsibilities</label>
                                                    {aiEnabled && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleAiAction('experience', { id: exp._id, description: exp.description, company: exp.company, role: exp.role })}
                                                            disabled={aiGenerating === exp._id || !exp.description}
                                                            className="adm-btn adm-btn-quiet"
                                                        >
                                                            {aiGenerating === exp._id ? (
                                                                <FaSpinner className="animate-spin" aria-hidden="true" />
                                                            ) : (
                                                                <FaWandMagicSparkles aria-hidden="true" />
                                                            )}
                                                            Refine description
                                                        </button>
                                                    )}
                                                </div>
                                                <textarea
                                                    id={`exp-desc-${exp._id}`}
                                                    value={exp.description}
                                                    onChange={(e) => handleExperienceChange(index, 'description', e.target.value)}
                                                    rows={3}
                                                    className="adm-input"
                                                    required
                                                />
                                            </div>
                                        </SortableRecord>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </Panel>

                <Panel
                    id="about-education"
                    title="Education"
                    className="adm-sc-anchor"
                    actions={
                        <button type="button" onClick={addEducation} className="adm-btn">
                            <FaPlus aria-hidden="true" /> Add education
                        </button>
                    }
                >
                    {formData.education.length === 0 ? (
                        <EmptyState
                            title="No education records yet"
                            description="Add degrees, schools, and graduation years."
                            action={
                                <button type="button" onClick={addEducation} className="adm-btn">
                                    <FaPlus aria-hidden="true" /> Add first education record
                                </button>
                            }
                        />
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(e, 'education')}
                        >
                            <SortableContext
                                items={formData.education.map(e => e._id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {formData.education.map((edu, index) => (
                                        <SortableRecord
                                            key={edu._id}
                                            id={edu._id}
                                            title={edu.degree || edu.institution ? `${edu.degree || 'Degree'} · ${edu.institution || 'Institution'}` : `Education ${index + 1}`}
                                            badge={edu.cgpa ? <Badge>{edu.cgpa}</Badge> : null}
                                            onRemove={() => removeEducation(index)}
                                            removeLabel={`Delete education ${index + 1}`}
                                        >
                                            <div className="adm-sc-fields">
                                                <Field label="Institution">
                                                    <input
                                                        type="text"
                                                        value={edu.institution}
                                                        onChange={(e) => handleEducationChange(index, 'institution', e.target.value)}
                                                        className="adm-input"
                                                        required
                                                    />
                                                </Field>
                                                <Field label="Degree or major">
                                                    <input
                                                        type="text"
                                                        value={edu.degree}
                                                        onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                                                        className="adm-input"
                                                        required
                                                    />
                                                </Field>
                                            </div>
                                            <div className="adm-sc-fields">
                                                <div className="adm-field">
                                                    <label className="adm-label">Years</label>
                                                    <DatePickerInput
                                                        value={edu.duration}
                                                        onChange={(val) => handleEducationChange(index, 'duration', val)}
                                                        mode="range"
                                                        placeholder="e.g. Aug 2023 - May 2025"
                                                        required
                                                    />
                                                </div>
                                                <Field label="Grade or CGPA">
                                                    <input
                                                        type="text"
                                                        value={edu.cgpa}
                                                        onChange={(e) => handleEducationChange(index, 'cgpa', e.target.value)}
                                                        className="adm-input font-mono"
                                                    />
                                                </Field>
                                            </div>
                                        </SortableRecord>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </Panel>

                <Panel
                    id="about-certifications"
                    title="Certifications"
                    className="adm-sc-anchor"
                    actions={
                        <button type="button" onClick={addCertification} className="adm-btn">
                            <FaPlus aria-hidden="true" /> Add certification
                        </button>
                    }
                >
                    {formData.certifications.length === 0 ? (
                        <EmptyState
                            title="No certifications listed"
                            description="Add licenses, certificates, and verification links."
                            action={
                                <button type="button" onClick={addCertification} className="adm-btn">
                                    <FaPlus aria-hidden="true" /> Add first certification
                                </button>
                            }
                        />
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(e) => handleDragEnd(e, 'certifications')}
                        >
                            <SortableContext
                                items={formData.certifications.map(c => c._id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {formData.certifications.map((cert, index) => (
                                        <SortableRecord
                                            key={cert._id}
                                            id={cert._id}
                                            title={cert.name || `Certification ${index + 1}`}
                                            badge={cert.issuer ? <Badge>{cert.issuer}</Badge> : null}
                                            onRemove={() => removeCertification(index)}
                                            removeLabel={`Delete certification ${index + 1}`}
                                        >
                                            <div className="adm-sc-fields">
                                                <Field label="Certification name">
                                                    <input
                                                        type="text"
                                                        value={cert.name}
                                                        onChange={(e) => handleCertificationChange(index, 'name', e.target.value)}
                                                        className="adm-input"
                                                        required
                                                    />
                                                </Field>
                                                <Field label="Issuing organization">
                                                    <input
                                                        type="text"
                                                        value={cert.issuer}
                                                        onChange={(e) => handleCertificationChange(index, 'issuer', e.target.value)}
                                                        className="adm-input"
                                                        required
                                                    />
                                                </Field>
                                            </div>
                                            <div className="adm-sc-fields">
                                                <div className="adm-field">
                                                    <label className="adm-label">Issue date</label>
                                                    <DatePickerInput
                                                        value={cert.date}
                                                        onChange={(val) => handleCertificationChange(index, 'date', val)}
                                                        mode="single"
                                                        placeholder="e.g. July 2026"
                                                        required
                                                    />
                                                </div>
                                                <Field label="Verification URL (optional)">
                                                    <input
                                                        type="url"
                                                        value={cert.url || ''}
                                                        onChange={(e) => handleCertificationChange(index, 'url', e.target.value)}
                                                        className="adm-input font-mono"
                                                    />
                                                </Field>
                                            </div>
                                            <Field label="Associated skills" help="Comma-separated list of skills covered.">
                                                <input
                                                    type="text"
                                                    value={Array.isArray(cert.skills) ? cert.skills.join(', ') : cert.skills || ''}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const newCerts = [...formData.certifications];
                                                        newCerts[index] = { ...newCerts[index], skills: val.split(',') };
                                                        setFormData(prev => ({ ...prev, certifications: newCerts }));
                                                    }}
                                                    className="adm-input"
                                                />
                                            </Field>
                                        </SortableRecord>
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    )}
                </Panel>
            </div>

            <aside className="adm-sc-aside">
                <Panel title="Publish" className="adm-sc-save">
                    <p className="adm-help mb-4">Save changes to update your public about page.</p>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="adm-btn adm-btn-primary flex-1"
                        >
                            {saving ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                            {saving ? 'Saving' : 'Save changes'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="adm-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </Panel>

                <Panel title="On this page" flush>
                    <nav aria-label="About sections">
                        <ul className="adm-list">
                            {SECTIONS.map((s) => (
                                <li key={s.id}>
                                    <a href={`#${s.id}`} className="adm-row justify-between">
                                        <span>{s.label}</span>
                                        {s.countKey && (
                                            <Badge>{formData[s.countKey]?.length || 0}</Badge>
                                        )}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </Panel>

                <Panel title="Related" flush>
                    <ul className="adm-list">
                        <li>
                            <Link href="/admin/resume" className="adm-row adm-link">
                                Resume studio
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/projects" className="adm-row adm-link">
                                Projects portfolio
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/home" className="adm-row adm-link">
                                Home page hero
                            </Link>
                        </li>
                    </ul>
                </Panel>
            </aside>

        </form>
    );
};

export default AboutForm;
