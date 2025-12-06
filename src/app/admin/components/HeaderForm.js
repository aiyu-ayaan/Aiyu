"use client";

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function HeaderForm({ data, onSave, saving }) {
  const [navLinks, setNavLinks] = useState([]);
  const [contactLink, setContactLink] = useState({ name: '', href: '' });
  const [editingLink, setEditingLink] = useState(null);

  useEffect(() => {
    if (data) {
      setNavLinks(data.navLinks || []);
      setContactLink(data.contactLink || { name: '', href: '' });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ navLinks, contactLink });
  };

  const addNavLink = () => {
    setEditingLink({ name: '', href: '', target: '' });
  };

  const saveNavLink = () => {
    if (editingLink && editingLink.name.trim() && editingLink.href.trim()) {
      if (editingLink.index !== undefined) {
        const updated = [...navLinks];
        updated[editingLink.index] = {
          name: editingLink.name,
          href: editingLink.href,
          target: editingLink.target || undefined,
        };
        setNavLinks(updated);
      } else {
        setNavLinks([...navLinks, {
          name: editingLink.name,
          href: editingLink.href,
          target: editingLink.target || undefined,
        }]);
      }
      setEditingLink(null);
    }
  };

  const editNavLink = (index) => {
    setEditingLink({ ...navLinks[index], index });
  };

  const removeNavLink = (index) => {
    setNavLinks(navLinks.filter((_, i) => i !== index));
  };

  const inputClass = "w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const buttonClass = "px-4 py-2 rounded-lg font-medium transition-all";
  const sectionClass = "p-6 rounded-xl border mb-6";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Navigation Links */}
      <div className={sectionClass} style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold" style={{ color: 'var(--accent-cyan)' }}>Navigation Links</h3>
          <button
            type="button"
            onClick={addNavLink}
            className={buttonClass}
            style={{ backgroundColor: 'var(--accent-cyan)', color: '#111827' }}
          >
            + Add Link
          </button>
        </div>

        {editingLink && (
          <div className="mb-4 p-4 rounded-lg border" style={{ borderColor: 'var(--accent-cyan)', backgroundColor: 'var(--bg-primary)' }}>
            <div className="space-y-3">
              <input
                type="text"
                value={editingLink.name}
                onChange={(e) => setEditingLink({ ...editingLink, name: e.target.value })}
                className={inputClass}
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                placeholder="Link name (e.g., _about-me)"
              />
              <input
                type="text"
                value={editingLink.href}
                onChange={(e) => setEditingLink({ ...editingLink, href: e.target.value })}
                className={inputClass}
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                placeholder="URL (e.g., /about-me)"
              />
              <input
                type="text"
                value={editingLink.target || ''}
                onChange={(e) => setEditingLink({ ...editingLink, target: e.target.value })}
                className={inputClass}
                style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
                placeholder="Target (optional, e.g., _blank)"
              />
              <div className="flex gap-2">
                <button type="button" onClick={saveNavLink} className={buttonClass} style={{ backgroundColor: 'var(--accent-cyan)', color: '#111827' }}>
                  Save
                </button>
                <button type="button" onClick={() => setEditingLink(null)} className={buttonClass} style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {navLinks.map((link, index) => (
            <div key={index} className="p-3 rounded-lg flex justify-between items-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
              <div>
                <div style={{ color: 'var(--text-primary)' }}>{link.name}</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{link.href} {link.target && `(${link.target})`}</div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => editNavLink(index)} className="text-cyan-500 hover:text-cyan-700">Edit</button>
                <button type="button" onClick={() => removeNavLink(index)} className="text-red-500 hover:text-red-700">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Link */}
      <div className={sectionClass} style={{ borderColor: 'var(--border-secondary)', backgroundColor: 'var(--bg-secondary)' }}>
        <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--accent-cyan)' }}>Contact Link</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Name</label>
            <input
              type="text"
              value={contactLink.name}
              onChange={(e) => setContactLink({ ...contactLink, name: e.target.value })}
              className={inputClass}
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
              placeholder="contact-me"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium" style={{ color: 'var(--text-secondary)' }}>URL</label>
            <input
              type="url"
              value={contactLink.href}
              onChange={(e) => setContactLink({ ...contactLink, href: e.target.value })}
              className={inputClass}
              style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-secondary)', color: 'var(--text-primary)' }}
              placeholder="https://..."
            />
          </div>
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
