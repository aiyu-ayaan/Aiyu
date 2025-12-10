"use client";
import React, { useState, useEffect } from 'react';

const LinkPreview = ({ url }) => {
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
            <div className="animate-pulse flex space-x-4 p-4 border border-gray-700 rounded-lg bg-gray-800/50 my-4 max-w-2xl">
                <div className="h-24 w-24 bg-gray-700 rounded"></div>
                <div className="flex-1 space-y-4 py-1">
                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                    <div className="space-y-2">
                        <div className="h-4 bg-gray-700 rounded"></div>
                        <div className="h-4 bg-gray-700 rounded w-5/6"></div>
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
            <div className="border border-gray-700 rounded-lg overflow-hidden bg-gray-800/40 hover:bg-gray-800/60 transition-colors flex flex-col sm:flex-row max-w-3xl">
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
                    <h4 className="text-lg font-bold text-gray-200 mb-2 line-clamp-2 group-hover:text-cyan-400 transition-colors">
                        {data.title}
                    </h4>
                    {data.description && (
                        <p className="text-sm text-gray-400 mb-3 line-clamp-3">
                            {data.description}
                        </p>
                    )}
                    <div className="flex items-center text-xs text-gray-500 mt-auto">
                        {data.siteName && <span className="font-medium text-gray-400 mr-2">{data.siteName}</span>}
                        <span className="truncate">{new URL(url).hostname}</span>
                    </div>
                </div>
            </div>
        </a>
    );
};

export default LinkPreview;
