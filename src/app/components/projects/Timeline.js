
"use client";
import React from 'react';
import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';
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
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-secondary)',
              boxShadow: '0 2px 8px var(--shadow-sm)',
            }}
            contentArrowStyle={{ 
              borderRight: '7px solid var(--bg-surface)',
            }}
            iconStyle={{ 
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
              border: '2px solid var(--border-secondary)',
              boxShadow: 'none',
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
                background: 'var(--bg-elevated)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-secondary)',
                borderRadius: '8px',
                boxShadow: '0 2px 8px var(--shadow-sm)',
              }}
              contentArrowStyle={{ 
                borderRight: '7px solid var(--bg-elevated)',
              }}
              iconStyle={{ 
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '2px solid var(--border-secondary)',
                boxShadow: 'none',
              }}
              icon={getProjectIcon(project.projectType)}
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
