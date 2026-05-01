const DEFAULT_SITE_URL = 'https://me.aiyu.co.in';

function normalizeSiteUrl(value) {
    const rawValue = typeof value === 'string' ? value.trim() : '';
    const candidate = rawValue || DEFAULT_SITE_URL;

    try {
        const parsed = new URL(candidate);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return DEFAULT_SITE_URL;
        }
        return parsed.toString().replace(/\/+$/, '');
    } catch {
        return DEFAULT_SITE_URL;
    }
}

export function getSiteUrl() {
    return normalizeSiteUrl(process.env.SITE_URL || process.env.NEXT_PUBLIC_BASE_URL);
}

export function toAbsoluteSiteUrl(pathname = '') {
    const base = getSiteUrl();
    const pathValue = typeof pathname === 'string' ? pathname.trim() : '';
    if (!pathValue) return base;

    const normalizedPath = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
    return `${base}${normalizedPath}`;
}

export function toCanonicalSiteUrl(pathname = '') {
    const base = getSiteUrl();
    const pathValue = typeof pathname === 'string' ? pathname.trim() : '';
    if (!pathValue || pathValue === '/') return base;

    const normalizedPath = pathValue.startsWith('/') ? pathValue : `/${pathValue}`;
    return `${base}${normalizedPath.replace(/\/+$/, '')}`;
}

export function getSafeCanonicalUrl(rawCanonical, fallbackPath = '') {
    const base = getSiteUrl();
    const fallbackUrl = toCanonicalSiteUrl(fallbackPath);
    const canonical = typeof rawCanonical === 'string' ? rawCanonical.trim() : '';

    if (!canonical) {
        return fallbackUrl;
    }

    try {
        const parsedCanonical = new URL(canonical, base);
        const parsedBase = new URL(base);

        if (parsedCanonical.protocol !== 'http:' && parsedCanonical.protocol !== 'https:') {
            return fallbackUrl;
        }

        if (parsedCanonical.origin !== parsedBase.origin) {
            return fallbackUrl;
        }

        const normalizedPath = parsedCanonical.pathname.replace(/\/+$/, '');
        return `${parsedCanonical.origin}${normalizedPath || ''}`;
    } catch {
        return fallbackUrl;
    }
}
