"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import HomescreenForm from '../components/HomescreenForm';
import ProjectsForm from '../components/ProjectsForm';
import AboutForm from '../components/AboutForm';
import SiteForm from '../components/SiteForm';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [activeTab, setActiveTab] = useState('homescreen');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const storedUsername = localStorage.getItem('adminUsername');
    
    if (!token) {
      router.push('/admin/login');
    } else {
      setIsAuthenticated(true);
      setUsername(storedUsername || 'Admin');
      loadData('homescreen');
    }
  }, [router]);

  const loadData = async (dataType) => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`/api/data/${dataType}`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setMessage('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (formData) => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/data/${activeTab}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setMessage('Data saved successfully!');
        setData(formData);
        setTimeout(() => setMessage(''), 3000);
      } else {
        const error = await response.json();
        setMessage(error.error || 'Failed to save data');
      }
    } catch (err) {
      setMessage('Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    loadData(tab);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUsername');
    router.push('/admin/login');
  };

  const renderForm = () => {
    if (!data) return null;

    switch (activeTab) {
      case 'homescreen':
        return <HomescreenForm data={data} onSave={saveData} />;
      case 'projects':
        return <ProjectsForm data={data} onSave={saveData} />;
      case 'about':
        return <AboutForm data={data} onSave={saveData} />;
      case 'site':
        return <SiteForm data={data} onSave={saveData} />;
      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-cyan-400">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">Welcome, {username}</p>
          </div>
          <div className="flex gap-4">
            <a
              href="/"
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              View Site
            </a>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-700">
          <div className="flex gap-4 overflow-x-auto">
            {['homescreen', 'projects', 'about', 'site'].map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                  activeTab === tab
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-gray-400 border-transparent hover:text-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.includes('success') ? 'bg-green-900/50 border border-green-500 text-green-200' : 'bg-red-900/50 border border-red-500 text-red-200'
          }`}>
            {message}
          </div>
        )}

        {/* Content */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <p className="mt-2 text-gray-400">Loading data...</p>
            </div>
          ) : saving ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <p className="mt-2 text-gray-400">Saving changes...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-cyan-400 mb-2">
                  Edit {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Data
                </h2>
                <p className="text-gray-400 text-sm">
                  Use the form below to edit your portfolio content. All fields marked with * are required.
                </p>
              </div>

              {renderForm()}
            </>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-cyan-400 mb-3">💡 Quick Tips</h3>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li>• All changes are saved to the data folder and will be immediately visible on the website</li>
            <li>• Use the form fields to easily edit your content without worrying about JSON syntax</li>
            <li>• You can add or remove items using the + Add and Remove buttons</li>
            <li>• For projects, use the arrow buttons to reorder them</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
