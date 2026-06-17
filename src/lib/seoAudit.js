/**
 * SEO meta-tag audit — pure issue-detection logic.
 *
 * Each `get*Issues` function takes a single entity and returns a list of
 * `{ field, severity, message }`. Severity is 'error' (a real SEO/indexing
 * problem) or 'warning' (a recommendation). No DB or network access here so the
 * rules are deterministic and unit-tested; the API route does the DB reads and
 * wraps each result with id/title/url.
 */

const MAX_DESCRIPTION = 160;
const MIN_DESCRIPTION = 50;

function str(value) {
    return typeof value === 'string' ? value.trim() : '';
}

/** Issues for a blog post. Pass published blogs; noIndex is flagged as a warning. */
export function getBlogIssues(blog = {}) {
    const issues = [];
    const description = str(blog.seoDescription) || str(blog.excerpt);

    if (!str(blog.slug)) {
        issues.push({ field: 'slug', severity: 'error', message: 'Missing slug — URL is unstable.' });
    }
    if (!description) {
        issues.push({ field: 'seoDescription', severity: 'error', message: 'No meta description (seoDescription/excerpt empty).' });
    } else if (description.length > MAX_DESCRIPTION) {
        issues.push({ field: 'seoDescription', severity: 'warning', message: `Meta description is ${description.length} chars (>${MAX_DESCRIPTION}); it may be truncated.` });
    } else if (description.length < MIN_DESCRIPTION) {
        issues.push({ field: 'seoDescription', severity: 'warning', message: `Meta description is short (${description.length} chars).` });
    }
    if (!str(blog.image) && !str(blog.socialImage)) {
        issues.push({ field: 'socialImage', severity: 'warning', message: 'No image or social image — link previews will have no thumbnail.' });
    }
    if (str(blog.image) && !str(blog.imageAlt)) {
        issues.push({ field: 'imageAlt', severity: 'error', message: 'Cover image has no alt text.' });
    }
    if (blog.published && blog.noIndex) {
        issues.push({ field: 'noIndex', severity: 'warning', message: 'Published but marked noIndex — it will not be indexed.' });
    }
    return issues;
}

/** Issues common to portfolio entities (projects, deployments/apps). */
function getContentIssues(entity = {}, { imageSeverity = 'warning' } = {}) {
    const issues = [];
    const description = str(entity.description);

    if (!str(entity.slug)) {
        issues.push({ field: 'slug', severity: 'warning', message: 'Missing slug — falls back to a generated one.' });
    }
    if (!description) {
        issues.push({ field: 'description', severity: 'error', message: 'No description — used as the meta description.' });
    } else if (description.length > MAX_DESCRIPTION) {
        issues.push({ field: 'description', severity: 'warning', message: `Description is ${description.length} chars (>${MAX_DESCRIPTION}); meta tag may be truncated.` });
    }
    if (!str(entity.image)) {
        issues.push({ field: 'image', severity: imageSeverity, message: 'No image — link previews will have no thumbnail.' });
    }
    return issues;
}

export function getProjectIssues(project = {}) {
    return getContentIssues(project);
}

export function getDeploymentIssues(deployment = {}) {
    return getContentIssues(deployment);
}

/**
 * Site-wide static-page checks based on the Config singleton. These cover the
 * defaults that flow into every static page's metadata (seoHelper).
 */
export function getStaticConfigIssues(config = {}) {
    const issues = [];
    if (!str(config.siteTitle) && !str(config.logoText)) {
        issues.push({ field: 'siteTitle', severity: 'error', message: 'No site title configured — page <title> suffix is empty.' });
    }
    if (!str(config.seoDescription) && !str(config.description)) {
        issues.push({ field: 'description', severity: 'warning', message: 'No default site description configured.' });
    }
    if (!str(config.ogImage) && !str(config.socialImage)) {
        issues.push({ field: 'ogImage', severity: 'warning', message: 'No default OG image configured (falls back to /og-image.png).' });
    }
    return issues;
}

/** Roll a flat list of audited records into severity counts. */
export function summarizeAudit(records = []) {
    let errors = 0;
    let warnings = 0;
    let ok = 0;
    for (const rec of records) {
        const list = rec.issues || [];
        if (list.length === 0) { ok += 1; continue; }
        if (list.some((i) => i.severity === 'error')) errors += 1;
        else warnings += 1;
    }
    return { total: records.length, errors, warnings, ok };
}
