"use client";

import { useEffect, useState } from "react";

/**
 * Terminal-style boot screen shown once per browser session.
 *
 * The pre-paint script in layout.js sets html[data-booted="1"] when the
 * sessionStorage flag is present, and globals.css hides #boot-screen instantly
 * in that case — so returning navigations/reloads within the same session skip
 * the overlay with no flash. A fresh session plays the sequence exactly once.
 *
 * Everything here is plain React + CSS (the 3D wireframe is a CSS transform,
 * not three.js), so this stays out of the heavy animation bundle and adds no
 * measurable runtime cost. Honours prefers-reduced-motion and data-perf="lite".
 */
const BOOT_LINES = [
  "mounting kernel modules",
  "initializing render pipeline",
  "loading projects · blogs · apps",
  "establishing secure session",
  "calibrating 3d scene",
];

export default function BootLoader() {
  // `true` on the server and first client render so the overlay is in the SSR
  // markup and covers the first paint. CSS hides it for already-booted sessions.
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  const [completedLines, setCompletedLines] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const root = document.documentElement;

    // Already booted this session → drop instantly, never animate.
    if (root.getAttribute("data-booted") === "1") {
      setVisible(false);
      return undefined;
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const lite = root.getAttribute("data-perf") === "lite";

    let raf = 0;
    let safety = 0;
    let exitTimer = 0;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      try {
        sessionStorage.setItem("aiyu:booted", "1");
      } catch (e) {
        /* private mode / storage disabled — overlay still tears down */
      }
      root.setAttribute("data-booted", "1");
      setExiting(true);
      exitTimer = window.setTimeout(() => setVisible(false), reduceMotion ? 0 : 600);
    };

    if (reduceMotion) {
      // Reduced motion: show the completed frame briefly, then leave.
      setCompletedLines(BOOT_LINES.length);
      setProgress(100);
      exitTimer = window.setTimeout(finish, 320);
      return () => clearTimeout(exitTimer);
    }

    const stepMs = lite ? 170 : 300;
    const totalMs = stepMs * (BOOT_LINES.length + 1);
    const startedAt = performance.now();

    const tick = (now) => {
      const elapsed = now - startedAt;
      setProgress(Math.min(100, Math.round((elapsed / totalMs) * 100)));
      setCompletedLines(Math.min(BOOT_LINES.length, Math.floor(elapsed / stepMs)));
      if (elapsed >= totalMs) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // Guard against requestAnimationFrame stalling (e.g. loaded in a background tab).
    safety = window.setTimeout(finish, totalMs + 4000);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
      clearTimeout(exitTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="boot-screen"
      className={exiting ? "boot-screen boot-screen--exit" : "boot-screen"}
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
