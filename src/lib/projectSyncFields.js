/**
 * The vocabulary shared between the sync engine and the admin form: which
 * Project fields a GitHub sync is allowed to write.
 *
 * This lives in its own leaf module — with no imports — because both the server
 * (lib/githubProjects.js) and a client component (ProjectForm) need the list.
 * Importing it from githubProjects.js would drag lib/upstreamControl, which
 * relies on `global` and `process.env`, into the browser bundle.
 *
 * Anything NOT listed here (displayOrder, image, slug, blogLink) is owned by
 * the admin exclusively and is never touched by a sync, pinned or not.
 */
export const SYNCABLE_FIELDS = Object.freeze([
    'name',
    'description',
    'techStack',
    'year',
    'status',
    'projectType',
    'codeLink',
]);
