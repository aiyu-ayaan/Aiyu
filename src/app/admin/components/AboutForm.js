"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function AboutForm({ data, onSave, saving }) {
  const [formData, setFormData] = useState({
    name: '',
    roles: [],
    professionalSummary: '',
    skills: [],
    experiences: [],
    education: [],
    certifications: [],
  });

  const [newRole, setNewRole] = useState('');
  const [editingSkill, setEditingSkill] = useState(null);
  const [editingExperience, setEditingExperience] = useState(null);
  const [editingEducation, setEditingEducation] = useState(null);
  const [editingCertification, setEditingCertification] = useState(null);

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        roles: data.roles || [],
        professionalSummary: data.professionalSummary || '',
        skills: data.skills || [],
        experiences: data.experiences || [],
        education: data.education || [],
        certifications: data.certifications || [],
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const addRole = () => {
    if (newRole.trim()) {
      setFormData({ ...formData, roles: [...formData.roles, newRole.trim()] });
      setNewRole('');
    }
  };

  const removeRole = (index) => {
    setFormData({
      ...formData,
      roles: formData.roles.filter((_, i) => i !== index),
    });
  };

  const addSkill = () => {
    setEditingSkill({ name: '', level: 50 });
  };

  const saveSkill = () => {
    if (editingSkill && editingSkill.name.trim()) {
      if (editingSkill.index !== undefined) {
        const updated = [...formData.skills];
        updated[editingSkill.index] = { name: editingSkill.name, level: editingSkill.level };
        setFormData({ ...formData, skills: updated });
      } else {
        setFormData({
          ...formData,
          skills: [...formData.skills, { name: editingSkill.name, level: editingSkill.level }],
        });
      }
      setEditingSkill(null);
    }
  };

  const editSkill = (index) => {
    setEditingSkill({ ...formData.skills[index], index });
  };

  const removeSkill = (index) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index),
    });
  };

  const addExperience = () => {
    setEditingExperience({ company: '', role: '', duration: '', description: '' });
  };

  const saveExperience = () => {
    if (editingExperience && editingExperience.company.trim()) {
      if (editingExperience.index !== undefined) {
        const updated = [...formData.experiences];
        updated[editingExperience.index] = {
          company: editingExperience.company,
          role: editingExperience.role,
          duration: editingExperience.duration,
          description: editingExperience.description,
        };
        setFormData({ ...formData, experiences: updated });
      } else {
        setFormData({
          ...formData,
          experiences: [...formData.experiences, {
            company: editingExperience.company,
            role: editingExperience.role,
            duration: editingExperience.duration,
            description: editingExperience.description,
          }],
        });
      }
      setEditingExperience(null);
    }
  };

  const editExperience = (index) => {
    setEditingExperience({ ...formData.experiences[index], index });
  };

  const removeExperience = (index) => {
    setFormData({
      ...formData,
      experiences: formData.experiences.filter((_, i) => i !== index),
    });
  };

  const addEducation = () => {
    setEditingEducation({ institution: '', degree: '', duration: '', cgpa: '' });
  };

  const saveEducation = () => {
    if (editingEducation && editingEducation.institution.trim()) {
      if (editingEducation.index !== undefined) {
        const updated = [...formData.education];
        updated[editingEducation.index] = {
          institution: editingEducation.institution,
          degree: editingEducation.degree,
          duration: editingEducation.duration,
          cgpa: editingEducation.cgpa,
        };
        setFormData({ ...formData, education: updated });
      } else {
        setFormData({
          ...formData,
          education: [...formData.education, {
            institution: editingEducation.institution,
            degree: editingEducation.degree,
            duration: editingEducation.duration,
            cgpa: editingEducation.cgpa,
          }],
        });
      }
      setEditingEducation(null);
    }
  };

  const editEducation = (index) => {
    setEditingEducation({ ...formData.education[index], index });
  };

  const removeEducation = (index) => {
    setFormData({
      ...formData,
      education: formData.education.filter((_, i) => i !== index),
    });
  };

  const addCertification = () => {
    setEditingCertification({ name: '', issuer: '', date: '', url: '', skills: [] });
  };

  const saveCertification = () => {
    if (editingCertification && editingCertification.name.trim()) {
      if (editingCertification.index !== undefined) {
        const updated = [...formData.certifications];
        updated[editingCertification.index] = {
          name: editingCertification.name,
          issuer: editingCertification.issuer,
          date: editingCertification.date,
          url: editingCertification.url,
          skills: editingCertification.skills,
        };
        setFormData({ ...formData, certifications: updated });
      } else {
        setFormData({
          ...formData,
          certifications: [...formData.certifications, {
            name: editingCertification.name,
            issuer: editingCertification.issuer,
            date: editingCertification.date,
            url: editingCertification.url,
            skills: editingCertification.skills,
          }],
        });
      }
      setEditingCertification(null);
    }
  };

  const editCertification = (index) => {
    setEditingCertification({ ...formData.certifications[index], index });
  };

  const removeCertification = (index) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter((_, i) => i !== index),
    });
  };

  const inputClass = "w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const buttonClass = "px-4 py-2 rounded-lg font-medium transition-all";
  const sectionClass = "p-6 rounded-xl border mb-6";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className={sectionClass} style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--accent-cyan)' }}>Basic Information</h3>
        
        <div className="mb-4">
          <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={inputClass}
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Roles</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className={inputClass}
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
              placeholder="Add a role"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRole())}
            />
            <button
              type="button"
              onClick={addRole}
              className={buttonClass}
              style={{ backgroundColor: 'var(--accent-cyan)', color: '#111827' }}
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.roles.map((role, index) => (
              <span
                key={index}
                className="px-3 py-1 rounded-full flex items-center gap-2"
                style={{ backgroundColor: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent-cyan)' }}
              >
                {role}
                <button type="button" onClick={() => removeRole(index)} className="text-red-500 hover:text-red-700">×</button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Professional Summary</label>
          <textarea
            value={formData.professionalSummary}
            onChange={(e) => setFormData({ ...formData, professionalSummary: e.target.value })}
            rows={4}
            className={inputClass}
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
            required
          />
        </div>
      </div>

      {/* Skills */}
      <div className={sectionClass} style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold" style={{ color: 'var(--accent-cyan)' }}>Skills</h3>
          <button
            type="button"
            onClick={addSkill}
            className={buttonClass}
            style={{ backgroundColor: 'var(--accent-cyan)', color: '#111827' }}
          >
            + Add Skill
          </button>
        </div>

        {editingSkill && (
          <div className="mb-4 p-4 rounded-lg border" style={{ borderColor: 'var(--accent-cyan)', backgroundColor: 'var(--bg-primary)' }}>
            <input
              type="text"
              value={editingSkill.name}
              onChange={(e) => setEditingSkill({ ...editingSkill, name: e.target.value })}
              className={`${inputClass} mb-2`}
              style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
              placeholder="Skill name"
            />
            <label className="block mb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              Level: {editingSkill.level}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={editingSkill.level}
              onChange={(e) => setEditingSkill({ ...editingSkill, level: parseInt(e.target.value) })}
              className="w-full mb-2"
            />
            <div className="flex gap-2">
              <button type="button" onClick={saveSkill} className={buttonClass} style={{ backgroundColor: 'var(--accent-cyan)', color: '#111827' }}>
                Save
              </button>
              <button type="button" onClick={() => setEditingSkill(null)} className={buttonClass} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {formData.skills.map((skill, index) => (
            <div key={index} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <div>
                <div style={{ color: 'var(--text-primary)' }}>{skill.name}</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Level: {skill.level}%</div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => editSkill(index)} className="text-cyan-500 hover:text-cyan-700">Edit</button>
                <button type="button" onClick={() => removeSkill(index)} className="text-red-500 hover:text-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        type="submit"
        disabled={saving}
        className="w-full py-3 rounded-lg font-semibold text-lg"
        style={{ backgroundColor: 'var(--accent-cyan)', color: '#111827' }}
      >
        {saving ? 'Saving...' : 'Save All Changes'}
      </motion.button>
    </form>
  );
}
