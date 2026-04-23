export const stripMarkdown = (markdown) => {
  if (!markdown) return '';

  return String(markdown)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`{3,}[\s\S]*?`{3,}/g, '')
    .replace(/`(.+?)`/g, '$1')
    .replace(/^\s*>\s+/gm, '')
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
};

export const generateSlug = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

export const getReadTime = (content = '') => {
  const words = stripMarkdown(content).split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
};

export const getBlogInitials = (title) => {
  const tokens = String(title || '').match(/[\p{L}\p{N}]+/gu) || [];

  if (tokens.length === 0) return 'BL';
  if (tokens.length === 1) {
    return Array.from(tokens[0]).slice(0, 2).join('').toUpperCase();
  }

  const first = Array.from(tokens[0])[0] || '';
  const second = Array.from(tokens[1])[0] || '';
  const initials = `${first}${second}`.toUpperCase();
  return initials || 'BL';
};

export const getBlogPlaceholderGradient = (title) => {
  const gradients = [
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-cyan) 24%, var(--bg-surface)), color-mix(in srgb, var(--accent-purple) 18%, var(--bg-secondary)))',
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-orange) 24%, var(--bg-surface)), color-mix(in srgb, var(--accent-pink) 18%, var(--bg-secondary)))',
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-purple) 24%, var(--bg-surface)), color-mix(in srgb, var(--accent-cyan) 17%, var(--bg-secondary)))',
    'linear-gradient(135deg, color-mix(in srgb, var(--accent-pink) 24%, var(--bg-surface)), color-mix(in srgb, var(--accent-orange) 17%, var(--bg-secondary)))',
  ];

  const safeTitle = String(title || '');
  const hash = Array.from(safeTitle).reduce((accumulator, char) => accumulator + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

export const formatBlogDate = (dateValue) => {
  if (!dateValue) return 'Unknown Date';
  const parsedDate = new Date(dateValue);
  if (Number.isNaN(parsedDate.getTime())) return String(dateValue);

  return parsedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

// Memoized regexes for better performance
const MD_LINK_REGEX = /\[.*?\]\((https?:\/\/[^\)]+)\)/g;
const RAW_LINK_REGEX = /(?<!\()(https?:\/\/[^\s\)>"\]]+)/g;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|svg)$/i;
const IP_REGEX = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/; // IPv4 regex
const IPV6_REGEX = /^\[?([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}\]?(:\d+)?$/; // IPv6 regex

const isLocalhostOrIpLink = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname || '';

    // Check for localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return true;
    }

    // Check for IPv4 addresses
    if (IP_REGEX.test(hostname)) {
      return true;
    }

    // Check for IPv6 addresses
    if (IPV6_REGEX.test(hostname)) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
};

export const extractLinksFromContent = (content) => {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const urls = new Set();

  // Extract markdown links
  let match;
  MD_LINK_REGEX.lastIndex = 0;
  while ((match = MD_LINK_REGEX.exec(content)) !== null) {
    if (match.index > 0 && content[match.index - 1] === '!') {
      continue;
    }
    urls.add(match[1]);
  }

  // Extract raw links
  RAW_LINK_REGEX.lastIndex = 0;
  while ((match = RAW_LINK_REGEX.exec(content)) !== null) {
    urls.add(match[1]);
  }

  // Filter out image URLs, localhost, and IP-based links
  return Array.from(urls).filter(
    (url) => !IMAGE_EXTENSIONS.test(url) && !isLocalhostOrIpLink(url)
  );
};
