"use client";

import { useEffect, useState } from "react";
import { signalBootReady } from "./bootSignal";

/**
 * V2 editorial boot screen shown only when this is the *only* open instance
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
 *      backgrounded (timers throttle in background tabs, message handlers
 *      don't — receiving a ping also refreshes the heartbeat, so a long-idle
 *      background tab keeps the pre-paint fast path warm for the next tab).
 *
 * Design follows the v2 editorial system (V2ChapterHead / V2Backdrop): mono
 * eyebrow, oversized headline with the hero gradient, a ghost stroked percent
 * numeral at depth, and a ledger-style progress footer. Pure React + CSS, so
 * it stays out of the heavy root bundle. Honours prefers-reduced-motion and
 * data-perf="lite".
 */
const BOOT_LINES = [
  "mounting kernel modules",
  "initializing render pipeline",
  "loading projects · blogs · apps",
  "establishing secure session",
  "calibrating depth stage",
];

// "hello" across scripts — cycled in the headline while the boot screen plays.
// lang attr lets the browser pick the right font/shaping per script.
const HELLOS = [
  { text: "Hello", lang: "en" },
  { text: "नमस्ते", lang: "hi" },
  { text: "Hola", lang: "es" },
  { text: "Bonjour", lang: "fr" },
  { text: "こんにちは", lang: "ja" },
  { text: "你好", lang: "zh" },
  { text: "Привет", lang: "ru" },
  { text: "مرحبا", lang: "ar" },
];
// Greeting cadence: word enters, dwells, exits, then the next swaps in.
const HELLO_DWELL_MS = 340; // time between one word entering and the next
const HELLO_EXIT_MS = 150; // exit animation length before the swap

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
  const [helloIndex, setHelloIndex] = useState(0);
  const [helloPhase, setHelloPhase] = useState("in"); // "in" | "out"

  // Cycle the greeting while the boot screen is up. Two-phase: the current word
  // plays its exit, then the next word swaps in (keyed remount replays enter).
  // Honours reduced-motion by holding on the first word (no flicker).
  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let swapTimer = 0;
    const id = window.setInterval(() => {
      setHelloPhase("out");
      swapTimer = window.setTimeout(() => {
        setHelloIndex((i) => (i + 1) % HELLOS.length);
        setHelloPhase("in");
      }, HELLO_EXIT_MS);
    }, HELLO_DWELL_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(swapTimer);
    };
  }, [visible]);

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
    // Final stamp on the way out so a quick close-and-reopen still counts as
    // the same running instance (matches the reload-skip window).
    window.addEventListener("pagehide", writeHeartbeat);

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
      window.removeEventListener("pagehide", writeHeartbeat);
      if (channel) channel.close();
    };

    const answerPing = (event) => {
      if (event.data !== "ping") return false;
      // Message handlers fire even in throttled background tabs — refresh the
      // heartbeat here so an idle tab still keeps the pre-paint skip warm.
      writeHeartbeat();
      channel.postMessage("pong");
      return true;
    };

    // Pre-paint already decided to skip (another instance alive, or a blog /
    // admin route). Keep answering pings so other tabs detect us, but never show.
    if (root.getAttribute("data-booted") === "1") {
      if (channel) {
        channel.onmessage = answerPing;
      }
      setVisible(false);
      signalBootReady();
      return teardownPresence;
    }

    const finish = () => {
      if (done || aborted) return;
      done = true;
      window.cancelAnimationFrame(raf);
      window.clearTimeout(safety);
      setExiting(true);
      // Hand off to the landing animation as the overlay begins its fade, so the
      // hero intro plays into view rather than behind the cover.
      signalBootReady();
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      exitTimer = window.setTimeout(() => setVisible(false), reduceMotion ? 0 : 700);
    };

    // We believe we're the first instance. Confirm via a ping: a live tab (even
    // backgrounded) pongs near-instantly, so we bow out with a quick fade
    // (instead of a hard cut) before the sequence has really begun.
    if (channel) {
      channel.onmessage = (event) => {
        if (answerPing(event)) return;
        if (event.data === "pong" && !aborted && !done) {
          aborted = true;
          window.cancelAnimationFrame(raf);
          window.clearTimeout(safety);
          root.setAttribute("data-booted", "1");
          setExiting(true);
          signalBootReady();
          exitTimer = window.setTimeout(() => setVisible(false), 180);
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

    const stepMs = lite ? 220 : 300;
    // Run long enough that every greeting gets its turn (plus a short tail so
    // the last word is readable before the exit fade).
    const greetingsMs = HELLOS.length * HELLO_DWELL_MS + 400;
    const totalMs = Math.max(stepMs * (BOOT_LINES.length + 1), greetingsMs);
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

  const step = Math.min(completedLines + 1, BOOT_LINES.length);
  const currentLine = BOOT_LINES[Math.min(completedLines, BOOT_LINES.length - 1)];

  return (
    <div
      id="boot-screen"
      className={exiting ? "boot-screen boot-screen--exit" : "boot-screen"}
      style={COVER_STYLE}
      role="status"
      aria-label="Loading interface"
    >
      {/* v2 backdrop: depth gradient + top hairline, echoing V2Backdrop */}
      <div className="boot2-backdrop" aria-hidden="true" />

      <div className="boot2-frame">
        <header className="boot2-topbar" aria-hidden="true">
          <span className="boot2-topbar__id">
            <span className="boot2-beacon" />
            aiyu — portfolio
          </span>
          <span>/sys · boot</span>
        </header>

        <div className="boot2-body">
          {/* Ghost stroked percent numeral at depth, like V2ChapterHead */}
          <span className="boot2-ghost" aria-hidden="true">
            {progress}
          </span>

          <p className="boot2-eyebrow">/00 — boot sequence</p>
          <h1 className="boot2-title" aria-label="Hello">
            <span className="boot2-hello__slot">
              <span
                key={helloIndex}
                lang={HELLOS[helloIndex].lang}
                className={`boot2-title__accent boot2-hello boot2-hello--${helloPhase}`}
              >
                {HELLOS[helloIndex].text}
              </span>
            </span>
            <span className="boot2-title__dot">.</span>
          </h1>

          <ul className="boot2-manifest" aria-hidden="true">
            {BOOT_LINES.slice(0, completedLines).map((label) => (
              <li className="boot2-manifest__row" key={label}>
                <span className="boot2-manifest__tag">ok</span> {label}
              </li>
            ))}
            {completedLines < BOOT_LINES.length && (
              <li className="boot2-manifest__row boot2-manifest__row--live" key="live">
                <span className="boot2-manifest__tag boot2-manifest__tag--live">··</span> {currentLine}
                <span className="boot2-cursor">_</span>
              </li>
            )}
          </ul>
        </div>

        <footer className="boot2-ledger" aria-hidden="true">
          <div className="boot2-progress">
            <div className="boot2-progress__fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="boot2-ledger__row">
            <span>
              {String(step).padStart(2, "0")} / {String(BOOT_LINES.length).padStart(2, "0")} — {currentLine}
            </span>
            <span className="boot2-ledger__pct">{progress}%</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
