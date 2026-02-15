"use client";
import { useState, useEffect } from 'react';

const useProgressiveImage = (lowQualitySrc, highQualitySrc) => {
    const [src, setSrc] = useState(lowQualitySrc);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setSrc(lowQualitySrc);
        setIsLoading(true);
        setError(null);

        if (!highQualitySrc) {
            setIsLoading(false);
            return;
        }

        const img = new Image();
        img.src = highQualitySrc;

        img.onload = () => {
            setSrc(highQualitySrc);
            setIsLoading(false);
        };

        img.onerror = () => {
            setError(new Error('Failed to load image'));
            setIsLoading(false);
        };

        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [lowQualitySrc, highQualitySrc]);

    return { src, isLoading, error };
};

export default useProgressiveImage;
