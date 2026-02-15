"use client";
import React, { useState, useEffect } from 'react';
import useDevicePerformance from '../../hooks/useDevicePerformance';

const ResponsiveContainer = ({ 
    children, 
    className = "", 
    breakpoints = {
        mobile: "max-w-sm",
        tablet: "max-w-md", 
        desktop: "max-w-7xl"
    }
}) => {
    const { tier, prefersReducedMotion } = useDevicePerformance();
    const [screenSize, setScreenSize] = useState('desktop');
    const [containerSize, setContainerSize] = useState(breakpoints.desktop);

    useEffect(() => {
        const updateScreenSize = () => {
            const width = window.innerWidth;
            if (width < 640) {
                setScreenSize('mobile');
                setContainerSize(breakpoints.mobile);
            } else if (width < 1024) {
                setScreenSize('tablet');
                setContainerSize(breakpoints.tablet);
            } else {
                setScreenSize('desktop');
                setContainerSize(breakpoints.desktop);
            }
        };

        updateScreenSize();
        window.addEventListener('resize', updateScreenSize);
        return () => window.removeEventListener('resize', updateScreenSize);
    }, [breakpoints]);

    // Adaptive spacing based on screen size and device performance
    const adaptiveSpacing = {
        mobile: {
            padding: tier === 'low' ? 'p-2' : 'p-4',
            gap: tier === 'low' ? 'gap-2' : 'gap-4',
            margin: tier === 'low' ? 'm-2' : 'm-4',
        },
        tablet: {
            padding: tier === 'low' ? 'p-4' : 'p-6',
            gap: tier === 'low' ? 'gap-4' : 'gap-6',
            margin: tier === 'low' ? 'm-4' : 'm-6',
        },
        desktop: {
            padding: tier === 'low' ? 'p-6' : 'p-8',
            gap: tier === 'low' ? 'gap-6' : 'gap-8',
            margin: tier === 'low' ? 'm-6' : 'm-8',
        }
    }[screenSize];

    // Adaptive text sizes
    const adaptiveText = {
        mobile: {
            heading: 'text-2xl sm:text-3xl',
            subheading: 'text-lg sm:text-xl',
            body: 'text-sm sm:text-base',
            small: 'text-xs sm:text-sm',
        },
        tablet: {
            heading: 'text-3xl md:text-4xl',
            subheading: 'text-xl md:text-2xl',
            body: 'text-base md:text-lg',
            small: 'text-sm md:text-base',
        },
        desktop: {
            heading: 'text-4xl lg:text-5xl xl:text-6xl',
            subheading: 'text-2xl lg:text-3xl',
            body: 'text-lg lg:text-xl',
            small: 'text-base lg:text-lg',
        }
    }[screenSize];

    return (
        <div 
            className={`
                w-full mx-auto 
                ${containerSize} 
                ${adaptiveSpacing.padding} 
                ${adaptiveSpacing.gap} 
                ${adaptiveSpacing.margin}
                ${className}
            `}
        >
            {/* Responsive grid system */}
            <div className={`
                grid grid-cols-1 
                ${screenSize === 'tablet' ? 'md:grid-cols-2' : ''}
                ${screenSize === 'desktop' ? 'lg:grid-cols-3 xl:grid-cols-4' : ''}
                gap-4 md:gap-6 lg:gap-8
                auto-rows-auto
            `}>
                {React.Children.map(children, (child, index) => (
                    <div 
                        key={index}
                        className={`
                            col-span-1
                            ${screenSize === 'desktop' && index === 0 ? 'lg:col-span-2 xl:col-span-3' : ''}
                            ${screenSize === 'tablet' && index === 0 ? 'md:col-span-2' : ''}
                        `}
                    >
                        {child}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResponsiveContainer;
