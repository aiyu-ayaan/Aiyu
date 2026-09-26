"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Full-bleed <hyperframes-player> for the compositions published to
 * /public/hf by `npm run hf:sync` (sources live in /hyperframes).
 *
 * - The player bundle loads lazily, so pages that never mount a stage pay
 *   nothing for it.
 * - The film is contain-fitted to its box. Its background is the theme's
 *   --bg-primary, the same as the page, so the letterbox is invisible and
 *   no content is ever cropped. A portrait twin loads on portrait viewports.
 * - The site theme is copied into the composition's CSS variables once the
 *   runtime is ready and again whenever ThemeContext rewrites the root
 *   tokens, so admin themes restyle the film live.
 * - pointer-events are off: wheel and touch must reach the page, which owns
 *   scrolling (and Lenis), not the iframe.
 *
 * `onReady(player)` hands the element to the caller for play/seek control.
 */

let playerModule;
const loadPlayer = () => {
    playerModule ||= import("@hyperframes/player");
    return playerModule;
};

// Composition variable id → site theme token.
const THEME_TOKENS = {
    bg: "--bg-primary",
    surface: "--bg-secondary",
    fg: "--text-bright",
    muted: "--text-tertiary",
    line: "--border-secondary",
    c1: "--accent-cyan",
    c2: "--accent-purple",
    c3: "--accent-pink",
    c4: "--accent-orange",
    ok: "--status-success",
};

function applyTheme(player) {
    let doc;
    try {
        doc = player?.iframeElement?.contentDocument;
    } catch {
        return;
    }
    const root = doc?.querySelector("[data-composition-id]");
    if (!root) return;
    const styles = getComputedStyle(document.documentElement);
    Object.entries(THEME_TOKENS).forEach(([id, token]) => {
        const value = styles.getPropertyValue(token).trim();
        if (value) root.style.setProperty(`--${id}`, value);
    });
    const bg = styles.getPropertyValue("--bg-primary").trim();
    if (bg) {
        doc.documentElement.style.background = bg;
        doc.body.style.background = bg;
    }
}

const isPortrait = () => typeof window !== "undefined" && window.matchMedia("(orientation: portrait)").matches;

export default function HyperFramesStage({
    name,
    params,
    autoplay = false,
    onReady,
    onPainted,
    onEnded,
    className = "",
    style,
}) {
    const hostRef = useRef(null);
    const callbacks = useRef({ onReady, onPainted, onEnded });
    useEffect(() => {
        callbacks.current = { onReady, onPainted, onEnded };
    }, [onReady, onPainted, onEnded]);
    const [portrait, setPortrait] = useState(null);
    const query = new URLSearchParams(
        Object.entries(params || {}).filter(([, value]) => value !== undefined && value !== null && value !== "")
    ).toString();

    // Orientation decides which canvas to load; only a real flip reloads it.
    useEffect(() => {
        const mq = window.matchMedia("(orientation: portrait)");
        setPortrait(mq.matches);
        const onChange = (event) => setPortrait(event.matches);
        mq.addEventListener("change", onChange);
        return () => mq.removeEventListener("change", onChange);
    }, []);

    useEffect(() => {
        const host = hostRef.current;
        if (!host || portrait === null) return undefined;
        let disposed = false;
        let player;
        let observer;

        loadPlayer().then(() => {
            if (disposed) return;
            player = document.createElement("hyperframes-player");
            const file = portrait ? "portrait.html" : "index.html";
            player.setAttribute("src", `/hf/${name}/${file}${query ? `?${query}` : ""}`);
            player.setAttribute("muted", "");
            player.setAttribute("audio-locked", "");
            player.setAttribute("disable-click-to-play", "");
            player.setAttribute("assets-loading-ui", "none");
            player.setAttribute("low-power-idle", "");
            if (autoplay) player.setAttribute("autoplay", "");

            // Contain-fit inside the size container, keeping the canvas aspect.
            const [w, h] = portrait ? [9, 16] : [16, 9];
            Object.assign(player.style, {
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                width: `min(100cqw, calc(100cqh * ${w} / ${h}))`,
                height: `min(100cqh, calc(100cqw * ${h} / ${w}))`,
                pointerEvents: "none",
                display: "block",
            });

            player.addEventListener("ready", () => {
                applyTheme(player);
                callbacks.current.onReady?.(player);
            });
            player.addEventListener("painted", () => callbacks.current.onPainted?.(player));
            player.addEventListener("ended", () => callbacks.current.onEnded?.(player));
            host.appendChild(player);

            // ThemeContext writes tokens as inline styles on <html>.
            observer = new MutationObserver(() => applyTheme(player));
            observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class", "data-theme"] });
        });

        return () => {
            disposed = true;
            observer?.disconnect();
            player?.remove();
        };
    }, [name, query, portrait, autoplay]);

    return (
        <div
            ref={hostRef}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
            style={{ containerType: "size", ...style }}
        />
    );
}

export { isPortrait };
