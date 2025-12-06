"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function ProjectsForm({ data, onSave, saving }) {
  const [projects, setProjects] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editingProject, setEditingProject] = useState(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    if (data) {
      setProjects(data.projects || []);
      setRoles(data.roles || []);
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ projects, roles });
  };

  const addProject = () => {
    setEditingProject({
      name: '',
      techStack: [],
      year: new Date().getFullYear().toString(),
      status: 'Working',
      projectType: 'application',
      description: '',
      codeLink: '',
      image: '',
    });
  };

  const saveProject = () => {
    if (editingProject && editingProject.name.trim()) {
      if (editingProject._id) {
        setProjects(projects.map(p => p._id === editingProject._id ? editingProject : p));
      } else {
        // Use crypto.randomUUID() for better unique ID generation (MongoDB will assign proper _id on save)
        const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `temp-${Date.now()}-${Math.random()}`;
        setProjects([...projects, { ...editingProject, _id: tempId }]);
      }
      setEditingProject(null);
    }
  };

  const editProject = (project) => {
    setEditingProject({ ...project });
  };

  const deleteProject = (id) => {
    if (confirm('Are you sure you want to delete this project?')) {
      setProjects(projects.filter(p => p._id !== id));
    }
  };

  const addRole = () => {
    if (newRole.trim()) {
      setRoles([...roles, newRole.trim()]);
      setNewRole('');
    }
  };

  const removeRole = (index) => {
    setRoles(roles.filter((_, i) => i !== index));
  };

  const addTechToProject = (tech) => {
    if (tech.trim() && !editingProject.techStack.includes(tech.trim())) {
      setEditingProject({
        ...editingProject,
        techStack: [...editingProject.techStack, tech.trim()],
      });
    }
  };

  const removeTechFromProject = (index) => {
    setEditingProject({
      ...editingProject,
      techStack: editingProject.techStack.filter((_, i) => i !== index),
    });
  };

  const inputClass = "w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const buttonClass = "px-4 py-2 rounded-lg font-medium transition-all";
  const sectionClass = "p-6 rounded-xl border mb-6";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Page Roles */}
      <div className={sectionClass} style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--accent-cyan)' }}>Page Description</h3>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className={inputClass}
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
            placeholder="Add a description line"
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
        <div className="space-y-2">
          {roles.map((role, index) => (
            <div key={index} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <span style={{ color: 'var(--text-primary)' }}>{role}</span>
              <button type="button" onClick={() => removeRole(index)} className="text-red-500 hover:text-red-700">Remove</button>
            </div>
          ))}
        </div>
      </div>

      {/* Projects List */}
      <div className={sectionClass} style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold" style={{ color: 'var(--accent-cyan)' }}>Projects ({projects.length})</h3>
          <button
            type="button"
            onClick={addProject}
            className={buttonClass}
            style={{ backgroundColor: 'var(--accent-cyan)', color: '#111827' }}
          >
            + Add Project
          </button>
        </div>

        {editingProject && (
          <div className="mb-6 p-6 rounded-lg border-2" style={{ borderColor: 'var(--accent-cyan)', backgroundColor: 'var(--bg-primary)' }}>
            <h4 className="text-lg font-bold mb-4" style={{ color: 'var(--accent-cyan)' }}>
              {editingProject._id ? 'Edit Project' : 'New Project'}
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Project Name *</label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className={inputClass}
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Year</label>
                  <input
                    type="text"
                    value={editingProject.year}
                    onChange={(e) => setEditingProject({ ...editingProject, year: e.target.value })}
                    className={inputClass}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                    placeholder="2025"
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Status</label>
                  <select
                    value={editingProject.status}
                    onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value })}
                    className={inputClass}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value="Working">Working</option>
                    <option value="Done">Done</option>
                    <option value="Paused">Paused</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Type</label>
                  <select
                    value={editingProject.projectType}
                    onChange={(e) => setEditingProject({ ...editingProject, projectType: e.target.value })}
                    className={inputClass}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                  >
                    <option value="application">Application</option>
                    <option value="library">Library</option>
                    <option value="theme">Theme</option>
                    <option value="skill">Skill</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Tech Stack</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    className={inputClass}
                    style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                    placeholder="Add technology"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTechToProject(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {editingProject.techStack.map((tech, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 rounded-full flex items-center gap-2"
                      style={{ backgroundColor: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent-cyan)' }}
                    >
                      {tech}
                      <button type="button" onClick={() => removeTechFromProject(index)} className="text-red-500 hover:text-red-700">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Description *</label>
                <textarea
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  rows={3}
                  className={inputClass}
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Code Link (URL) *</label>
                <input
                  type="url"
                  value={editingProject.codeLink}
                  onChange={(e) => setEditingProject({ ...editingProject, codeLink: e.target.value })}
                  className={inputClass}
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                  placeholder="https://github.com/..."
                  required
                />
              </div>

              <div>
                <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Image URL (optional)</label>
                <input
                  type="url"
                  value={editingProject.image || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, image: e.target.value })}
                  className={inputClass}
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                  placeholder="https://..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={saveProject}
                  className={buttonClass}
                  style={{ backgroundColor: 'var(--accent-cyan)', color: '#111827' }}
                >
                  Save Project
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className={buttonClass}
                  style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', borderWidth: '1px', borderColor: 'var(--border-secondary)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {projects.map((project) => (
            <div key={project._id} className="p-4 rounded-lg border" style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-primary)' }}>
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{project.name}</h4>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {project.year} • {project.status} • {project.projectType}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => editProject(project)} className="text-cyan-500 hover:text-cyan-700">Edit</button>
                  <button type="button" onClick={() => deleteProject(project._id)} className="text-red-500 hover:text-red-700">Delete</button>
                </div>
              </div>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>
              <div className="flex flex-wrap gap-1">
                {project.techStack.map((tech, i) => (
                  <span key={i} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent-cyan)' }}>
                    {tech}
                  </span>
                ))}
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
