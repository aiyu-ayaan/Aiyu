"use client";
import React from 'react';
import { VerticalTimeline, VerticalTimelineElement }  from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import StartNode from './StartNode';
import YearNode from './YearNode';
import EndNode from './EndNode';
import ProjectCard from './ProjectCard';

const Timeline = ({ projectsByYear, years, onCardClick }) => {
  return (
    <VerticalTimeline>
      <VerticalTimelineElement
        iconStyle={{ background: 'transparent', boxShadow: 'none' }}
        icon={<StartNode />}
      />

      {years.map((year) => (
        <React.Fragment key={year}>
          <VerticalTimelineElement
            iconStyle={{ background: 'transparent', boxShadow: 'none' }}
            icon={<YearNode year={year} />}
          />
          {projectsByYear[year].map((project, index) => (
            <VerticalTimelineElement
              key={index}
              contentStyle={{ background: 'rgb(31 41 55)', color: '#fff' }}
              contentArrowStyle={{ borderRight: '7px solid  rgb(31 41 55)' }}
              iconStyle={{ background: 'rgb(55 65 81)', color: '#fff' }}
            >
              <ProjectCard project={project} onCardClick={onCardClick} />
            </VerticalTimelineElement>
          ))}
        </React.Fragment>
      ))}

      <VerticalTimelineElement
        iconStyle={{ background: 'transparent', boxShadow: 'none' }}
        icon={<EndNode />}
      />
    </VerticalTimeline>
  );
};

export default Timeline;