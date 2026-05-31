"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import QuestNode from './QuestNode';
import { FaFlagCheckered } from 'react-icons/fa';

const QuestMap = ({ items = [], title = "Quest Map", icon: Icon, zoneType = "experience" }) => {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(320); // Default to a safe mobile width
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Measure container width for responsive coordinate projection
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Use lightweight handler
    const handleResize = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    handleResize();
    
    // Add lightweight resize listener
    let resizeTimer;
    const optimizedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(handleResize, 100);
    };
    
    window.addEventListener('resize', optimizedResize);
    return () => {
      window.removeEventListener('resize', optimizedResize);
      clearTimeout(resizeTimer);
    };
  }, [isMounted]);

  const isMobile = containerWidth < 640;
  const isTablet = containerWidth >= 640 && containerWidth < 1024;

  // Layout constants
  const spacing = isMobile ? 360 : 180;
  const swayWidth = isMobile
    ? containerWidth * 0.15
    : isTablet
    ? containerWidth * 0.22
    : containerWidth * 0.26;
  const centerX = containerWidth / 2;

  // Calculate pixel coordinates for each node
  const points = items.map((_, idx) => {
    // Alternates Left (-1) and Right (1)
    const direction = idx % 2 === 0 ? -1 : 1;
    const x = centerX + direction * swayWidth;
    const y = idx * spacing + spacing / 2;
    return { x, y };
  });

  const totalHeight = points.length * spacing;

  // Scroll observer to automatically trigger active states on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || points.length === 0) return;
      const rect = containerRef.current.getBoundingClientRect();
      const targetY = window.innerHeight * 0.45; // Focus target 45% down viewport
      const relativeTargetY = targetY - rect.top;

      let closestIndex = 0;
      let minDistance = Infinity;

      points.forEach((pt, idx) => {
        const distance = Math.abs(pt.y - relativeTargetY);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = idx;
        }
      });

      setActiveNodeIndex(closestIndex);
    };

    handleScroll();
    
    // Add optimized, passive scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [containerWidth, items.length]);

  if (!isMounted) {
    return (
      <div className="relative w-full rounded-3xl border p-4 sm:p-6 animate-pulse"
        style={{
          background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 96%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
          borderColor: 'color-mix(in srgb, var(--border-secondary) 80%, transparent)',
          boxShadow: '0 8px 24px var(--shadow-sm)',
        }}
      >
        <div className="h-6 w-48 bg-[var(--bg-elevated)] rounded mb-4" />
        <div className="h-[220px] bg-[var(--bg-elevated)] rounded-2xl animate-pulse opacity-40" />
      </div>
    );
  }

  if (!items || items.length === 0) return null;

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
    if (nodePoint && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const xPercent = (rect.left + nodePoint.x) / window.innerWidth;
      const yPercent = (rect.top + nodePoint.y) / window.innerHeight;
      
      confetti({
        particleCount: 50,
        spread: 45,
        origin: { x: xPercent, y: yPercent },
        colors: zoneType === 'experience' 
          ? ['#22d3ee', '#fb923c'] 
          : zoneType === 'education'
          ? ['#c084fc', '#a855f7']
          : ['#f43f5e', '#fb7185'],
      });
    }
  };

  // Character Avatar coordinates
  const activePoint = points[activeNodeIndex] || { x: centerX, y: spacing / 2 };

  // Setup color tokens for trail based on zoneType
  const getTrailColors = () => {
    switch (zoneType) {
      case 'experience':
        return {
          gradientId: 'experienceTrailGrad',
          color1: 'var(--accent-cyan)',
          color2: 'var(--accent-orange)',
          badgeColor: 'border-orange-500/20 text-orange-400 bg-orange-950/20',
        };
      case 'education':
        return {
          gradientId: 'educationTrailGrad',
          color1: 'var(--accent-purple)',
          color2: 'var(--accent-purple-dark, #a855f7)',
          badgeColor: 'border-purple-500/20 text-purple-400 bg-purple-950/20',
        };
      case 'certification':
        return {
          gradientId: 'certificationTrailGrad',
          color1: 'var(--accent-pink)',
          color2: 'var(--accent-orange-bright)',
          badgeColor: 'border-pink-500/20 text-pink-400 bg-pink-950/20',
        };
      default:
        return {
          gradientId: 'defaultTrailGrad',
          color1: 'var(--accent-cyan)',
          color2: 'var(--accent-purple)',
          badgeColor: 'border-cyan-500/20 text-cyan-400 bg-cyan-950/20',
        };
    }
  };

  const themeColors = getTrailColors();

  return (
    <div className="relative w-full rounded-3xl border p-4 sm:p-6"
      style={{
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--bg-surface) 96%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
        borderColor: 'color-mix(in srgb, var(--border-secondary) 80%, transparent)',
        boxShadow: '0 8px 24px var(--shadow-sm)',
      }}
    >
      {/* Chapter header */}
      <div className="mb-6 flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-secondary)' }}>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="text-xl" style={{ color: themeColors.color1 }} />}
          <h3 className="text-lg font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h3>
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border px-2 py-0.5 rounded ${themeColors.badgeColor}`}>
          <FaFlagCheckered /> {items.length} Levels
        </div>
      </div>

      {/* Main Game Board relative wrapper */}
      <div
        ref={containerRef}
        className="relative transition-all duration-300"
        style={{ height: `${totalHeight}px`, minHeight: '220px' }}
      >
        {/* SVG Serpentine Trail (Optimized: No heavy CPU Gaussian Blur filters) */}
        {points.length > 0 && (
          <svg
            className="pointer-events-none absolute left-0 top-0 h-full w-full"
            style={{ zIndex: 1 }}
          >
            <defs>
              <linearGradient id={themeColors.gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={themeColors.color1} stopOpacity="0.8" />
                <stop offset="100%" stopColor={themeColors.color2} stopOpacity="0.8" />
              </linearGradient>
            </defs>

            {/* Glowing background path (Clean overlay - no filter, extremely high performance) */}
            <path
              d={pathD}
              fill="none"
              stroke={`url(#${themeColors.gradientId})`}
              strokeWidth={isMobile ? '8' : '12'}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-[0.12] transition-all"
            />

            {/* Main dashed overlay trail */}
            <path
              d={pathD}
              fill="none"
              stroke={`url(#${themeColors.gradientId})`}
              strokeWidth={isMobile ? '3' : '5'}
              strokeDasharray="10, 10"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDashoffset: 100,
                animation: 'dashMove 25s linear infinite',
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
              top: activePoint.y - 10,
            }}
            transition={{
              type: 'spring',
              stiffness: 80,
              damping: 14,
            }}
            className="absolute z-30 -translate-x-1/2 -translate-y-1/2 cursor-pointer pointer-events-none"
          >
            {/* The Developer Character */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border bg-slate-950 text-xl shadow-lg"
              style={{
                borderColor: themeColors.color1,
                boxShadow: `0 4px 12px color-mix(in srgb, ${themeColors.color1} 30%, transparent)`,
              }}
            >
              👾
            </motion.div>
            {/* Balloon tooltip */}
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded px-1.5 py-0.5 text-[8px] font-bold text-slate-950 uppercase shadow whitespace-nowrap"
              style={{ backgroundColor: themeColors.color1 }}
            >
              You
            </div>
          </motion.div>
        )}

        {/* Render Quest Level Nodes */}
        {points.map((pt, idx) => (
          <QuestNode
            key={`${zoneType}-${idx}`}
            item={items[idx]}
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
