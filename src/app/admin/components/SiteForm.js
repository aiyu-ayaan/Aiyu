"use client";
import { useState, useEffect } from 'react';

export default function SiteForm({ data, onSave }) {
  const [formData, setFormData] = useState({
    navLinks: [],
    contactLink: { name: '', href: '' },
    socials: []
  });

  useEffect(() => {
    if (data) {
      setFormData({
        navLinks: data.navLinks || [],
        contactLink: data.contactLink || { name: '', href: '' },
        socials: data.socials || []
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  // Nav Links handlers
  const addNavLink = () => {
    setFormData({
      ...formData,
      navLinks: [...formData.navLinks, { name: '', href: '' }]
    });
  };

  const updateNavLink = (index, field, value) => {
    const newNavLinks = [...formData.navLinks];
    newNavLinks[index] = { ...newNavLinks[index], [field]: value };
    setFormData({ ...formData, navLinks: newNavLinks });
  };

  const removeNavLink = (index) => {
    setFormData({
      ...formData,
      navLinks: formData.navLinks.filter((_, i) => i !== index)
    });
  };

  // Social Links handlers
  const addSocial = () => {
    setFormData({
      ...formData,
      socials: [...formData.socials, { name: '', url: '', icon: 'FaGlobe' }]
    });
  };

  const updateSocial = (index, field, value) => {
    const newSocials = [...formData.socials];
    newSocials[index] = { ...newSocials[index], [field]: value };
    setFormData({ ...formData, socials: newSocials });
  };

  const removeSocial = (index) => {
    setFormData({
      ...formData,
      socials: formData.socials.filter((_, i) => i !== index)
    });
  };

  const iconOptions = [
    'FaGithub',
    'FaLinkedin',
    'FaTwitter',
    'FaInstagram',
    'FaFacebook',
    'FaYoutube',
    'FaEnvelope',
    'FaGlobe',
    'FaDiscord',
    'FaTelegram',
    'FaMedium',
    'FaDev'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Navigation Links */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-cyan-400">Navigation Links</h3>
          <button
            type="button"
            onClick={addNavLink}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
          >
            + Add Link
          </button>
        </div>

        {formData.navLinks.map((link, index) => (
          <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-cyan-300">Link {index + 1}</span>
              <button
                type="button"
                onClick={() => removeNavLink(index)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={link.name}
                  onChange={(e) => updateNavLink(index, 'name', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., _hello"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URL/Path *
                </label>
                <input
                  type="text"
                  value={link.href}
                  onChange={(e) => updateNavLink(index, 'href', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., / or /about-me"
                  required
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target (optional)
              </label>
              <select
                value={link.target || ''}
                onChange={(e) => updateNavLink(index, 'target', e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="">Same Window</option>
                <option value="_blank">New Tab</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <hr className="border-gray-700" />

      {/* Contact Link */}
      <div>
        <h3 className="text-lg font-semibold text-cyan-400 mb-4">Contact Link</h3>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.contactLink.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactLink: { ...formData.contactLink, name: e.target.value }
                  })
                }
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="e.g., contact-me"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                URL *
              </label>
              <input
                type="url"
                value={formData.contactLink.href}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    contactLink: { ...formData.contactLink, href: e.target.value }
                  })
                }
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="https://..."
                required
              />
            </div>
          </div>
        </div>
      </div>

      <hr className="border-gray-700" />

      {/* Social Media Links */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-cyan-400">Social Media Links</h3>
          <button
            type="button"
            onClick={addSocial}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
          >
            + Add Social
          </button>
        </div>

        {formData.socials.map((social, index) => (
          <div key={index} className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-start mb-3">
              <span className="text-cyan-300">Social {index + 1}</span>
              <button
                type="button"
                onClick={() => removeSocial(index)}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Platform Name *
                </label>
                <input
                  type="text"
                  value={social.name}
                  onChange={(e) => updateSocial(index, 'name', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="e.g., GitHub"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Icon *
                </label>
                <select
                  value={social.icon}
                  onChange={(e) => updateSocial(index, 'icon', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                >
                  {iconOptions.map((icon) => (
                    <option key={icon} value={icon}>
                      {icon.replace('Fa', '')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  URL *
                </label>
                <input
                  type="url"
                  value={social.url}
                  onChange={(e) => updateSocial(index, 'url', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="https://..."
                  required
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg"
      >
        Save All Changes
      </button>
    </form>
  );
}
