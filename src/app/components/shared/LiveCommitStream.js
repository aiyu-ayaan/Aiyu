"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaGithub, FaCodeBranch, FaCircle } from 'react-icons/fa6';
import { FiClock, FiActivity } from 'react-icons/fi';
import { usePathname } from 'next/navigation';
import { GitPullRequest } from 'lucide-react';


const GITHUB_USERNAME = 'aiyu-ayaan';

export default function LiveCommitStream() {
    const pathname = usePathname();
    const [scrolled, setScrolled] = useState(false);
    const [commits, setCommits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [eventsCount, setEventsCount] = useState(0);
    const [isExpanded, setIsExpanded] = useState(false); // Collapsible state
    const [isMobile, setIsMobile] = useState(false);
    const [isEnabled, setIsEnabled] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const checkConfig = async () => {
            try {
                const res = await fetch('/api/github/config');
                const data = await res.json();
                if (data.success && data.data?.sections) {
                    setIsEnabled(data.data.sections.showLiveCommit !== false);
                }
            } catch (err) {
                console.error("Failed to fetch widget config", err);
            }
        };
        checkConfig();
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 30);
        };
        handleScroll();
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);



    useEffect(() => {
        async function fetchRecentCommits() {
            try {
                // Fetch recent events for the user
                const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/events/public?per_page=15`);
                if (!response.ok) throw new Error('API Rate limit or error');

                const events = await response.json();
                console.log("GitHub API raw events string length:", events.length);
                setEventsCount(events.length);

                // Filter for PushEvents and map to our needs
                const pushEvents = events
                    .filter(event => event.type === 'PushEvent')
                    .slice(0, 4) // Get top 4 most recent pushes
                    .map(event => {
                        const repo = event.repo?.name ? event.repo.name.split('/')[1] : 'unknown';
                        const commitsArray = event.payload?.commits || [];
                        const latestCommit = commitsArray.length > 0 ? commitsArray[commitsArray.length - 1] : null;

                        return {
                            id: event.id,
                            repo: repo,
                            message: latestCommit ? latestCommit.message.split('\n')[0] : 'Updates deployed',
                            time: event.created_at ? new Date(event.created_at) : new Date(),
                            hash: latestCommit ? latestCommit.sha.substring(0, 7) : 'update'
                        };
                    });

                setCommits(pushEvents);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch GitHub commits:", err);
                setError(true);
                setLoading(false);
            }
        }

        fetchRecentCommits();

        // Refresh every 5 minutes if left open
        const interval = setInterval(fetchRecentCommits, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTimeAgo = (dateStr) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "recently"; // Fallback for invalid dates

        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval >= 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval >= 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval >= 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval >= 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval >= 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    };

    if (error || pathname !== '/' || !isEnabled) {
        return null;
    }


    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 100 }}
            className={`fixed z-50 flex gap-2 transition-all duration-300 pointer-events-none ${
                isMobile ? 'flex-col-reverse w-[85%] max-w-[320px]' : 'flex-col w-72'
            }`}
            style={{
                top: isMobile ? 'auto' : (scrolled ? '72px' : '160px'),
                right: '0px',
                bottom: isMobile ? '120px' : 'auto',
                left: 'auto'
            }}
        >
            {/* Header Badge/Handle - Clickable to Toggle */}
            <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                whileHover={{ scale: 1.05, x: isExpanded ? 0 : -2 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-1.5 p-2 backdrop-blur-md border shadow-lg cursor-pointer self-end pointer-events-auto transition-all duration-300 ${
                    isExpanded
                        ? 'bg-[var(--bg-secondary)] border-[var(--border-accent)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-secondary)]'
                } rounded-l-full border-r-0 pl-3.5 pr-2`}
            >
                <GitPullRequest size={16} className="text-[var(--accent-cyan)]" />
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-cyan)] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-cyan-bright)]"></span>
                </span>
            </motion.button>

            {/* Expandable Stream Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, x: 30, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 30, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`flex flex-col gap-2 pointer-events-auto bg-[var(--bg-surface)]/80 backdrop-blur-xl border border-[var(--border-secondary)] p-3 shadow-2xl max-h-[400px] overflow-y-auto hide-scrollbar ${
                            isMobile ? 'rounded-l-xl rounded-r-none border-r-0' : 'rounded-lg'
                        }`}
                    >
                        {/* Drawer Header inside Panel */}
                        <div className="flex items-center justify-between pb-1.5 border-b border-[var(--border-secondary)]/50 mb-1">
                            <div className="flex items-center gap-1.5">
                                <GitPullRequest className="w-3 h-3 text-[var(--accent-cyan)]" />
                                <span className="text-[10px] font-mono font-bold text-[var(--accent-cyan)] tracking-wider">LIVE COMMITS</span>
                            </div>
                            <button onClick={() => setIsExpanded(false)} className="text-[var(--text-muted)] hover:text-white transition-colors p-1">
                                <span className="text-[10px]">✕</span>
                            </button>
                        </div>

                        {loading ? (
                            <motion.div
                                className="h-16 rounded-lg bg-[var(--bg-elevated)] animate-pulse border border-[var(--border-primary)]"
                            />
                        ) : commits.length === 0 ? (
                            <div className="p-2 flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <FaGithub className="text-[var(--status-warning)]" />
                                    <span className="text-xs font-mono font-semibold text-[var(--status-warning)]">STATUS FEED</span>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] font-mono">
                                    Fetched {eventsCount || 0} activities, but found 0 PushEvent Commits.
                                </p>
                            </div>
                        ) : (
                            commits.map((commit, i) => (
                                <motion.div
                                    key={commit.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="group relative bg-[var(--bg-elevated)] backdrop-blur-md border border-[var(--border-primary)] hover:border-[var(--accent-cyan)]/50 p-2.5 rounded-md shadow-md hover:shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all cursor-crosshair overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-[var(--accent-cyan)] to-[var(--accent-purple)] opacity-50 group-hover:opacity-100 transition-opacity" />

                                    <div className="flex justify-between items-start mb-1 pl-1.5">
                                        <div className="flex items-center gap-1 text-xs font-mono text-[var(--accent-cyan)]">
                                            <FaCodeBranch size={10} />
                                            <span className="truncate max-w-[100px]">{commit.repo}</span>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0 text-[9px] text-[var(--text-tertiary)] font-mono">
                                            <FiClock />
                                            {formatTimeAgo(commit.time)}
                                        </div>
                                    </div>

                                    <div className="pl-1.5">
                                        <p className="text-xs text-[var(--text-secondary)] truncate font-medium max-w-[220px]">
                                            {commit.message}
                                        </p>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <span className="px-1 py-0.5 rounded text-[8px] font-mono bg-[var(--bg-secondary)] text-[var(--accent-cyan)] border border-[var(--accent-cyan)]/20">
                                                {commit.hash}
                                            </span>
                                            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider font-bold">
                                                Push
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
