"use client";
import { useState, useEffect } from 'react';

export default function ProjectsForm({ data, onSave }) {
  const [formData, setFormData] = useState({
    roles: [],
    projects: []
  });

  useEffect(() => {
    if (data) {
      setFormData({
        roles: data.roles || [],
        projects: data.projects || []
      });
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleRoleChange = (index, value) => {
    const newRoles = [...formData.roles];
    newRoles[index] = value;
    setFormData({ ...formData, roles: newRoles });
  };

  const addRole = () => {
    setFormData({ ...formData, roles: [...formData.roles, ''] });
  };

  const removeRole = (index) => {
    const newRoles = formData.roles.filter((_, i) => i !== index);
    setFormData({ ...formData, roles: newRoles });
  };

  const handleProjectChange = (index, field, value) => {
    const newProjects = [...formData.projects];
    newProjects[index] = { ...newProjects[index], [field]: value };
    setFormData({ ...formData, projects: newProjects });
  };

  const handleTechStackChange = (projectIndex, techIndex, value) => {
    const newProjects = [...formData.projects];
    const newTechStack = [...newProjects[projectIndex].techStack];
    newTechStack[techIndex] = value;
    newProjects[projectIndex] = { ...newProjects[projectIndex], techStack: newTechStack };
    setFormData({ ...formData, projects: newProjects });
  };

  const addTechStack = (projectIndex) => {
    const newProjects = [...formData.projects];
    newProjects[projectIndex].techStack = [...newProjects[projectIndex].techStack, ''];
    setFormData({ ...formData, projects: newProjects });
  };

  const removeTechStack = (projectIndex, techIndex) => {
    const newProjects = [...formData.projects];
    newProjects[projectIndex].techStack = newProjects[projectIndex].techStack.filter((_, i) => i !== techIndex);
    setFormData({ ...formData, projects: newProjects });
  };

  const addProject = () => {
    setFormData({
      ...formData,
      projects: [
        ...formData.projects,
        {
          name: '',
          techStack: [],
          year: new Date().getFullYear().toString(),
          status: 'Working',
          projectType: 'application',
          description: '',
          codeLink: ''
        }
      ]
    });
  };

  const removeProject = (index) => {
    const newProjects = formData.projects.filter((_, i) => i !== index);
    setFormData({ ...formData, projects: newProjects });
  };

  const moveProject = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formData.projects.length - 1)
    ) {
      return;
    }

    const newProjects = [...formData.projects];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newProjects[index], newProjects[targetIndex]] = [newProjects[targetIndex], newProjects[index]];
    setFormData({ ...formData, projects: newProjects });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Page Subtitle/Roles
        </label>
        {formData.roles.map((role, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <input
              type="text"
              value={role}
              onChange={(e) => handleRoleChange(index, e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
              placeholder="e.g., A collection of my work"
            />
            <button
              type="button"
              onClick={() => removeRole(index)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addRole}
          className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
        >
          + Add Subtitle
        </button>
      </div>

      <hr className="border-gray-700" />

      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-cyan-400">Projects</h3>
          <button
            type="button"
            onClick={addProject}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg"
          >
            + Add New Project
          </button>
        </div>

        {formData.projects.map((project, projectIndex) => (
          <div key={projectIndex} className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <h4 className="text-md font-semibold text-cyan-300">
                Project {projectIndex + 1}
              </h4>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => moveProject(projectIndex, 'up')}
                  disabled={projectIndex === 0}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveProject(projectIndex, 'down')}
                  disabled={projectIndex === formData.projects.length - 1}
                  className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeProject(projectIndex)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded"
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={project.name}
                  onChange={(e) => handleProjectChange(projectIndex, 'name', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Year *
                </label>
                <input
                  type="text"
                  value={project.year}
                  onChange={(e) => handleProjectChange(projectIndex, 'year', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="2025 or 2023 - 2025"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  value={project.status}
                  onChange={(e) => handleProjectChange(projectIndex, 'status', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Done">Done</option>
                  <option value="Working">Working</option>
                  <option value="Planned">Planned</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Type *
                </label>
                <select
                  value={project.projectType}
                  onChange={(e) => handleProjectChange(projectIndex, 'projectType', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="application">Application</option>
                  <option value="library">Library</option>
                  <option value="theme">Theme</option>
                  <option value="skill">Skill</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Tech Stack
              </label>
              {project.techStack?.map((tech, techIndex) => (
                <div key={techIndex} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tech}
                    onChange={(e) => handleTechStackChange(projectIndex, techIndex, e.target.value)}
                    className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g., React, Node.js"
                  />
                  <button
                    type="button"
                    onClick={() => removeTechStack(projectIndex, techIndex)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addTechStack(projectIndex)}
                className="mt-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
              >
                + Add Technology
              </button>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={project.description}
                onChange={(e) => handleProjectChange(projectIndex, 'description', e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                rows="3"
                required
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Code/Project Link *
              </label>
              <input
                type="url"
                value={project.codeLink}
                onChange={(e) => handleProjectChange(projectIndex, 'codeLink', e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="https://github.com/..."
                required
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Image URL (optional)
              </label>
              <input
                type="url"
                value={project.image || ''}
                onChange={(e) => handleProjectChange(projectIndex, 'image', e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                placeholder="https://..."
              />
            </div>
          </div>
        ))}
      </div>

      <button
        type="submit"
        className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg"
      >
        Save All Projects
      </button>
    </form>
  );
}
