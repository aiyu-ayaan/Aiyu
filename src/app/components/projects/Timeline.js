
"use client";
import React from 'react';
import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { FaCalendarAlt, FaLaptopCode, FaBoxes, FaWrench } from 'react-icons/fa';
import ProjectCard from './ProjectCard';

const Timeline = ({ projectsByYear, years, onCardClick }) => {
  const getProjectIcon = (projectType) => {
    switch(projectType) {
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
      {years.map((year) => (
        <React.Fragment key={year}>
          <VerticalTimelineElement
            contentStyle={{ 
              background: 'linear-gradient(135deg, rgb(249 115 22), rgb(251 146 60))', 
              color: '#fff',
              boxShadow: '0 8px 32px 0 rgba(249, 115, 22, 0.3)'
            }}
            contentArrowStyle={{ borderRight: '7px solid  rgb(249 115 22)' }}
            iconStyle={{ 
              background: 'rgb(249 115 22)', 
              color: '#fff',
              boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.2)'
            }}
            icon={<FaCalendarAlt />}
          >
            <h3 className="vertical-timeline-element-title text-2xl font-bold">{year}</h3>
          </VerticalTimelineElement>
          {projectsByYear[year].map((project, index) => (
            <VerticalTimelineElement
              key={index}
              contentStyle={{ 
                background: 'rgba(31, 41, 55, 0.8)', 
                color: '#fff',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                padding: '0'
              }}
              contentArrowStyle={{ borderRight: '7px solid rgba(31, 41, 55, 0.8)' }}
              iconStyle={{ 
                background: 'rgb(55 65 81)', 
                color: '#fff',
                boxShadow: '0 0 0 4px rgba(55, 65, 81, 0.2)'
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
