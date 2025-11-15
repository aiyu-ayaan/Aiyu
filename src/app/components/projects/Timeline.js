
"use client";
import React from 'react';
import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { FaCalendarAlt, FaLaptopCode, FaBoxes, FaWrench } from 'react-icons/fa';
import ProjectCard from './ProjectCard';

const Timeline = ({ projectsByYear, years, onCardClick }) => {
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
              background: 'linear-gradient(135deg, rgb(6 182 212) 0%, rgb(59 130 246) 100%)',
              color: '#fff',
              boxShadow: '0 10px 30px rgba(6, 182, 212, 0.3)',
              border: 'none'
            }}
            contentArrowStyle={{ 
              borderRight: '7px solid rgb(6 182 212)'
            }}
            iconStyle={{ 
              background: 'linear-gradient(135deg, rgb(6 182 212) 0%, rgb(59 130 246) 100%)',
              color: '#fff',
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)'
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
                background: 'linear-gradient(135deg, rgb(31 41 55) 0%, rgb(17 24 39) 100%)',
                color: '#fff',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                border: '1px solid rgb(55 65 81)',
                borderRadius: '16px'
              }}
              contentArrowStyle={{ 
                borderRight: '7px solid rgb(31 41 55)'
              }}
              iconStyle={{ 
                background: 'linear-gradient(135deg, rgb(249 115 22) 0%, rgb(251 146 60) 100%)',
                color: '#fff',
                boxShadow: '0 0 20px rgba(249, 115, 22, 0.5)'
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
