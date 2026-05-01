import { generateSlug } from '@/lib/seoHelper';

function getEntityPath(prefix, entry, titleField) {
    const storedSlug = typeof entry?.slug === 'string' ? entry.slug.trim() : '';
    const generatedSlug = generateSlug(entry?.[titleField]);
    const fallbackId = typeof entry?._id === 'string' ? entry._id : String(entry?._id || '').trim();
    const identifier = storedSlug || generatedSlug || fallbackId;

    return identifier ? `/${prefix}/${identifier}` : `/${prefix}`;
}

export function getBlogPath(blog) {
    return getEntityPath('blogs', blog, 'title');
}

export function getProjectPath(project) {
    return getEntityPath('projects', project, 'name');
}

export function getDeploymentPath(deployment) {
    return getEntityPath('apps', deployment, 'name');
}
