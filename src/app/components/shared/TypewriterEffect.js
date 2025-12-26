"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

const TypewriterEffect = ({ roles }) => {
  const { theme } = useTheme();
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  const timeoutRef = useRef(null);
  const cursorIntervalRef = useRef(null);

  useEffect(() => {
    const currentRole = roles[currentIndex];
    let charIndex = 0;
    let isDeleting = false;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const typeWriter = () => {
      if (!isDeleting) {
        if (charIndex < currentRole.length) {
          setDisplayedText(currentRole.substring(0, charIndex + 1));
          charIndex++;
          timeoutRef.current = setTimeout(typeWriter, 100);
        } else {
          timeoutRef.current = setTimeout(() => {
            isDeleting = true;
            typeWriter();
          }, 2000);
        }
      } else {
        if (charIndex > 0) {
          setDisplayedText(currentRole.substring(0, charIndex - 1));
          charIndex--;
          timeoutRef.current = setTimeout(typeWriter, 50);
        } else {
          setCurrentIndex((prev) => (prev + 1) % roles.length);
        }
      }
    };

    typeWriter();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentIndex, roles]);

  useEffect(() => {
    cursorIntervalRef.current = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 500);

    return () => {
      if (cursorIntervalRef.current) {
        clearInterval(cursorIntervalRef.current);
      }
    };
  }, []);

  return (
    <p
      className="text-lg sm:text-xl"
      style={{ color: 'var(--accent-cyan)' }}
    >
      &gt; {displayedText}
      <span className={`${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity duration-100`}>|</span>
    </p>
  );
};

export default TypewriterEffect;