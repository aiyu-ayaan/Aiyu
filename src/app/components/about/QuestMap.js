"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, useAnimation } from 'framer-motion';
import confetti from 'canvas-confetti';
import QuestNode from './QuestNode';
import { FaFlagCheckered, FaMapSigns } from 'react-icons/fa';

const QuestMap = ({ data }) => {
  const { experiences = [], education = [], certifications = [] } = data || {};
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);

  // Group into single combined list of items
  // Chronological group: Experience (Zone 1) -> Education (Zone 2) -> Certifications (Zone 3)
  const experiencesMapped = experiences.map((exp) => ({
    ...exp,
    type: 'experience',
  }));

  const educationMapped = education.map((edu) => ({
    ...edu,
    type: 'education',
    company: edu.institution,
    role: edu.degree,
    description: edu.cgpa ? `CGPA: ${edu.cgpa}` : '',
  }));

  const certificationsMapped = certifications.map((cert) => ({
    ...cert,
    type: 'certification',
    company: cert.issuer,
    role: cert.name,
    duration: cert.date,
  }));

  const combinedNodes = [
    ...experiencesMapped,
    ...educationMapped,
    ...certificationsMapped,
  ];

  // Measure container width for responsive coordinate projection
  useEffect(() => {
    if (!containerRef.current) return;
    const handleResize = () => {
      setContainerWidth(containerRef.current.offsetWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = containerWidth < 640;
  const isTablet = containerWidth >= 640 && containerWidth < 1024;

  // Layout constants
  const spacing = isMobile ? 150 : 200;
  const swayWidth = isMobile
    ? containerWidth * 0.15
    : isTablet
    ? containerWidth * 0.22
    : containerWidth * 0.26;
  const centerX = containerWidth / 2;

  // Calculate pixel coordinates for each node
  const points = combinedNodes.map((_, idx) => {
    // Alternates Left (-1) and Right (1)
    const direction = idx % 2 === 0 ? -1 : 1;
    const x = centerX + direction * swayWidth;
    const y = idx * spacing + spacing / 2;
    return { x, y };
  });

  const totalHeight = points.length * spacing;

  // Winding SVG path generator
  let pathD = '';
  points.forEach((pt, idx) => {
    if (idx === 0) {
      pathD += `M ${pt.x} ${pt.y}`;
    } else {
      const prev = points[idx - 1];
      const cp1x = prev.x;
      const cp1y = prev.y + spacing * 0.5;
      const cp2x = pt.x;
      const cp2y = pt.y - spacing * 0.5;
      pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
    }
  });

  const handleNodeClick = (index) => {
    setActiveNodeIndex(index);
    
    // Celebratory confetti explosion
    const nodePoint = points[index];
    if (nodePoint) {
      const xPercent = nodePoint.x / containerWidth;
      
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { x: xPercent, y: 0.5 },
        colors: ['#22d3ee', '#c084fc', '#f43f5e', '#fb923c'],
      });
    }
  };

  // Character Avatar coordinates
  const activePoint = points[activeNodeIndex] || { x: centerX, y: spacing / 2 };

  return (
    <div className="relative w-full rounded-3xl border p-4 sm:p-8"
      style={{
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 96%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
        borderColor: 'color-mix(in srgb, var(--border-secondary) 80%, transparent)',
        boxShadow: '0 12px 36px var(--shadow-sm)',
      }}
    >
      {/* Chapter header */}
      <div className="mb-8 flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-secondary)' }}>
        <div className="flex items-center gap-2">
          <FaMapSigns className="text-xl text-cyan-400" />
          <h2 className="text-xl font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            Career Quest Adventure Map
          </h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold uppercase tracking-wider bg-amber-950/20 border border-amber-500/20 px-2 py-0.5 rounded">
          <FaFlagCheckered /> {combinedNodes.length} Levels
        </div>
      </div>

      {/* Main Game Board relative wrapper */}
      <div
        ref={containerRef}
        className="relative overflow-hidden transition-all duration-300"
        style={{ height: `${totalHeight}px`, minHeight: '300px' }}
      >
        {/* SVG Serpentine Trail */}
        {points.length > 0 && (
          <svg
            className="pointer-events-none absolute left-0 top-0 h-full w-full"
            style={{ zIndex: 1 }}
          >
            <defs>
              <linearGradient id="questTrailGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity="0.8" />
                <stop offset="50%" stopColor="var(--accent-purple)" stopOpacity="0.8" />
                <stop offset="100%" stopColor="var(--accent-pink)" stopOpacity="0.8" />
              </linearGradient>
              <filter id="glowFilter">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            {/* Glowing background path */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#questTrailGradient)"
              strokeWidth={isMobile ? '6' : '10'}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glowFilter)"
              opacity="0.35"
            />

            {/* Main dashed overlay trail */}
            <path
              d={pathD}
              fill="none"
              stroke="url(#questTrailGradient)"
              strokeWidth={isMobile ? '4' : '6'}
              strokeDasharray="12, 12"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDashoffset: 100,
                animation: 'dashMove 20s linear infinite',
              }}
            />
          </svg>
        )}

        {/* Global style override to animate SVG dashoffset */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes dashMove {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}} />

        {/* Character Avatar (Hops bouncily from level to level) */}
        {points.length > 0 && (
          <motion.div
            animate={{
              left: activePoint.x,
              top: activePoint.y - 12,
            }}
            transition={{
              type: 'spring',
              stiffness: 70,
              damping: 12,
            }}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer pointer-events-none"
          >
            {/* Pulsing ring indicator */}
            <motion.div
              animate={{ scale: [0.8, 1.4, 0.8], opacity: [0.5, 0.1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -inset-4 rounded-full border-2 border-cyan-400 bg-cyan-400/5 blur-sm"
            />
            {/* The Developer Character */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-white bg-slate-950 text-2xl shadow-2xl"
              style={{
                borderColor: 'var(--accent-cyan)',
                boxShadow: '0 8px 24px rgba(34, 211, 238, 0.4), inset 0 0 10px rgba(34, 211, 238, 0.2)',
              }}
            >
              👾
            </motion.div>
            {/* Balloon tooltip */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-cyan-400 px-2 py-0.5 text-[9px] font-bold text-slate-950 uppercase shadow-md whitespace-nowrap">
              You
            </div>
          </motion.div>
        )}

        {/* Render Quest Level Nodes */}
        {points.map((pt, idx) => (
          <QuestNode
            key={`${combinedNodes[idx].type}-${idx}`}
            item={combinedNodes[idx]}
            index={idx}
            x={pt.x}
            y={pt.y}
            isActive={idx === activeNodeIndex}
            isUnlocked={true}
            onNodeClick={handleNodeClick}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
};

export default QuestMap;
