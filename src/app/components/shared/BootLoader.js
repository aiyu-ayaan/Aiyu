"use client";

import { useEffect, useState } from "react";

/**
 * Terminal-style boot screen shown only when this is the *only* open instance
 * of the app — mirroring "Chrome doesn't re-show progress when an instance is
 * already running":
 *
 *   - No other tab/instance open      -> play the boot screen once.
 *   - Another tab/instance is open    -> skip (new tab, duplicated tab, etc).
 *   - Reload of the same tab          -> skip.
 *   - Blog routes (/blogs, /blogs/[id], /v1|/v2 prefixed) -> always skip.
 *   - Admin panel (/admin/*)          -> always skip (tools shouldn't wait).
 *
 * Presence is detected two ways:
 *   1. A localStorage heartbeat ("aiyu:lastSeen"), read synchronously in the
 *      pre-paint script in layout.js so the decision happens before first paint
 *      (no flash, no "content then loader").
 *   2. A BroadcastChannel ping/pong that catches a live tab even when it is
 *      backgrounded (timers throttle in background tabs, message handlers don't).
 *
 * Pure React + CSS (the 3D wireframe is a CSS transform, not three.js), so it
 * stays out of the heavy root bundle. Honours prefers-reduced-motion and
 * data-perf="lite".
 */
const BOOT_LINES = [
  "mounting kernel modules",
  "initializing render pipeline",
  "loading projects · blogs · apps",
  "establishing secure session",
  "calibrating 3d scene",
];

const HEARTBEAT_KEY = "aiyu:lastSeen";
const HEARTBEAT_MS = 1500;

// Critical styles so the overlay covers content on first paint even before the
// CSS bundle loads (fixes the dev "content shows, then loader" flash).
const COVER_STYLE = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "var(--bg-primary, #0d1117)",
};

export default function BootLoader() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [completedLines, setCompletedLines] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const root = document.documentElement;

    // --- presence heartbeat (always runs for the life of the tab) ---
    const writeHeartbeat = () => {
      try {
        localStorage.setItem(HEARTBEAT_KEY, String(Date.now()));
      } catch (e) {
        /* private mode / storage disabled */
      }
    };
    writeHeartbeat();
    const heartbeatId = window.setInterval(writeHeartbeat, HEARTBEAT_MS);
    const onVisibility = () => {
      if (!document.hidden) writeHeartbeat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // --- cross-tab presence channel ---
    let channel = null;
    try {
      channel = new BroadcastChannel("aiyu:boot");
    } catch (e) {
      channel = null;
    }

    let aborted = false;
    let done = false;
    let raf = 0;
    let safety = 0;
    let exitTimer = 0;

    const teardownPresence = () => {
      window.clearInterval(heartbeatId);
      document.removeEventListener("visibilitychange", onVisibility);
      if (channel) channel.close();
    };

    // Pre-paint already decided to skip (another instance alive, or a blog
    // route). Keep answering pings so other tabs detect us, but never show.
    if (root.getAttribute("data-booted") === "1") {
      if (channel) {
        channel.onmessage = (event) => {
          if (event.data === "ping") channel.postMessage("pong");
        };
      }
      setVisible(false);
      return teardownPresence;
    }

    const finish = () => {
      if (done || aborted) return;
      done = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(safety);
      setExiting(true);
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      exitTimer = window.setTimeout(() => setVisible(false), reduceMotion ? 0 : 600);
    };

    // We believe we're the first instance. Confirm via a ping: a live tab (even
    // backgrounded) pongs near-instantly, so we abort and hide.
    if (channel) {
      channel.onmessage = (event) => {
        if (event.data === "ping") {
          channel.postMessage("pong");
          return;
        }
        if (event.data === "pong" && !aborted && !done) {
          aborted = true;
          window.cancelAnimationFrame(raf);
          window.clearTimeout(safety);
          root.setAttribute("data-booted", "1");
          setVisible(false);
        }
      };
      channel.postMessage("ping");
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const lite = root.getAttribute("data-perf") === "lite";

    if (reduceMotion) {
      setCompletedLines(BOOT_LINES.length);
      setProgress(100);
      safety = window.setTimeout(finish, 320);
      return () => {
        window.clearTimeout(safety);
        window.clearTimeout(exitTimer);
        teardownPresence();
      };
    }

    const stepMs = lite ? 170 : 300;
    const totalMs = stepMs * (BOOT_LINES.length + 1);
    const startedAt = performance.now();

    const tick = (now) => {
      if (aborted) return;
      const elapsed = now - startedAt;
      setProgress(Math.min(100, Math.round((elapsed / totalMs) * 100)));
      setCompletedLines(Math.min(BOOT_LINES.length, Math.floor(elapsed / stepMs)));
      if (elapsed >= totalMs) {
        finish();
        return;
      }
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    // Guard against requestAnimationFrame stalling (e.g. loaded in a background tab).
    safety = window.setTimeout(finish, totalMs + 4000);

    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(safety);
      window.clearTimeout(exitTimer);
      teardownPresence();
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="boot-screen"
      className={exiting ? "boot-screen boot-screen--exit" : "boot-screen"}
      style={COVER_STYLE}
      role="status"
      aria-label="Loading interface"
    >
      <div className="boot-glow boot-glow--cyan" aria-hidden="true" />
      <div className="boot-glow boot-glow--purple" aria-hidden="true" />

      {/* CSS-3D wireframe cube — echoes the hero's wireframe nebula */}
      <div className="boot-stage" aria-hidden="true">
        <div className="boot-cube">
          <span className="boot-cube__face boot-cube__face--front" />
          <span className="boot-cube__face boot-cube__face--back" />
          <span className="boot-cube__face boot-cube__face--right" />
          <span className="boot-cube__face boot-cube__face--left" />
          <span className="boot-cube__face boot-cube__face--top" />
          <span className="boot-cube__face boot-cube__face--bottom" />
        </div>
      </div>

      <div className="boot-terminal">
        <div className="boot-terminal__bar">
          <span className="boot-dot boot-dot--r" aria-hidden="true" />
          <span className="boot-dot boot-dot--y" aria-hidden="true" />
          <span className="boot-dot boot-dot--g" aria-hidden="true" />
          <span className="boot-terminal__title">aiyu@portfolio — ~/boot</span>
        </div>
        <div className="boot-terminal__body">
          <p className="boot-line boot-line--cmd">
            <span className="boot-prompt">$</span> ./launch --portfolio
          </p>
          {BOOT_LINES.slice(0, completedLines).map((label) => (
            <p className="boot-line" key={label}>
              <span className="boot-tag">[ OK ]</span> {label}
            </p>
          ))}
          <p className="boot-line boot-line--live">
            <span className="boot-prompt">›</span>{" "}
            {progress < 100 ? "booting interface" : "launching interface"}
            <span className="boot-cursor">_</span>
          </p>
          <div className="boot-progress" aria-hidden="true">
            <div className="boot-progress__fill" style={{ width: `${progress}%` }} />
          </div>
          <p className="boot-percent">{progress}%</p>
        </div>
      </div>
    </div>
  );
}
