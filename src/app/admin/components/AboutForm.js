"use client";
import { useState, useEffect } from 'react';

export default function AboutForm({ data, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    roles: [],
    professionalSummary: '',
    skills: [],
    experiences: [],
    education: [],
    certifications: []
  });
  const [activeSection, setActiveSection] = useState('basic');

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        roles: data.roles || [],
        professionalSummary: data.professionalSummary || '',
        skills: data.skills || [],
        experiences: data.experiences || [],
        education: data.education || [],
        certifications: data.certifications || []
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Skills handlers
  const addSkill = () => {
    setFormData({
      ...formData,
      skills: [...formData.skills, { name: '', level: 50 }]
    });
  };

  const updateSkill = (index, field, value) => {
    const newSkills = [...formData.skills];
    newSkills[index] = { ...newSkills[index], [field]: value };
    setFormData({ ...formData, skills: newSkills });
  };

  const removeSkill = (index) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index)
    });
  };

  // Experience handlers
  const addExperience = () => {
    setFormData({
      ...formData,
      experiences: [
        ...formData.experiences,
        { company: '', role: '', duration: '', description: '' }
      ]
    });
  };

  const updateExperience = (index, field, value) => {
    const newExperiences = [...formData.experiences];
    newExperiences[index] = { ...newExperiences[index], [field]: value };
    setFormData({ ...formData, experiences: newExperiences });
  };

  const removeExperience = (index) => {
    setFormData({
      ...formData,
      experiences: formData.experiences.filter((_, i) => i !== index)
    });
  };

  // Education handlers
  const addEducation = () => {
    setFormData({
      ...formData,
      education: [
        ...formData.education,
        { institution: '', degree: '', duration: '', cgpa: '' }
      ]
    });
  };

  const updateEducation = (index, field, value) => {
    const newEducation = [...formData.education];
    newEducation[index] = { ...newEducation[index], [field]: value };
    setFormData({ ...formData, education: newEducation });
  };

  const removeEducation = (index) => {
    setFormData({
      ...formData,
      education: formData.education.filter((_, i) => i !== index)
    });
  };

  // Certification handlers
  const addCertification = () => {
    setFormData({
      ...formData,
      certifications: [
        ...formData.certifications,
        { name: '', issuer: '', date: '', url: '', skills: [] }
      ]
    });
  };

  const updateCertification = (index, field, value) => {
    const newCertifications = [...formData.certifications];
    newCertifications[index] = { ...newCertifications[index], [field]: value };
    setFormData({ ...formData, certifications: newCertifications });
  };

  const removeCertification = (index) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter((_, i) => i !== index)
    });
  };

  const updateCertificationSkills = (certIndex, value) => {
    const newCertifications = [...formData.certifications];
    newCertifications[certIndex].skills = value.split(',').map(s => s.trim()).filter(s => s);
    setFormData({ ...formData, certifications: newCertifications });
  };

  // Role handlers
  const updateRole = (index, value) => {
    const newRoles = [...formData.roles];
    newRoles[index] = value;
    setFormData({ ...formData, roles: newRoles });
  };

  const addRole = () => {
    setFormData({ ...formData, roles: [...formData.roles, ''] });
  };

  const removeRole = (index) => {
    setFormData({
      ...formData,
      roles: formData.roles.filter((_, i) => i !== index)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['basic', 'skills', 'experiences', 'education', 'certifications'].map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              activeSection === section
                ? 'bg-cyan-500 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {section.charAt(0).toUpperCase() + section.slice(1)}
          </button>
        ))}
      </div>

      {/* Basic Information */}
      {activeSection === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Roles</label>
            {formData.roles.map((role, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={role}
                  onChange={(e) => updateRole(index, e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., Android Developer"
                />
                <button
                  type="button"
                  onClick={() => removeRole(index)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addRole}
              className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              + Add Role
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Professional Summary *
            </label>
            <textarea
              value={formData.professionalSummary}
              onChange={(e) => setFormData({ ...formData, professionalSummary: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              rows="4"
              required
            />
          </div>
        </div>
      )}

      {/* Skills */}
      {activeSection === 'skills' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-cyan-400">Skills</h3>
            <button
              type="button"
              onClick={addSkill}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
            >
              + Add Skill
            </button>
          </div>

          {formData.skills.map((skill, index) => (
            <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="text-cyan-300">Skill {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeSkill(index)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Skill Name *
                  </label>
                  <input
                    type="text"
                    value={skill.name}
                    onChange={(e) => updateSkill(index, 'name', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., React (Advanced)"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Level (0-100) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={skill.level}
                    onChange={(e) => updateSkill(index, 'level', parseInt(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Experiences */}
      {activeSection === 'experiences' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-cyan-400">Work Experience</h3>
            <button
              type="button"
              onClick={addExperience}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
            >
              + Add Experience
            </button>
          </div>

          {formData.experiences.map((exp, index) => (
            <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="text-cyan-300">Experience {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeExperience(index)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Company *
                    </label>
                    <input
                      type="text"
                      value={exp.company}
                      onChange={(e) => updateExperience(index, 'company', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Role *
                    </label>
                    <input
                      type="text"
                      value={exp.role}
                      onChange={(e) => updateExperience(index, 'role', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration *
                  </label>
                  <input
                    type="text"
                    value={exp.duration}
                    onChange={(e) => updateExperience(index, 'duration', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., Jun 2025 - Present"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={exp.description}
                    onChange={(e) => updateExperience(index, 'description', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    rows="3"
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Education */}
      {activeSection === 'education' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-cyan-400">Education</h3>
            <button
              type="button"
              onClick={addEducation}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
            >
              + Add Education
            </button>
          </div>

          {formData.education.map((edu, index) => (
            <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="text-cyan-300">Education {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeEducation(index)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Institution *
                  </label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Degree *
                    </label>
                    <input
                      type="text"
                      value={edu.degree}
                      onChange={(e) => updateEducation(index, 'degree', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      CGPA/Grade *
                    </label>
                    <input
                      type="text"
                      value={edu.cgpa}
                      onChange={(e) => updateEducation(index, 'cgpa', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      placeholder="e.g., 8.5/10.0"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Duration *
                  </label>
                  <input
                    type="text"
                    value={edu.duration}
                    onChange={(e) => updateEducation(index, 'duration', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., Aug 2023 - May 2025"
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certifications */}
      {activeSection === 'certifications' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-cyan-400">Certifications</h3>
            <button
              type="button"
              onClick={addCertification}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
            >
              + Add Certification
            </button>
          </div>

          {formData.certifications.map((cert, index) => (
            <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="text-cyan-300">Certification {index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeCertification(index)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Certification Name *
                  </label>
                  <input
                    type="text"
                    value={cert.name}
                    onChange={(e) => updateCertification(index, 'name', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Issuer *
                    </label>
                    <input
                      type="text"
                      value={cert.issuer}
                      onChange={(e) => updateCertification(index, 'issuer', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Date *
                    </label>
                    <input
                      type="text"
                      value={cert.date}
                      onChange={(e) => updateCertification(index, 'date', e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                      placeholder="e.g., Jan 2024"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Certificate URL (optional)
                  </label>
                  <input
                    type="url"
                    value={cert.url || ''}
                    onChange={(e) => updateCertification(index, 'url', e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Related Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={cert.skills?.join(', ') || ''}
                    onChange={(e) => updateCertificationSkills(index, e.target.value)}
                    className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., React, JavaScript, Node.js"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        type="submit"
        className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg"
      >
        Save All Changes
      </button>
    </form>
  );
}
