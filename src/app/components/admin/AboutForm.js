"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/about');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData({
                        ...data,
                        roles: data.roles ? data.roles.join(', ') : '',
                        skills: data.skills || [],
                        experiences: data.experiences || [],
                        education: data.education || [],
                        certifications: data.certifications || [],
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

    // --- Skills Handlers ---
    const handleSkillChange = (index, field, value) => {
        const newSkills = [...formData.skills];
        newSkills[index] = { ...newSkills[index], [field]: value };
        setFormData((prev) => ({ ...prev, skills: newSkills }));
    };

    const addSkill = () => {
        setFormData((prev) => ({
            ...prev,
            skills: [...prev.skills, { name: '', level: 50 }],
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
            experiences: [...prev.experiences, { company: '', role: '', duration: '', description: '' }],
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
            education: [...prev.education, { institution: '', degree: '', duration: '', cgpa: '' }],
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
            certifications: [...prev.certifications, { name: '', issuer: '', date: '', url: '', skills: [] }],
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
        <form onSubmit={handleSubmit} className="space-y-12 max-w-4xl mx-auto bg-gray-800 p-8 rounded-xl border border-gray-700">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {formData.skills.map((skill, index) => (
                        <div key={index} className="bg-gray-700/30 p-4 rounded-lg border border-gray-700 relative group">
                            <button
                                type="button"
                                onClick={() => removeSkill(index)}
                                className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove"
                            >
                                ✕
                            </button>
                            <div className="mb-2">
                                <input
                                    type="text"
                                    value={skill.name}
                                    onChange={(e) => handleSkillChange(index, 'name', e.target.value)}
                                    placeholder="Skill Name"
                                    className="w-full bg-transparent border-b border-gray-600 focus:border-cyan-400 focus:outline-none text-white font-medium"
                                    required
                                />
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
                        </div>
                    ))}
                </div>
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

                <div className="space-y-6">
                    {formData.experiences.map((exp, index) => (
                        <div key={index} className="bg-gray-700/30 p-6 rounded-lg border border-gray-700 relative">
                            <button
                                type="button"
                                onClick={() => removeExperience(index)}
                                className="absolute top-4 right-4 text-red-400 hover:text-red-300"
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
                        </div>
                    ))}
                </div>
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

                <div className="space-y-4">
                    {formData.education.map((edu, index) => (
                        <div key={index} className="bg-gray-700/30 p-4 rounded-lg border border-gray-700 relative flex flex-wrap gap-4 items-end">
                            <button
                                type="button"
                                onClick={() => removeEducation(index)}
                                className="absolute top-2 right-2 text-red-500 hover:text-red-400 text-lg leading-none"
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
                    ))}
                </div>
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

                <div className="space-y-4">
                    {formData.certifications.map((cert, index) => (
                        <div key={index} className="bg-gray-700/30 p-6 rounded-lg border border-gray-700 relative">
                            <button
                                type="button"
                                onClick={() => removeCertification(index)}
                                className="absolute top-4 right-4 text-red-400 hover:text-red-300"
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
                                        // Pass raw string to handler which splits it
                                        const newCertifications = [...formData.certifications];
                                        const skillsArray = e.target.value.split(',').map(s => s); // keep spaces while typing
                                        // logic here needs to be careful about not splitting mid-typing if we use array in state
                                        // Better approach: keep local string state or handle split in the main handler but maybe on blur.
                                        // For simplicity: just use the handler I defined which splits immediately, 
                                        // BUT that breaks typing "A, " -> "A", "" -> "A", " " 
                                        // Actually, my handleCertificationChange splits every time. 
                                        // To fix typing issues, I should probably store it as string in state?
                                        // Let's just store simple string in state for skills during edit?
                                        // Wait, the state structure for certifications.skills is [String].
                                        // If I split on every change, I can't type "React, N".
                                        // FIX: Use a separate handler or just do it inline here simpler.

                                        // Simplified approach: Update ONLY the specific field as array? No, simpler to just store as array.
                                        // Let's change handleCertificationChange to NOT split automatically, and handle it here.
                                        // Actually, let's just use a string input and split only on Submit?
                                        // But the Schema expects array. 
                                        // Let's adjust state to hold it as array, but input displays/edits as string.
                                        // The input value is `cert.skills.join(', ')`. 
                                        // If I type, I want to update the array.
                                        // `value.split(',')` works.

                                        const val = e.target.value;
                                        const newCerts = [...formData.certifications];
                                        newCerts[index] = { ...newCerts[index], skills: val.split(',') };
                                        setFormData(prev => ({ ...prev, certifications: newCerts }));
                                    }}
                                    className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none text-white text-sm"
                                />
                            </div>
                        </div>
                    ))}
                </div>
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
