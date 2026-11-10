/**
 * Swarm build: the page starts blank and a handful of multiplayer-style
 * cursors rebuild it. Boxes are dragged out with a live size badge, text is
 * typed behind a caret, and media sweeps in. Every finished layer is written
 * to a history log that the HUD shows.
 *
 * The page is never rewritten. Layers are hidden with a `data-swarm`
 * attribute (visibility) and revealed by removing it, and text is "typed"
 * with a clip-path, so the framework that owns the DOM is not disturbed and a
 * cancelled run always leaves the page as it was.
 *
 * Work is unlocked by the viewport: only layers on screen are built, so the
 * build follows the reader's scroll. Auto mode scrolls for them.
 */

const AGENT_NAMES = ['Aiyu', 'Mira', 'Kenji', 'Zoya', 'Tobi', 'Lena', 'Ravi', 'Nour'];
const AGENT_COLORS = ['#0d99ff', '#a259ff', '#f24e1e', '#0acf83', '#ffb400', '#e8467c', '#00b5ce', '#ff7262'];
const MEDIA_TAGS = new Set(['img', 'video', 'canvas', 'iframe', 'svg', 'picture']);
const SKIP_SELECTOR = 'script,style,noscript,template,br,wbr,[data-swarm-ignore],[data-swarm-ui]';
const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' ', 'Spacebar']);
const VERBS = { text: 'typed', media: 'placed', box: 'drew' };
export const SWARM_SPEEDS = [1, 2, 3];

/** How long a layer may sit on screen fully transparent before it is released unbuilt. */
const INVISIBLE_GRACE_MS = 1200;
const AUTO_VIEWPORTS_PER_SECOND = 0.9;
const BLEED = 24; // clip-path overshoot so glyph overhang and shadows are not cut

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);

/**
 * Clip polygon (element-local px) that shows every line above `line` in full
 * and the fraction `frac` of `line` itself: an L shape that grows like typing.
 */
export function typedClip({ width, height, lines, line, frac, padTop, lineHeight }) {
    const top = line === 0 ? -BLEED : padTop + line * lineHeight;
    const bottom = line >= lines - 1 ? height + BLEED : padTop + (line + 1) * lineHeight;
    const x = frac >= 1 ? width + BLEED : width * frac;
    const right = width + BLEED;
    return `polygon(${-BLEED}px ${-BLEED}px, ${right}px ${-BLEED}px, ${right}px ${top}px, ${x}px ${top}px, ${x}px ${bottom}px, ${-BLEED}px ${bottom}px)`;
}

/** Short human label for a history row, e.g. `h1 "Hello there"` or `img 640 × 360`. */
export function describeLayer(el, kind, rect) {
    const tag = el.tagName.toLowerCase();
    if (kind === 'text') {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        return `${tag} "${text.length > 36 ? `${text.slice(0, 35)}…` : text}"`;
    }
    const size = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
    const alt = kind === 'media' ? el.getAttribute('alt') || el.getAttribute('aria-label') : '';
    return alt ? `${tag} ${size} · ${alt.slice(0, 28)}` : `${tag} ${size}`;
}

const hasOwnText = (el) => {
    for (const node of el.childNodes) {
        if (node.nodeType === 3 && node.nodeValue.trim()) return true;
    }
    return false;
};

/** What kind of layer an element is, or null when it is only a wrapper. */
export function classify(el, cs, rect, viewport) {
    if (rect.width < 1 || rect.height < 1) return null;
    const tag = el.tagName.toLowerCase();
    if (MEDIA_TAGS.has(tag)) return rect.width >= 16 && rect.height >= 16 ? 'media' : null;
    if (hasOwnText(el)) return 'text';
    if (rect.width < 40 || rect.height < 24) return null;
    // Page-sized surfaces are backdrops, not layers someone would draw.
    if (rect.width * rect.height > 0.8 * viewport.width * viewport.height) return null;
    const bg = cs.backgroundColor;
    const painted = (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)')
        || cs.backgroundImage !== 'none'
        || cs.boxShadow !== 'none'
        || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none');
    return painted ? 'box' : null;
}

const STYLE = `
[data-swarm="pending"],[data-swarm="active"]{visibility:hidden!important}
[data-swarm="in-box"]{animation:swarm-fade .34s ease-out both!important}
[data-swarm="in-media"]{animation:swarm-sweep .6s cubic-bezier(.2,.7,.2,1) both!important}
@keyframes swarm-fade{from{opacity:0}}
@keyframes swarm-sweep{from{clip-path:inset(0 0 100% 0);opacity:.35}to{clip-path:inset(0 0 0 0)}}
.sw-layer{position:fixed;inset:0;z-index:9000;pointer-events:none;overflow:hidden;contain:strict;transition:opacity .5s ease}
.sw-layer *{position:absolute;top:0;left:0;box-sizing:border-box}
.sw-cur{will-change:transform;filter:drop-shadow(0 2px 3px rgba(0,0,0,.28))}
.sw-cur svg{position:static;display:block}
.sw-name{top:17px;left:13px;padding:2px 8px 3px;border-radius:4px 10px 10px 10px;color:#fff;font:600 11px/1.3 ui-sans-serif,system-ui,sans-serif;white-space:nowrap;letter-spacing:.01em}
.sw-sel{border:1.5px solid var(--sw-c);background:color-mix(in srgb,var(--sw-c) 7%,transparent);opacity:0;transition:opacity .18s ease;will-change:transform,width,height}
.sw-sel i{width:7px;height:7px;background:#fff;border:1.5px solid var(--sw-c);border-radius:1px}
.sw-sel i:nth-child(1){transform:translate(-4.5px,-4.5px)}
.sw-sel i:nth-child(2){left:100%;transform:translate(-4px,-4.5px)}
.sw-sel i:nth-child(3){top:100%;transform:translate(-4.5px,-4px)}
.sw-sel i:nth-child(4){top:100%;left:100%;transform:translate(-4px,-4px)}
.sw-sel b{top:calc(100% + 6px);left:50%;transform:translateX(-50%);padding:1px 6px 2px;border-radius:4px;background:var(--sw-c);color:#fff;font:600 10px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap}
.sw-caret{width:2px;border-radius:1px;background:var(--sw-c);opacity:0;animation:swarm-blink .7s steps(1) infinite}
@keyframes swarm-blink{50%{visibility:hidden}}
`;

const CURSOR_SVG = (color) => `<svg width="18" height="21" viewBox="0 0 18 21" aria-hidden="true"><path d="M2 1.6v15.2l4.1-3.9 2.9 6.3 2.7-1.2-2.9-6.2h5.7z" fill="${color}" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>`;

/**
 * Start a build over `main` and `footer`. Returns controls for the HUD.
 * `destroy()` cancels at any point and restores every layer.
 */
export function createSwarm({ auto = false } = {}) {
    const doc = document;
    const roots = [...doc.querySelectorAll('main, footer')].filter((el) => !el.parentElement?.closest('main, footer'));
    if (!roots.length) roots.push(doc.body);

    const style = doc.createElement('style');
    style.textContent = STYLE;
    doc.head.appendChild(style);
    const layer = doc.createElement('div');
    layer.className = 'sw-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.setAttribute('data-swarm-ui', '');
    doc.body.appendChild(layer);

    const tasks = [];
    const history = [];
    const tweens = new Set();
    const typing = new Map(); // element -> inline clip-path to restore
    const state = { auto, speed: 1, built: 0, skipped: 0, finished: false, elapsed: 0 };
    let dead = false;
    let raf = 0;
    let last = performance.now();
    let sinceDispatch = 0;
    let stuckMs = 0;
    let scrollPos = null; // auto-scroll position; null while the reader drives
    let snapshot = null;

    // ---------- scan: tag layers and remember who must be built first ----------
    const scan = (lateOnly) => {
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const walk = (parent, parentTask) => {
            for (const el of parent.children) {
                if (el.dataset?.swarm || el.matches(SKIP_SELECTOR)) continue;
                const cs = getComputedStyle(el);
                if (cs.display === 'none' || cs.position === 'fixed') continue;
                const rect = el.getBoundingClientRect();
                const kind = cs.display === 'contents' ? null : classify(el, cs, rect, viewport);
                let task = null;
                // Content that arrives mid-build is only taken while still below
                // the fold: hiding something the reader can already see would flash.
                if (kind && (!lateOnly || rect.top > viewport.height * 0.9)) {
                    task = {
                        el,
                        kind,
                        parent: parentTask,
                        state: 'pending',
                        // clip-path on a wrapping inline box is unreliable: those fade in.
                        typeable: kind === 'text' && el instanceof HTMLElement && cs.display !== 'inline',
                    };
                    tasks.push(task);
                    el.dataset.swarm = 'pending';
                }
                if (kind !== 'text' && kind !== 'media') walk(el, task || parentTask);
            }
        };
        roots.forEach((root) => walk(root, null));
    };

    doc.documentElement.removeAttribute('data-swarm-boot');
    scan(false);

    let rescanTimer = 0;
    const observer = new MutationObserver(() => {
        clearTimeout(rescanTimer);
        rescanTimer = setTimeout(() => !dead && !state.finished && scan(true), 200);
    });
    roots.forEach((root) => observer.observe(root, { childList: true, subtree: true }));

    // ---------- agents ----------
    const count = Math.min(AGENT_NAMES.length, window.innerWidth < 768 ? 4 : 6);
    const agents = Array.from({ length: count }, (_, id) => {
        const color = AGENT_COLORS[id % AGENT_COLORS.length];
        const el = doc.createElement('div');
        el.className = 'sw-cur';
        el.innerHTML = `${CURSOR_SVG(color)}<span class="sw-name" style="background:${color}">${AGENT_NAMES[id]}</span>`;
        const sel = doc.createElement('div');
        sel.className = 'sw-sel';
        sel.style.setProperty('--sw-c', color);
        sel.innerHTML = '<i></i><i></i><i></i><i></i><b></b>';
        const caret = doc.createElement('div');
        caret.className = 'sw-caret';
        caret.style.setProperty('--sw-c', color);
        layer.append(sel, caret, el);
        // Enter from just outside the nearest side edge.
        const fromLeft = id % 2 === 0;
        const agent = {
            id, name: AGENT_NAMES[id], color, el, sel, caret, badge: sel.lastChild,
            x: fromLeft ? -60 : window.innerWidth + 60,
            y: window.innerHeight * (0.15 + 0.7 * (id / count)),
            busy: false, ax: 0, ay: 0, seed: id * 1.7,
            set(x, y) {
                this.x = x;
                this.y = y;
                el.style.transform = `translate3d(${x}px,${y}px,0)`;
            },
        };
        agent.set(agent.x, agent.y);
        return agent;
    });

    const drift = (agent, now) => [
        Math.sin(now / 900 + agent.seed) * 9,
        Math.cos(now / 1150 + agent.seed) * 7,
    ];
    const release = (agent) => {
        const [dx, dy] = drift(agent, performance.now());
        agent.ax = agent.x - dx;
        agent.ay = agent.y - dy;
        agent.busy = false;
    };

    const tween = (ms, fn) => new Promise((resolve) => tweens.add({ t: 0, ms, fn, resolve }));
    const place = (node, x, y, w, h) => {
        node.style.transform = `translate3d(${x}px,${y}px,0)`;
        if (w != null) node.style.width = `${w}px`;
        node.style.height = `${h}px`;
    };

    // ---------- build one layer ----------
    const settle = (task, built, agent, rect) => {
        if (task.state === 'done') return;
        task.state = 'done';
        if (!built) {
            delete task.el.dataset.swarm;
            state.skipped += 1;
            return;
        }
        state.built += 1;
        history.push({
            id: history.length,
            t: state.elapsed,
            name: agent.name,
            color: agent.color,
            verb: VERBS[task.kind],
            label: describeLayer(task.el, task.kind, rect),
            el: task.el,
        });
    };

    const type = async (agent, task) => {
        const { el } = task;
        const cs = getComputedStyle(el);
        const width = el.offsetWidth;
        const height = el.offsetHeight;
        const padTop = parseFloat(cs.paddingTop) || 0;
        const lineHeight = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) || 16) * 1.25;
        const lines = Math.max(1, Math.round((height - padTop - (parseFloat(cs.paddingBottom) || 0)) / lineHeight));
        const chars = Math.max(1, (el.textContent || '').trim().length);
        const perLine = Math.max(1, Math.ceil(chars / lines));
        const clip = (p) => {
            const at = p * lines;
            const line = Math.min(lines - 1, Math.floor(at));
            // Snap to whole characters so the reveal steps like keystrokes.
            const frac = p >= 1 ? 1 : Math.round((at - line) * perLine) / perLine;
            el.style.clipPath = typedClip({ width, height, lines, line, frac, padTop, lineHeight });
            return { x: width * frac, y: padTop + line * lineHeight };
        };
        typing.set(el, el.style.clipPath);
        clip(0);
        delete el.dataset.swarm;
        agent.caret.style.opacity = 1;
        await tween(clamp(chars * 14, 260, 1600), (p) => {
            const at = clip(p);
            const rect = el.getBoundingClientRect();
            const kx = rect.width / width;
            const ky = rect.height / height;
            const cx = rect.left + at.x * kx;
            const cy = rect.top + at.y * ky;
            place(agent.caret, cx, cy, null, lineHeight * ky);
            place(agent.sel, rect.left, rect.top, rect.width, rect.height);
            agent.set(cx + 3, cy + lineHeight * ky * 0.55);
        });
        agent.caret.style.opacity = 0;
        if (typing.has(el)) {
            el.style.clipPath = typing.get(el);
            typing.delete(el);
        }
    };

    const build = async (agent, task) => {
        agent.busy = true;
        task.state = 'active';
        const { el } = task;
        const sx = agent.x;
        const sy = agent.y;
        let rect = el.getBoundingClientRect();
        const distance = Math.hypot(rect.left - sx, rect.top - sy);
        const bend = (agent.id % 2 ? 1 : -1) * Math.min(70, distance * 0.18);
        // Travel on a slight arc: straight lines read as robotic.
        await tween(clamp(distance * 0.85, 180, 520), (p) => {
            const e = ease(p);
            rect = el.getBoundingClientRect();
            const dx = rect.left - sx;
            const dy = rect.top - sy;
            const len = Math.hypot(dx, dy) || 1;
            const k = Math.sin(Math.PI * e) * bend;
            agent.set(sx + dx * e - (dy / len) * k, sy + dy * e + (dx / len) * k);
        });
        if (dead) return;

        agent.sel.style.opacity = 1;
        const drawMs = task.kind === 'text' ? 200 : clamp((rect.width + rect.height) * 0.45, 240, 520);
        await tween(drawMs, (p) => {
            const e = ease(p);
            rect = el.getBoundingClientRect();
            place(agent.sel, rect.left, rect.top, rect.width * e, rect.height * e);
            agent.badge.textContent = `${Math.round(rect.width * e)} × ${Math.round(rect.height * e)}`;
            agent.set(rect.left + rect.width * e, rect.top + rect.height * e);
        });
        if (dead) return;

        if (task.typeable && el.offsetWidth > 0 && el.offsetHeight > 0) {
            await type(agent, task);
        } else {
            const mark = task.kind === 'media' ? 'in-media' : 'in-box';
            el.dataset.swarm = mark;
            setTimeout(() => el.dataset.swarm === mark && delete el.dataset.swarm, 700);
            await tween(260, () => {
                rect = el.getBoundingClientRect();
                place(agent.sel, rect.left, rect.top, rect.width, rect.height);
                agent.set(rect.right, rect.bottom);
            });
        }
        if (dead) return;
        agent.sel.style.opacity = 0;
        settle(task, true, agent, rect);
        release(agent);
    };

    // ---------- dispatch: hand on-screen layers to free agents ----------
    const dispatch = (now, dt) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const ready = [];
        let open = 0;
        for (const task of tasks) {
            if (task.state === 'done') continue;
            open += 1;
            if (task.state !== 'pending') continue;
            const { el } = task;
            if (!el.isConnected) { settle(task, false); continue; }
            if (task.parent && task.parent.state !== 'done') continue;
            const rect = el.getBoundingClientRect();
            // Collapsed, scrolled past, or off to the side: never visible to build.
            if (rect.width < 1 || rect.height < 1 || rect.bottom < -20 || rect.right < 0 || rect.left > vw) {
                if (rect.top < vh) settle(task, false);
                continue;
            }
            if (rect.top > vh * 0.94) continue;
            if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true })) {
                // Waiting on the site's own reveal animation; do not wait forever.
                task.waited = (task.waited || 0) + dt;
                if (task.waited > INVISIBLE_GRACE_MS) settle(task, false);
                continue;
            }
            ready.push({ task, top: rect.top, left: rect.left });
        }
        ready.sort((a, b) => a.top - b.top || a.left - b.left);
        const idle = agents.filter((agent) => !agent.busy);
        for (const { task, top, left } of ready) {
            if (!idle.length) break;
            let best = 0;
            for (let i = 1; i < idle.length; i += 1) {
                if (Math.hypot(idle[i].x - left, idle[i].y - top) < Math.hypot(idle[best].x - left, idle[best].y - top)) best = i;
            }
            build(idle.splice(best, 1)[0], task);
        }

        const working = agents.some((agent) => agent.busy);
        if (!open) return finish();
        if (working || ready.length) { stuckMs = 0; scrollPos = null; return undefined; }
        const atEnd = window.scrollY + vh >= doc.documentElement.scrollHeight - 4;
        if (atEnd) {
            // Bottom of the page and nothing buildable is left on screen.
            stuckMs += dt;
            if (stuckMs > 1500) {
                tasks.forEach((task) => settle(task, false));
                return finish();
            }
        } else if (state.auto) {
            if (scrollPos == null) scrollPos = window.scrollY;
            scrollPos += AUTO_VIEWPORTS_PER_SECOND * vh * state.speed * (dt / 1000);
            if (window.__lenis) window.__lenis.scrollTo(scrollPos, { immediate: true, force: true });
            else window.scrollTo({ top: scrollPos, behavior: 'instant' });
        }
        return undefined;
    };

    function finish() {
        if (state.finished) return;
        state.finished = true;
        snapshot = null;
        observer.disconnect();
        listen(false);
        // Cursors leave by the nearest side, then the layer fades.
        agents.forEach((agent, i) => {
            agent.busy = true;
            const sx = agent.x;
            const tx = agent.x < window.innerWidth / 2 ? -80 : window.innerWidth + 80;
            tween(520 + i * 70, (p) => agent.set(sx + (tx - sx) * ease(p), agent.y - 40 * ease(p)));
        });
        layer.style.opacity = 0;
    }

    // ---------- loop ----------
    const frame = (now) => {
        if (dead) return;
        const dt = Math.min(50, now - last);
        last = now;
        if (!state.finished) state.elapsed += dt;
        for (const tw of tweens) {
            tw.t += dt * state.speed;
            const p = Math.min(1, tw.t / tw.ms);
            tw.fn(p);
            if (p >= 1) {
                tweens.delete(tw);
                tw.resolve();
            }
        }
        for (const agent of agents) {
            if (agent.busy) continue;
            const [dx, dy] = drift(agent, now);
            agent.set(agent.ax + dx, agent.ay + dy);
        }
        sinceDispatch += dt;
        // Auto-scroll needs every frame to be smooth; plain dispatch does not.
        if (!state.finished && (sinceDispatch >= 100 || scrollPos != null)) {
            dispatch(now, sinceDispatch);
            sinceDispatch = 0;
        }
        if (state.finished && !tweens.size) return;
        raf = requestAnimationFrame(frame);
    };

    // Entrance: fan out into the viewport, then start taking work.
    agents.forEach((agent, i) => {
        agent.busy = true;
        const sx = agent.x;
        const tx = window.innerWidth * (0.2 + 0.6 * ((i * 0.37) % 1));
        tween(420 + i * 80, (p) => agent.set(sx + (tx - sx) * ease(p), agent.y)).then(() => !state.finished && release(agent));
    });
    raf = requestAnimationFrame(frame);

    // The reader scrolling takes over from auto mode for this run.
    const onUserScroll = (event) => {
        if (event.type === 'keydown' && !SCROLL_KEYS.has(event.key)) return;
        if (event.type !== 'wheel' && event.target instanceof Element && event.target.closest('[data-swarm-ui]')) return;
        if (state.auto) {
            state.auto = false;
            scrollPos = null;
        }
    };
    function listen(on) {
        const method = on ? 'addEventListener' : 'removeEventListener';
        window[method]('wheel', onUserScroll, { passive: true, capture: true });
        window[method]('touchstart', onUserScroll, { passive: true, capture: true });
        window[method]('keydown', onUserScroll, { capture: true });
    }
    listen(true);

    return {
        history,
        agents: agents.map(({ name, color }) => ({ name, color })),
        /** Cached once finished, so polling it stops re-rendering the HUD. */
        snapshot() {
            if (snapshot) return snapshot;
            const next = {
                total: tasks.length,
                done: state.built + state.skipped,
                built: state.built,
                elapsed: state.elapsed,
                finished: state.finished,
                auto: state.auto,
                speed: state.speed,
            };
            if (state.finished) snapshot = next;
            return next;
        },
        setAuto(on) {
            state.auto = on;
            if (!on) scrollPos = null;
        },
        setSpeed(speed) {
            if (SWARM_SPEEDS.includes(speed)) state.speed = speed;
        },
        /** Scroll a history entry's layer into view and outline it briefly. */
        locate(entry) {
            if (dead || !entry.el.isConnected) return;
            entry.el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            const box = doc.createElement('div');
            box.className = 'sw-sel';
            box.style.setProperty('--sw-c', entry.color);
            box.style.opacity = 1;
            box.innerHTML = '<i></i><i></i><i></i><i></i>';
            layer.style.opacity = 1;
            layer.appendChild(box);
            const until = performance.now() + 1600;
            const track = (now) => {
                if (dead || now > until) { box.remove(); return; }
                const rect = entry.el.getBoundingClientRect();
                place(box, rect.left, rect.top, rect.width, rect.height);
                requestAnimationFrame(track);
            };
            requestAnimationFrame(track);
        },
        destroy() {
            if (dead) return;
            dead = true;
            cancelAnimationFrame(raf);
            clearTimeout(rescanTimer);
            observer.disconnect();
            listen(false);
            tweens.forEach((tw) => tw.resolve());
            tweens.clear();
            typing.forEach((clipPath, el) => { el.style.clipPath = clipPath; });
            doc.querySelectorAll('[data-swarm]').forEach((el) => delete el.dataset.swarm);
            layer.remove();
            style.remove();
        },
    };
}
