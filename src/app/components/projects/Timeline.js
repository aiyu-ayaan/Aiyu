
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
              background: theme === 'dark'
                ? 'linear-gradient(135deg, rgb(34 211 238) 0%, rgb(59 130 246) 100%)'
                : 'linear-gradient(135deg, rgb(8 145 178) 0%, rgb(37 99 235) 100%)',
              color: '#fff',
              boxShadow: theme === 'dark'
                ? '0 10px 30px rgba(34, 211, 238, 0.3)'
                : '0 10px 30px rgba(8, 145, 178, 0.3)',
              border: 'none'
            }}
            contentArrowStyle={{ 
              borderRight: theme === 'dark'
                ? '7px solid rgb(34 211 238)'
                : '7px solid rgb(8 145 178)',
            }}
            iconStyle={{ 
              background: theme === 'dark'
                ? 'linear-gradient(135deg, rgb(34 211 238) 0%, rgb(59 130 246) 100%)'
                : 'linear-gradient(135deg, rgb(8 145 178) 0%, rgb(37 99 235) 100%)',
              color: '#fff',
              boxShadow: theme === 'dark'
                ? '0 0 20px rgba(34, 211, 238, 0.5)'
                : '0 0 20px rgba(8, 145, 178, 0.5)',
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
                background: theme === 'dark'
                  ? 'linear-gradient(135deg, rgb(31 41 55) 0%, rgb(17 24 39) 100%)'
                  : 'linear-gradient(135deg, rgb(241 245 249) 0%, rgb(226 232 240) 100%)',
                color: theme === 'dark' ? '#fff' : '#1e293b',
                boxShadow: theme === 'dark'
                  ? '0 10px 30px rgba(0, 0, 0, 0.3)'
                  : '0 10px 30px rgba(0, 0, 0, 0.1)',
                border: theme === 'dark' ? '1px solid rgb(55 65 81)' : '1px solid rgb(203 213 225)',
                borderRadius: '16px'
              }}
              contentArrowStyle={{ 
                borderRight: theme === 'dark'
                  ? '7px solid rgb(31 41 55)'
                  : '7px solid rgb(241 245 249)',
              }}
              iconStyle={{ 
                background: theme === 'dark'
                  ? 'linear-gradient(135deg, rgb(249 115 22) 0%, rgb(251 146 60) 100%)'
                  : 'linear-gradient(135deg, rgb(234 88 12) 0%, rgb(249 115 22) 100%)',
                color: '#fff',
                boxShadow: theme === 'dark'
                  ? '0 0 20px rgba(249, 115, 22, 0.5)'
                  : '0 0 20px rgba(234, 88, 12, 0.5)',
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
