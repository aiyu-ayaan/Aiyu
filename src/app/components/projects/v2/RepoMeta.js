"use client";

/**
 * Live repository signals for a synced project: stars, forks, language,
 * license, and last push.
 *
 * Rendered as a mono rail rather than badge pills so it reads as an annotation
 * on the editorial layout instead of a GitHub widget pasted into it. Each stat
 * carries a text label as well as an icon, so meaning never rests on the icon
 * or on colour alone.
 */
import { FaCodeBranch, FaScaleBalanced, FaStar } from 'react-icons/fa6';
import { formatCount, isActive, relativeTime } from './repoDisplay';

export default function RepoMeta({ project, className = '', showPulse = true }) {
    const repo = project?.repoData;
    if (!repo) return null;

    const pushed = relativeTime(repo.pushedAt);
    const live = showPulse && isActive(project);

    return (
        <ul
            className={`flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-xs ${className}`}
            style={{ color: 'var(--text-muted)' }}
        >
            {live && (
                <li className="inline-flex items-center gap-1.5" style={{ color: 'var(--accent-cyan)' }}>
                    <span
                        aria-hidden="true"
                        className="inline-block h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
                        style={{ backgroundColor: 'var(--accent-cyan)' }}
                    />
                    active
                </li>
            )}

            {repo.stars > 0 && (
                <li className="inline-flex items-center gap-1.5">
                    <FaStar className="h-3 w-3" aria-hidden="true" />
                    {formatCount(repo.stars)}
                    <span className="sr-only"> stars</span>
                </li>
            )}

            {repo.forks > 0 && (
                <li className="inline-flex items-center gap-1.5">
                    <FaCodeBranch className="h-3 w-3" aria-hidden="true" />
                    {formatCount(repo.forks)}
                    <span className="sr-only"> forks</span>
                </li>
            )}

            {repo.language && <li>{repo.language}</li>}

            {repo.license && (
                <li className="inline-flex items-center gap-1.5">
                    <FaScaleBalanced className="h-3 w-3" aria-hidden="true" />
                    {repo.license}
                </li>
            )}

            {repo.isArchived && (
                <li style={{ color: 'var(--accent-orange)' }}>archived</li>
            )}

            {pushed && <li>pushed {pushed}</li>}
        </ul>
    );
}
