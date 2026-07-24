/**
 * Blog Review Engine Module
 * Evaluates blog post payloads to detect test/demo/spam posts and flag them for admin review.
 */

// Default regex patterns for common test/placeholder blog posts
const DEFAULT_TEST_PATTERNS = [
    { pattern: /\btest\s*blogs?\b/i, label: "Matches test blog pattern" },
    { pattern: /\b(test|testing)\b/i, label: "Contains keyword 'test'" },
    { pattern: /\b(demo|sample)\s*(post|blog|article)?\b/i, label: "Contains demo/sample indicator" },
    { pattern: /\blorem\s+ipsum\b/i, label: "Contains placeholder text 'lorem ipsum'" },
    { pattern: /\bfoo\s*bar\b/i, label: "Contains dummy pattern 'foo bar'" },
    { pattern: /\b(asdf|qwerty|zxcv)\b/i, label: "Contains keyboard smash sequence" },
    { pattern: /\bhello\s+world\b/i, label: "Contains generic 'hello world'" },
    { pattern: /\bdummy\s*(post|content|blog)?\b/i, label: "Contains 'dummy' placeholder indicator" },
];

const DUMMY_DOMAINS = ["example.com", "test.com", "foo.bar", "localhost"];
const MINIMUM_CONTENT_LENGTH = 30;

/**
 * Normalizes input arrays or strings for analysis
 */
function extractSearchableText(payload = {}) {
    const title = String(payload.title || '').trim();
    const content = String(payload.content || '').trim();
    const excerpt = String(payload.excerpt || '').trim();
    const slug = String(payload.slug || '').trim();
    const tags = Array.isArray(payload.tags) ? payload.tags.join(' ') : String(payload.tags || '');
    const keywords = Array.isArray(payload.keywords) ? payload.keywords.join(' ') : String(payload.keywords || '');

    return {
        title,
        content,
        excerpt,
        slug,
        tags,
        keywords,
        fullText: `${title} ${excerpt} ${tags} ${keywords} ${slug}`.toLowerCase(),
    };
}

/**
 * Parses user-configured custom test keywords into regex patterns.
 * Supports comma or newline separated strings.
 */
function parseCustomKeywords(rawInput) {
    if (!rawInput) return [];
    const keywords = Array.isArray(rawInput)
        ? rawInput
        : String(rawInput).split(/[\n,]+/).map((k) => k.trim()).filter(Boolean);

    return keywords.map((word) => {
        // Escape special regex characters
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return {
            pattern: new RegExp(`\\b${escaped}\\b`, 'i'),
            label: `Matches custom test keyword: '${word}'`,
        };
    });
}

/**
 * Main evaluation function
 * @param {Object} payload Blog payload object
 * @param {Object} [config] Configuration options (e.g. custom keywords, engine toggle)
 * @returns {{ isFlagged: boolean, flagReason: string, reviewStatus: string }}
 */
export function evaluateBlogForReview(payload = {}, config = {}) {
    // If review engine is explicitly disabled in config, pass through cleanly
    if (config.enableBlogReviewEngine === false) {
        return { isFlagged: false, flagReason: '', reviewStatus: 'CLEAN' };
    }

    const { title, content, excerpt, slug, tags, keywords, fullText } = extractSearchableText(payload);
    const reasons = [];

    // 1. Check title and full text against default test patterns
    for (const { pattern, label } of DEFAULT_TEST_PATTERNS) {
        if (pattern.test(title)) {
            reasons.push(`Title ${label.toLowerCase()}`);
            break; // One title match is sufficient
        } else if (pattern.test(fullText)) {
            reasons.push(`Metadata/excerpt ${label.toLowerCase()}`);
            break;
        } else if (pattern.test(content)) {
            reasons.push(`Content ${label.toLowerCase()}`);
            break;
        }
    }

    // 2. Check custom configured keywords if present
    const customPatterns = parseCustomKeywords(config.customTestKeywords);
    for (const { pattern, label } of customPatterns) {
        if (pattern.test(title) || pattern.test(content) || pattern.test(fullText)) {
            reasons.push(label);
            break;
        }
    }

    // 3. Heuristic: Extremely short content length
    // Strip HTML/Markdown tags to measure actual text length
    const plainContent = content.replace(/<[^>]*>/g, '').replace(/#|\*|`|_/g, '').trim();
    if (plainContent.length < MINIMUM_CONTENT_LENGTH) {
        reasons.push(`Content length (${plainContent.length} chars) is below minimum quality threshold (${MINIMUM_CONTENT_LENGTH} chars)`);
    }

    // 4. Heuristic: Dummy placeholder domain links in content or canonical URL
    const canonical = String(payload.canonicalUrl || '').toLowerCase();
    for (const domain of DUMMY_DOMAINS) {
        if (content.toLowerCase().includes(domain) || canonical.includes(domain)) {
            reasons.push(`Contains dummy placeholder domain '${domain}'`);
            break;
        }
    }

    if (reasons.length > 0) {
        return {
            isFlagged: true,
            flagReason: reasons.join('; '),
            reviewStatus: 'FLAGGED',
        };
    }

    return {
        isFlagged: false,
        flagReason: '',
        reviewStatus: 'CLEAN',
    };
}
