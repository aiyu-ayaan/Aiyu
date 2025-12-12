"use client";
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

const LinkPreview = ({ url }) => {
    const { theme } = useTheme();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (!url) return;

        const fetchData = async () => {
            try {
                const res = await fetch(`/api/og-preview?url=${encodeURIComponent(url)}`);
                if (res.ok) {
                    const result = await res.json();
                    if (result.title || result.description || result.image) {
                        setData(result);
                    } else {
                        setError(true);
                    }
                } else {
                    setError(true);
                }
            } catch (err) {
                setError(true);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [url]);

    if (error || (!loading && !data)) {
        return (
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                {url}
            </a>
        );
    }

    if (loading) {
        return (
            <div className={`animate-pulse flex space-x-4 p-4 border rounded-lg my-4 max-w-2xl ${theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-100'
                }`}>
                <div className={`h-24 w-24 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                <div className="flex-1 space-y-4 py-1">
                    <div className={`h-4 rounded w-3/4 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                    <div className="space-y-2">
                        <div className={`h-4 rounded ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                        <div className={`h-4 rounded w-5/6 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'}`}></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block no-underline group"
        >
            <div className={`border rounded-lg overflow-hidden transition-colors flex flex-col sm:flex-row max-w-3xl ${theme === 'dark'
                ? 'border-gray-700 bg-gray-800/40 hover:bg-gray-800/60'
                : 'border-gray-300 bg-white/50 hover:bg-gray-50'
                }`}>
                {data.image && (
                    <div className="sm:w-48 h-48 sm:h-auto flex-shrink-0 relative overflow-hidden">
                        <img
                            src={data.image}
                            alt={data.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                    </div>
                )}
                <div className="p-4 flex flex-col justify-center flex-grow min-w-0">
                    <h4 className={`text-lg font-bold mb-2 line-clamp-2 transition-colors ${theme === 'dark'
                        ? 'text-gray-200 group-hover:text-cyan-400'
                        : 'text-gray-800 group-hover:text-cyan-600'
                        }`}>
                        {data.title}
                    </h4>
                    {data.description && (
                        <p className={`text-sm mb-3 line-clamp-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                            {data.description}
                        </p>
                    )}
                    <div className={`flex items-center text-xs mt-auto ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                        }`}>
                        {data.siteName && <span className={`font-medium mr-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                            }`}>{data.siteName}</span>}
                        <span className="truncate">{new URL(url).hostname}</span>
                    </div>
                </div>
            </div>
        </a>
    );
};

export default LinkPreview;
