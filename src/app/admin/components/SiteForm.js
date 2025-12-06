"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function SiteForm({ data, onSave, saving }) {
  const [socials, setSocials] = useState([]);
  const [editingSocial, setEditingSocial] = useState(null);

  useEffect(() => {
    if (data) {
      setSocials(data.socials || []);
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ socials });
  };

  const addSocial = () => {
    setEditingSocial({ name: '', url: '', icon: '' });
  };

  const saveSocial = () => {
    if (editingSocial && editingSocial.name.trim() && editingSocial.url.trim()) {
      if (editingSocial.index !== undefined) {
        const updated = [...socials];
        updated[editingSocial.index] = {
          name: editingSocial.name,
          url: editingSocial.url,
          icon: editingSocial.icon || editingSocial.name,
        };
        setSocials(updated);
      } else {
        setSocials([...socials, {
          name: editingSocial.name,
          url: editingSocial.url,
          icon: editingSocial.icon || editingSocial.name,
        }]);
      }
      setEditingSocial(null);
    }
  };

  const editSocial = (index) => {
    setEditingSocial({ ...socials[index], index });
  };

  const removeSocial = (index) => {
    setSocials(socials.filter((_, i) => i !== index));
  };

  const inputClass = "w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const buttonClass = "px-4 py-2 rounded-lg font-medium transition-all";
  const sectionClass = "p-6 rounded-xl border mb-6";

  const iconOptions = ['GitHub', 'LinkedIn', 'Instagram', 'Email', 'Twitter', 'Facebook', 'YouTube'];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className={sectionClass} style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold" style={{ color: 'var(--accent-cyan)' }}>Social Media Links</h3>
          <button
            type="button"
            onClick={addSocial}
            className={buttonClass}
            style={{ backgroundColor: 'var(--accent-cyan)', color: '#111827' }}
          >
            + Add Social
          </button>
        </div>

        {editingSocial && (
          <div className="mb-4 p-4 rounded-lg border" style={{ borderColor: 'var(--accent-cyan)', backgroundColor: 'var(--bg-primary)' }}>
            <div className="space-y-3">
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Platform Name</label>
                <input
                  type="text"
                  value={editingSocial.name}
                  onChange={(e) => setEditingSocial({ ...editingSocial, name: e.target.value })}
                  className={inputClass}
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                  placeholder="GitHub"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>URL</label>
                <input
                  type="url"
                  value={editingSocial.url}
                  onChange={(e) => setEditingSocial({ ...editingSocial, url: e.target.value })}
                  className={inputClass}
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                  placeholder="https://github.com/username"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Icon</label>
                <select
                  value={editingSocial.icon}
                  onChange={(e) => setEditingSocial({ ...editingSocial, icon: e.target.value })}
                  className={inputClass}
                  style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                >
                  <option value="">Select icon</option>
                  {iconOptions.map(icon => (
                    <option key={icon} value={icon}>{icon}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={saveSocial} className={buttonClass} style={{ backgroundColor: 'var(--accent-cyan)', color: '#111827' }}>
                  Save
                </button>
                <button type="button" onClick={() => setEditingSocial(null)} className={buttonClass} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {socials.map((social, index) => (
            <div key={index} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <div>
                <div style={{ color: 'var(--text-primary)' }}>{social.name} ({social.icon})</div>
                <div className="text-sm truncate max-w-md" style={{ color: 'var(--text-secondary)' }}>{social.url}</div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => editSocial(index)} className="text-cyan-500 hover:text-cyan-700">Edit</button>
                <button type="button" onClick={() => removeSocial(index)} className="text-red-500 hover:text-red-700">Delete</button>
              </div>
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
