"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('about');
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = Cookies.get('admin_token');
    if (!token) {
      router.push('/admin/login');
    } else {
      setAuthenticated(true);
      loadData(activeTab);
    }
  }, [router, activeTab]);

  const loadData = async (endpoint) => {
    try {
      const response = await fetch(`/api/${endpoint}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const token = Cookies.get('admin_token');
      const response = await fetch(`/api/admin/${activeTab}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage('✓ Saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('✗ Failed to save: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      setMessage('✗ Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Cookies.remove('admin_token');
    router.push('/admin/login');
  };

  if (!authenticated || loading) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <div style={{ color: 'var(--text-primary)' }}>Loading...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'about', label: 'About' },
    { id: 'projects', label: 'Projects' },
    { id: 'header', label: 'Header' },
    { id: 'site', label: 'Site' },
    { id: 'homescreen', label: 'Home Screen' },
  ];

  return (
    <div 
      className="min-h-screen p-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 
            className="text-4xl font-bold"
            style={{ color: 'var(--accent-cyan)' }}
          >
            Admin Dashboard
          </h1>
          <div className="flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            >
              View Site
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--bg-secondary)',
                color: activeTab === tab.id ? '#111827' : 'var(--text-primary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-lg text-center font-medium"
            style={{
              backgroundColor: message.startsWith('✓') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: message.startsWith('✓') ? '#22c55e' : '#ef4444',
            }}
          >
            {message}
          </motion.div>
        )}

        {/* Editor */}
        <div 
          className="p-6 rounded-2xl shadow-xl"
          style={{
            background: 'linear-gradient(to bottom right, #1f2937, #111827)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-secondary)',
          }}
        >
          <div className="mb-4">
            <label 
              className="block mb-2 font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              JSON Data (edit carefully)
            </label>
            <textarea
              value={JSON.stringify(data, null, 2)}
              onChange={(e) => {
                try {
                  setData(JSON.parse(e.target.value));
                } catch (err) {
                  // Invalid JSON, don't update
                }
              }}
              rows={20}
              className="w-full p-4 rounded-lg font-mono text-sm"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-secondary)',
                color: 'var(--text-primary)',
                borderWidth: '1px',
                borderStyle: 'solid',
              }}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-lg font-semibold transition-all"
            style={{
              backgroundColor: 'var(--accent-cyan)',
              color: '#111827',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </motion.button>
        </div>

        {/* Instructions */}
        <div 
          className="mt-6 p-4 rounded-lg"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: 'var(--text-secondary)',
          }}
        >
          <p className="text-sm">
            <strong>Note:</strong> Edit the JSON data carefully. Invalid JSON will not be saved. 
            Make sure to validate your changes before saving. Changes take effect immediately on the frontend.
          </p>
        </div>
      </div>
    </div>
  );
}
