
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
              background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-purple) 100%)',
              color: '#fff',
              boxShadow: '0 10px 30px var(--shadow-lg)',
              border: 'none'
            }}
            contentArrowStyle={{
              borderRight: '7px solid var(--accent-cyan)',
            }}
            iconStyle={{
              background: 'linear-gradient(135deg, var(--accent-cyan) 0%, var(--accent-purple) 100%)',
              color: '#fff',
              boxShadow: '0 0 20px var(--shadow-glow)',
            }}
            icon={<FaCalendarAlt />}
          >
            <h3 className="vertical-timeline-element-title text-2xl font-bold">
              {year}
            </h3>
          </VerticalTimelineElement>
          {projectsByYear[year].map((project, index) => (
            <VerticalTimelineElement
              key={index}
              contentStyle={{
                background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-secondary) 100%)',
                color: 'var(--text-primary)',
                boxShadow: '0 10px 30px var(--shadow-md)',
                border: '1px solid var(--border-secondary)',
                borderRadius: '16px'
              }}
              contentArrowStyle={{
                borderRight: '7px solid var(--bg-surface)',
              }}
              iconStyle={{
                background: 'linear-gradient(135deg, var(--accent-orange) 0%, var(--accent-orange-bright) 100%)',
                color: '#fff',
                boxShadow: '0 0 20px var(--shadow-glow)',
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
