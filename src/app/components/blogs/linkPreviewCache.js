/**
 * Request cache for OG preview data
 * Deduplicates and caches API requests to prevent redundant fetches
 */

const requestCache = new Map();
const requestPromises = new Map();

export const fetchOGPreview = async (url) => {
  if (!url) return null;

  // Check if we have cached data
  if (requestCache.has(url)) {
    return requestCache.get(url);
  }

  // Check if a request is already in flight for this URL
  if (requestPromises.has(url)) {
    return requestPromises.get(url);
  }

  // Create new request promise
  const promise = (async () => {
    try {
      const res = await fetch(`/api/og-preview?url=${encodeURIComponent(url)}`);
      if (res.ok) {
        const result = await res.json();
        if (result.title || result.description || result.image) {
          requestCache.set(url, result);
          return result;
        }
      }
      // Cache null for failed requests to prevent re-fetching
      requestCache.set(url, null);
      return null;
    } catch (err) {
      requestCache.set(url, null);
      return null;
    } finally {
      requestPromises.delete(url);
    }
  })();

  requestPromises.set(url, promise);
  return promise;
};

// Clear cache (optional - useful for testing or manual refresh)
export const clearOGPreviewCache = () => {
  requestCache.clear();
  requestPromises.clear();
};

// Preload multiple URLs
export const preloadOGPreviews = async (urls) => {
  return Promise.all(urls.map(url => fetchOGPreview(url)));
};
