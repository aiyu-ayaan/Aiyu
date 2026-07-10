/**
 * V2 route transition: templates remount on every navigation, so the enter
 * animation replays per page. Opacity-only on purpose — a transform here
 * would make this div a containing block and break the hero's pinned
 * ScrollTrigger (fixed-position pinning fails inside transformed ancestors).
 * Lite devices and reduced-motion are handled in globals.css.
 */
export default function V2Template({ children }) {
    return <div className="v2-page-enter">{children}</div>;
}
