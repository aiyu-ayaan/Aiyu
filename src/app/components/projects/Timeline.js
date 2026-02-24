
"use client";
import React from 'react';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { FaCalendarAlt, FaLaptopCode, FaBoxes, FaWrench } from 'react-icons/fa';
import ProjectCard from './ProjectCard';
import { useTheme } from '../../context/ThemeContext';

const Timeline = ({ projectsByYear, years, onCardClick }) => {
  const { theme } = useTheme();

  const getProjectIcon = (projectType) => {
    switch (projectType) {
      case 'application':
        return <FaLaptopCode />;
      case 'skill':
        return <FaWrench />;
      default:
        return <FaBoxes />;
    }
  };

  return (
    <VerticalTimeline>
      {years.map((year, yearIndex) => (
        <React.Fragment key={year}>
          <VerticalTimelineElement
            contentStyle={{
              background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-secondary) 100%)',
              color: '#fff',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              border: '1px solid var(--border-secondary)',
              borderRadius: '16px',
              padding: '1.5rem',
            }}
            contentArrowStyle={{
              borderRight: '7px solid var(--border-secondary)',
            }}
            iconStyle={{
              background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-purple) 100%)',
              color: '#fff',
              boxShadow: '0 0 15px var(--accent-cyan)',
            }}
            icon={<FaCalendarAlt />}
          >
            <h3
              className="vertical-timeline-element-title text-3xl font-bold"
              style={{
                background: 'linear-gradient(to right, #22d3ee, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {year}
            </h3>
          </VerticalTimelineElement>
          {projectsByYear[year].map((project, index) => (
            <VerticalTimelineElement
              key={index}
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
                background: 'linear-gradient(135deg, var(--accent-orange) 0%, var(--accent-pink) 100%)',
                color: '#fff',
                boxShadow: '0 0 15px var(--accent-orange)',
              }}
              icon={getProjectIcon(project.projectType)}
              id={`project-${project._id}`}
            >
              <ProjectCard project={project} onCardClick={onCardClick} />
            </VerticalTimelineElement>
          ))}
        </React.Fragment>
      ))}
    </VerticalTimeline>
  );
};

export default Timeline;
