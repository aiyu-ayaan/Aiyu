// Web Worker for extracting links from blog content in background thread
const urlRegex = /(https?:\/\/[^\s\)]+)/gi;

// Patterns to exclude from link extraction
const EXCLUDED_PATTERNS = [
  /\.(jpg|jpeg|png|gif|webp|svg|ico|bmp)$/i, // Image extensions
  /\.(pdf|doc|docx|xlsx|zip)$/i, // Document extensions
  /\.(mp4|webm|mov|avi|mkv)$/i, // Video extensions
  /twitter\.com|x\.com|facebook\.com|linkedin\.com|instagram\.com|youtube\.com|github\.com|reddit\.com/i, // Social media
  /gravatar\.com|profile|avatar|cdn\.jsdelivr|cdn\.js|cloudflare|jsdelivr/i, // CDN and avatar services
];

self.onmessage = (event) => {
  const { content, id } = event.data;

  try {
    // Extract links from content
    const matches = content.match(urlRegex) || [];
    
    // Filter and deduplicate links
    const uniqueLinks = Array.from(new Set(matches))
      .filter((link) => {
        try {
          const url = new URL(link);
          const urlString = link.toLowerCase();
          
          // Skip image URLs, social media, CDNs, and other excluded patterns
          for (const pattern of EXCLUDED_PATTERNS) {
            if (pattern.test(urlString)) {
              return false;
            }
          }
          
          // Only accept http/https URLs with valid domain
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      });

    // Send results back to main thread
    self.postMessage({
      id,
      success: true,
      links: uniqueLinks,
    });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error.message,
    });
  }
};
