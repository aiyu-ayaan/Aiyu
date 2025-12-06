"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import Link from 'next/link';
import AboutForm from '../components/AboutForm';
import ProjectsForm from '../components/ProjectsForm';
import HeaderForm from '../components/HeaderForm';
import SiteForm from '../components/SiteForm';
import HomeScreenForm from '../components/HomeScreenForm';

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

  const handleSave = async (formData) => {
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
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setMessage('✓ Saved successfully!');
        setTimeout(() => {
          setMessage('');
          loadData(activeTab); // Reload data after save
        }, 2000);
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

        {/* Forms */}
        <div 
          className="rounded-2xl shadow-xl"
          style={{
            background: 'linear-gradient(to bottom right, #1f2937, #111827)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--border-secondary)',
          }}
        >
          <div className="p-6">
            {activeTab === 'about' && <AboutForm data={data} onSave={handleSave} saving={saving} />}
            {activeTab === 'projects' && <ProjectsForm data={data} onSave={handleSave} saving={saving} />}
            {activeTab === 'header' && <HeaderForm data={data} onSave={handleSave} saving={saving} />}
            {activeTab === 'site' && <SiteForm data={data} onSave={handleSave} saving={saving} />}
            {activeTab === 'homescreen' && <HomeScreenForm data={data} onSave={handleSave} saving={saving} />}
          </div>
        </div>
      </div>
    </div>
  );
}
