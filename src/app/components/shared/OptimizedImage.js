"use client";
import React, { useState, useRef, useEffect } from 'react';
import useDevicePerformance from '../../hooks/useDevicePerformance';
import useProgressiveImage from '../../hooks/useProgressiveImage';

const OptimizedImage = ({ 
    src, 
    alt, 
    className = "", 
    lowQualitySrc = null,
    placeholder = "blur",
    priority = false,
    sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    ...props 
}) => {
    const { tier, prefersReducedMotion } = useDevicePerformance();
    const [isInView, setIsInView] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const imgRef = useRef(null);

    // Progressive image loading
    const { src: currentSrc, isLoading, error } = useProgressiveImage(
        lowQualitySrc || src, 
        src
    );

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (!imgRef.current || priority) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '50px 0px',
                threshold: 0.01
            }
        );

        observer.observe(imgRef.current);

        return () => observer.disconnect();
    }, [priority]);

    // Adaptive quality based on device performance
    const adaptiveQuality = {
        low: {
            quality: 40,
            format: 'webp',
            loading: 'lazy',
        },
        medium: {
            quality: 60,
            format: 'webp',
            loading: 'lazy',
        },
        high: {
            quality: 75,
            format: 'webp',
            loading: priority ? 'eager' : 'lazy',
        }
    }[tier] || adaptiveQuality.medium;

    const handleLoad = () => {
        setHasLoaded(true);
    };

    const handleError = () => {
        console.warn(`Failed to load image: ${src}`);
    };

    // Placeholder blur effect
    const blurClass = isLoading && placeholder === "blur" ? "filter blur-sm" : "";
    const transitionClass = hasLoaded ? "opacity-100" : "opacity-0";

    return (
        <div 
            ref={imgRef} 
            className={`relative overflow-hidden ${className}`}
            {...props}
        >
            {/* Low-quality placeholder or skeleton */}
            {isLoading && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}

            {/* Main image */}
            {(isInView || priority) && (
                <img
                    src={currentSrc}
                    alt={alt}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${blurClass} ${transitionClass}`}
                    loading={adaptiveQuality.loading}
                    onLoad={handleLoad}
                    onError={handleError}
                    sizes={sizes}
                />
            )}

            {/* Error state */}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                        Failed to load image
                    </span>
                </div>
            )}
        </div>
    );
};

export default OptimizedImage;
