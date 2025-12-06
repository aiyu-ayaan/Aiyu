"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function HomeScreenForm({ data, onSave, saving }) {
  const [formData, setFormData] = useState({
    name: '',
    homeRoles: [],
    githubLink: '',
    codeSnippets: [],
  });

  const [newRole, setNewRole] = useState('');
  const [newSnippet, setNewSnippet] = useState('');

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        homeRoles: data.homeRoles || [],
        githubLink: data.githubLink || '',
        codeSnippets: data.codeSnippets || [],
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const addRole = () => {
    if (newRole.trim()) {
      setFormData({ ...formData, homeRoles: [...formData.homeRoles, newRole.trim()] });
      setNewRole('');
    }
  };

  const removeRole = (index) => {
    setFormData({
      ...formData,
      homeRoles: formData.homeRoles.filter((_, i) => i !== index),
    });
  };

  const addSnippet = () => {
    if (newSnippet.trim()) {
      setFormData({ ...formData, codeSnippets: [...formData.codeSnippets, newSnippet.trim()] });
      setNewSnippet('');
    }
  };

  const removeSnippet = (index) => {
    setFormData({
      ...formData,
      codeSnippets: formData.codeSnippets.filter((_, i) => i !== index),
    });
  };

  const inputClass = "w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const buttonClass = "px-4 py-2 rounded-lg font-medium transition-all";
  const sectionClass = "p-6 rounded-xl border mb-6";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={sectionClass} style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--accent-cyan)' }}>Basic Information</h3>
        
        <div className="space-y-4">
          <div>
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

          <div>
            <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>GitHub Link</label>
            <input
              type="url"
              value={formData.githubLink}
              onChange={(e) => setFormData({ ...formData, githubLink: e.target.value })}
              className={inputClass}
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
              placeholder="https://github.com/username"
              required
            />
          </div>
        </div>
      </div>

      <div className={sectionClass} style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--accent-cyan)' }}>Home Roles</h3>
        
        <div className="flex gap-2 mb-4">
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

        <div className="space-y-2">
          {formData.homeRoles.map((role, index) => (
            <div key={index} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <span style={{ color: 'var(--text-primary)' }}>{role}</span>
              <button type="button" onClick={() => removeRole(index)} className="text-red-500 hover:text-red-700">Remove</button>
            </div>
          ))}
        </div>
      </div>

      <div className={sectionClass} style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--accent-cyan)' }}>Code Snippets</h3>
        
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newSnippet}
            onChange={(e) => setNewSnippet(e.target.value)}
            className={inputClass}
            style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
            placeholder="Add a code snippet"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSnippet())}
          />
          <button
            type="button"
            onClick={addSnippet}
            className={buttonClass}
            style={{ backgroundColor: 'var(--accent-cyan)', color: '#111827' }}
          >
            Add
          </button>
        </div>

        <div className="space-y-2">
          {formData.codeSnippets.map((snippet, index) => (
            <div key={index} className="flex justify-between items-center p-2 rounded font-mono text-sm" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <span style={{ color: 'var(--text-primary)' }}>{snippet}</span>
              <button type="button" onClick={() => removeSnippet(index)} className="text-red-500 hover:text-red-700">Remove</button>
            </div>
          ))}
        </div>
      </div>

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
