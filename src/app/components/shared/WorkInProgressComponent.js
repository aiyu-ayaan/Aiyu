"use client";
import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const WorkInProgressComponent = ({
  title = "Currently working on this website",
  description = "This site is under active development. Check back soon for updates!",
  buttonText = "All Links",
  buttonLink = "https://bento.me/aiyu",
  onButtonClick = null
}) => {
  const { theme } = useTheme();

  const handleButtonClick = () => {
    if (onButtonClick) {
      onButtonClick();
    } else {
      window.open(buttonLink, '_blank');
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10 sm:px-6 md:px-10 lg:px-16 transition-colors duration-300"
    >
      <div className="w-full max-w-2xl text-center flex flex-col items-center">

        {/* Animated SVG Icon */}
        <div className="mb-8 w-32 sm:w-40 md:w-48 lg:w-56">
          <svg viewBox="0 0 200 200" className="w-full h-auto animate-bounce">
            <g>
              <polygon points="100,30 130,150 70,150" fill="#FB923C" stroke="#F97316" strokeWidth="2" />
              <rect x="65" y="150" width="70" height="10" fill="#374151" rx="5" />
              <rect x="75" y="60" width="50" height="4" fill="#FFF" opacity="0.8" />
              <rect x="80" y="90" width="40" height="4" fill="#FFF" opacity="0.8" />
              <rect x="85" y="120" width="30" height="4" fill="#FFF" opacity="0.8" />
            </g>
            <g className="origin-center animate-spin" style={{ animationDuration: '3s' }}>
              <circle cx="160" cy="50" r="20" fill="#60A5FA" stroke="#3B82F6" strokeWidth="2" />
              <circle cx="160" cy="50" r="8" fill="#FFF" />
              <rect x="158" y="25" width="4" height="10" fill="#3B82F6" />
              <rect x="158" y="65" width="4" height="10" fill="#3B82F6" />
              <rect x="135" y="48" width="10" height="4" fill="#3B82F6" />
              <rect x="175" y="48" width="10" height="4" fill="#3B82F6" />
            </g>
            <g className="origin-center animate-pulse">
              <rect x="40" y="120" width="25" height="8" fill="#8B4513" transform="rotate(-30 52.5 124)" />
              <rect x="55" y="115" width="15" height="18" fill="#696969" transform="rotate(-30 62.5 124)" />
            </g>
            <circle cx="30" cy="80" r="3" fill="#FFD700" className="animate-ping" />
            <circle cx="170" cy="120" r="2" fill="#F472B6" className="animate-ping" style={{ animationDelay: '0.5s' }} />
            <circle cx="50" cy="40" r="2" fill="#00CED1" className="animate-ping" style={{ animationDelay: '1s' }} />
          </svg>
        </div>

        {/* Title */}
        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 font-mono"
          style={{ color: 'var(--text-bright)' }}
        >
          {title}
        </h1>

        {/* Description */}
        <p
          className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 leading-relaxed font-mono"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {description}
        </p>

        {/* Progress Bar */}
        <div className="mb-6 sm:mb-8 w-full">
          <div
            className="flex justify-between text-xs sm:text-sm mb-2 font-mono"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>Development Progress</span>
            <span>20%</span>
          </div>
          <div
            className="w-full rounded-full h-3"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
          >
            <div
              className="h-3 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: '20%',
                background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))',
              }}
            ></div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 mb-8 text-sm font-mono">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--status-success)' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>Backend Active</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--status-warning)' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>Frontend Building</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--status-info)' }}></div>
            <span style={{ color: 'var(--text-secondary)' }}>Database Optimizing</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleButtonClick}
          className="group relative inline-flex items-center justify-center px-6 py-3 text-base sm:text-lg font-medium text-white rounded-lg transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl font-mono"
          style={{
            background: 'linear-gradient(to right, var(--accent-orange), var(--accent-orange-bright))',
            color: 'var(--bg-primary)'
          }}
        >
          <span className="relative z-10 flex items-center gap-2" style={{ color: 'var(--bg-primary)' }}>
            <span className="font-bold">{buttonText}</span>
            <svg
              className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </span>
          <div
            className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            style={{ background: 'linear-gradient(to right, var(--accent-orange-bright), var(--accent-orange))' }}
          ></div>
        </button>

        {/* Footer Text */}
        <div className="mt-6 text-center">
          <p
            className="text-sm font-mono"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {`// Coming soon with amazing features`}
          </p>
          <p
            className="text-xs mt-1 font-mono"
            style={{ color: 'var(--text-muted)' }}
          >
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkInProgressComponent;
