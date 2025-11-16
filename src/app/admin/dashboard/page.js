"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

  const saveData = async () => {
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
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setMessage('Data saved successfully!');
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

  const handleDataChange = (newData) => {
    setData(newData);
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
          ) : (
            <>
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-cyan-400 mb-2">
                  Edit {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Data
                </h2>
                <p className="text-gray-400 text-sm">
                  Edit the JSON data below. Be careful to maintain valid JSON format.
                </p>
              </div>

              <textarea
                value={data ? JSON.stringify(data, null, 2) : ''}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleDataChange(parsed);
                  } catch (err) {
                    // Allow invalid JSON while typing
                    setData(e.target.value);
                  }
                }}
                className="w-full h-96 p-4 bg-gray-900 border border-gray-600 rounded-lg text-gray-200 font-mono text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                spellCheck={false}
              />

              <div className="mt-4 flex gap-4">
                <button
                  onClick={saveData}
                  disabled={saving}
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => loadData(activeTab)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Reload Data
                </button>
              </div>
            </>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-cyan-400 mb-3">💡 Tips</h3>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li>• Make sure to maintain valid JSON format when editing</li>
            <li>• Use the "Reload Data" button to discard unsaved changes</li>
            <li>• Changes are saved to the data folder and will be immediately visible on the website</li>
            <li>• You can edit projects, skills, experiences, and other content from their respective tabs</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
