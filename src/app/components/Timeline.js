
"use client";
import React from 'react';
import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { FaCalendarAlt, FaLaptopCode, FaBoxes } from 'react-icons/fa';
import ProjectCard from './ProjectCard';

const Timeline = ({ projectsByYear, years, onCardClick }) => {
  return (
    <VerticalTimeline>
      

{years.map((year) => (
        <React.Fragment key={year}>
          <VerticalTimelineElement
            contentStyle={{ background: 'rgb(249 115 22)', color: '#fff' }}
            contentArrowStyle={{ borderRight: '7px solid  rgb(249 115 22)' }}
            iconStyle={{ background: 'rgb(249 115 22)', color: '#fff' }}
            icon={<FaCalendarAlt />}
          >
            <h3 className="vertical-timeline-element-title">{year}</h3>
          </VerticalTimelineElement>
          {projectsByYear[year].map((project, index) => (
            <VerticalTimelineElement
              key={index}
              contentStyle={{ background: 'rgb(31 41 55)', color: '#fff' }}
              contentArrowStyle={{ borderRight: '7px solid  rgb(31 41 55)' }}
              iconStyle={{ background: 'rgb(55 65 81)', color: '#fff' }}
              icon={project.projectType === 'application' ? <FaLaptopCode /> : <FaBoxes />}
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
