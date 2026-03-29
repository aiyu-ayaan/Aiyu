"use client";

import React from 'react';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { FaCalendarAlt, FaLaptopCode, FaBoxes, FaWrench } from 'react-icons/fa';
import ProjectCard from './ProjectCard';

const getProjectIcon = (projectType) => {
  const safeType = String(projectType || '').toLowerCase();
  if (safeType === 'application') return <FaLaptopCode />;
  if (safeType === 'skill') return <FaWrench />;
  return <FaBoxes />;
};

const Timeline = ({ projectsByYear, years, onCardClick }) => {
  if (!Array.isArray(years) || years.length === 0) {
    return null;
  }

  return (
    <VerticalTimeline>
      {years.map((year) => {
        const yearProjects = Array.isArray(projectsByYear?.[year]) ? projectsByYear[year] : [];

        return (
          <React.Fragment key={year}>
            <VerticalTimelineElement
              contentStyle={{
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
                color: 'var(--text-primary)',
                boxShadow: '0 8px 24px var(--shadow-sm)',
                border: '1px solid color-mix(in srgb, var(--border-secondary) 74%, transparent)',
                borderRadius: '16px',
                padding: '1.3rem 1.5rem',
              }}
              contentArrowStyle={{
                borderRight: '7px solid var(--border-secondary)',
              }}
              iconStyle={{
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
                color: '#fff',
                boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent-cyan) 18%, transparent)',
              }}
              icon={<FaCalendarAlt />}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3
                  className="vertical-timeline-element-title text-3xl font-bold"
                  style={{
                    background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {year}
                </h3>
                <span
                  className="rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--accent-orange) 46%, var(--border-secondary))',
                    color: 'var(--accent-orange)',
                    backgroundColor: 'color-mix(in srgb, var(--accent-orange) 10%, transparent)',
                  }}
                >
                  {yearProjects.length} {yearProjects.length === 1 ? 'project' : 'projects'}
                </span>
              </div>
            </VerticalTimelineElement>

            {yearProjects.map((project, index) => (
              <VerticalTimelineElement
                key={project?._id || `${project?.name || 'project'}-${year}-${index}`}
                contentStyle={{
                  background: 'transparent',
                  padding: 0,
                  boxShadow: 'none',
                  border: 'none',
                }}
                contentArrowStyle={{
                  borderRight: '7px solid var(--border-secondary)',
                }}
                iconStyle={{
                  background: 'linear-gradient(135deg, var(--accent-orange), var(--accent-pink))',
                  color: '#fff',
                  boxShadow: '0 0 0 4px color-mix(in srgb, var(--accent-orange) 20%, transparent)',
                }}
                icon={getProjectIcon(project?.projectType)}
                id={`project-${project?._id || `${year}-${index}`}`}
              >
                <ProjectCard project={project} onCardClick={onCardClick} />
              </VerticalTimelineElement>
            ))}
          </React.Fragment>
        );
      })}
    </VerticalTimeline>
  );
};

export default Timeline;
