
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { FaCalendarAlt, FaLaptopCode, FaBoxes, FaWrench } from 'react-icons/fa';
import ProjectCard from './ProjectCard';

const Timeline = ({ projectsByYear, years, onCardClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.8 }}
    >
      <VerticalTimeline>
        

{years.map((year, yearIndex) => (
          <React.Fragment key={year}>
            <VerticalTimelineElement
              contentStyle={{ background: 'rgb(249 115 22)', color: '#fff', boxShadow: '0 3px 0 rgb(249 115 22)' }}
              contentArrowStyle={{ borderRight: '7px solid  rgb(249 115 22)' }}
              iconStyle={{ background: 'rgb(249 115 22)', color: '#fff' }}
              icon={<FaCalendarAlt />}
            >
              <h3 className="vertical-timeline-element-title text-2xl font-bold">{year}</h3>
            </VerticalTimelineElement>
            {projectsByYear[year].map((project, index) => (
              <VerticalTimelineElement
                key={index}
                contentStyle={{ background: 'rgb(31 41 55)', color: '#fff', boxShadow: '0 3px 0 rgb(55 65 81)' }}
                contentArrowStyle={{ borderRight: '7px solid  rgb(31 41 55)' }}
                iconStyle={{ background: 'rgb(55 65 81)', color: '#fff' }}
                icon={project.projectType === 'application' ? <FaLaptopCode /> : project.projectType === 'skill' ? <FaWrench /> : <FaBoxes />}
              >
                <ProjectCard project={project} onCardClick={onCardClick} />
              </VerticalTimelineElement>
            ))}
          </React.Fragment>
        ))}

      </VerticalTimeline>
    </motion.div>
  );
};

export default Timeline;
