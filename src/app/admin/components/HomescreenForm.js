"use client";
import { useState, useEffect } from 'react';

export default function HomescreenForm({ data, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    homeRoles: [],
    githubLink: '',
    codeSnippets: []
  });

  useEffect(() => {
    if (data) {
      setFormData({
        name: data.name || '',
        homeRoles: data.homeRoles || [],
        githubLink: data.githubLink || '',
        codeSnippets: data.codeSnippets || []
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleArrayChange = (field, index, value) => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData({ ...formData, [field]: newArray });
  };

  const addArrayItem = (field) => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeArrayItem = (field, index) => {
    const newArray = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newArray });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Home Roles
        </label>
        {formData.homeRoles.map((role, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={role}
              onChange={(e) => handleArrayChange('homeRoles', index, e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="e.g., Android Developer"
            />
            <button
              type="button"
              onClick={() => removeArrayItem('homeRoles', index)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('homeRoles')}
          className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          + Add Role
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          GitHub Link
        </label>
        <input
          type="url"
          value={formData.githubLink}
          onChange={(e) => setFormData({ ...formData, githubLink: e.target.value })}
          className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          placeholder="https://github.com/username"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Code Snippets (Lines for the game)
        </label>
        {formData.codeSnippets.map((snippet, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={snippet}
              onChange={(e) => handleArrayChange('codeSnippets', index, e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder={`Line ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => removeArrayItem('codeSnippets', index)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrayItem('codeSnippets')}
          className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          + Add Line
        </button>
      </div>

      <button
        type="submit"
        className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg"
      >
        Save Changes
      </button>
    </form>
  );
}
