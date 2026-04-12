import { useEffect, useState, useRef, useCallback } from 'react';

const useBackgroundLinkExtraction = (content) => {
  const [extractedLinks, setExtractedLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const workerRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!content) {
      setExtractedLinks([]);
      setIsLoading(false);
      return;
    }

    // Initialize worker on first use
    if (!workerRef.current && typeof window !== 'undefined') {
      try {
        workerRef.current = new Worker(
          new URL('../workers/linkExtractor.worker.js', import.meta.url),
          { type: 'module' }
        );

        // Handle messages from worker
        workerRef.current.onmessage = (event) => {
          const { id, success, links, error } = event.data;
          
          // Only update if this is the most recent request
          if (id === requestIdRef.current) {
            if (success) {
              setExtractedLinks(links);
              setError(null);
            } else {
              setError(error);
              setExtractedLinks([]);
            }
            setIsLoading(false);
          }
        };

        workerRef.current.onerror = (error) => {
          console.error('Worker error:', error);
          setError(error.message);
          setIsLoading(false);
        };
      } catch (err) {
        console.warn('Web Worker not supported, falling back to main thread');
        // Fallback: extract links on main thread
        extractLinksMainThread(content);
      }
    }

    // Send extraction task to worker
    setIsLoading(true);
    const requestId = ++requestIdRef.current;

    if (workerRef.current) {
      workerRef.current.postMessage({
        content,
        id: requestId,
      });
    } else {
      // Fallback for browsers without Worker support
      extractInNextTick(content);
    }

    return () => {
      // Cleanup is handled by the component
    };
  }, [content]);

  const extractLinksMainThread = useCallback((text) => {
    setIsLoading(true);
    // Use setTimeout to defer extraction to next tick
    setTimeout(() => {
      try {
        const urlRegex = /(https?:\/\/[^\s\)]+)/gi;
        const matches = text.match(urlRegex) || [];
        const uniqueLinks = Array.from(new Set(matches)).filter((link) => {
          try {
            new URL(link);
            return true;
          } catch {
            return false;
          }
        });
        setExtractedLinks(uniqueLinks);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }, 0);
  }, []);

  const extractInNextTick = useCallback((text) => {
    // Schedule extraction for next animation frame
    requestAnimationFrame(() => {
      setTimeout(() => {
        extractLinksMainThread(text);
      }, 0);
    });
  }, [extractLinksMainThread]);

  useEffect(() => {
    return () => {
      // Cleanup worker on unmount
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  return { extractedLinks, isLoading, error };
};

export default useBackgroundLinkExtraction;
