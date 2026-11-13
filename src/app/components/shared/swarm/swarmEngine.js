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
/** A film layer must hold still this long (not mid-flip or mid-slide) before it is built. */
const FILM_SETTLE_MS = 160;
/** ...unless it never stops moving (a looping wave): then it is built on the move after this. */
const FILM_RESTLESS_MS = 600;
/** A built film layer the film has hidden this long is built again when it comes back. */
const FILM_REARM_MS = 500;
/** Auto-scroll waits for the cursors at most this long in one go, so a film can never stall it. */
const FILM_HOLD_MAX_MS = 8000;
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

// Hides and reveals layers; also injected into each film's iframe.
const LAYER_STYLE = `
[data-swarm="pending"],[data-swarm="active"]{visibility:hidden!important}
[data-swarm="in-box"]{animation:swarm-fade .34s ease-out both!important}
[data-swarm="in-media"]{animation:swarm-sweep .6s cubic-bezier(.2,.7,.2,1) both!important}
@keyframes swarm-fade{from{opacity:0}}
@keyframes swarm-sweep{from{clip-path:inset(0 0 100% 0);opacity:.35}to{clip-path:inset(0 0 0 0)}}
`;

const STYLE = `${LAYER_STYLE}.sw-layer{position:fixed;inset:0;z-index:9000;pointer-events:none;overflow:hidden;contain:strict;transition:opacity .5s ease}
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
    let scrollV = 0; // auto-scroll speed as a share of full speed, eased so it glides
    let scrollGoal = 0;
    let maxScroll = 0;
    let rush = 1; // build speed-up while more layers wait on screen than the cursors can keep up with
    let snapshot = null;

    // Overlay writes are queued and flushed once per frame, after every read:
    // a rect read after a style write forces a fresh layout of the whole page.
    const writes = new Map(); // node -> { styleProp | 'text': value }
    const write = (node, prop, value) => {
        let pending = writes.get(node);
        if (!pending) writes.set(node, (pending = {}));
        pending[prop] = value;
    };
    const flush = () => {
        writes.forEach((pending, node) => {
            for (const prop in pending) {
                if (prop === 'text') node.textContent = pending[prop];
                else node.style[prop] = pending[prop];
            }
        });
        writes.clear();
    };

    // ---------- films: same-origin <hyperframes-player> iframes ----------
    // The story films are DOM inside an iframe. Their layers are hidden too and
    // a cursor constructs each one once the film shows it and it holds still
    // (not mid page-flip). A layer the film hides and shows again is built
    // again, so every appearance gets its cursor. Auto-scroll waits for them.
    // Rects are mapped from the (scaled) iframe onto the page.
    const films = new Map(); // film document -> { frame, player, style }
    const filmTasks = [];
    const rectOf = (el) => {
        const r = el.getBoundingClientRect();
        const film = films.get(el.ownerDocument);
        if (!film) return r;
        const f = film.frame.getBoundingClientRect();
        const kx = film.frame.offsetWidth ? f.width / film.frame.offsetWidth : 1;
        const ky = film.frame.offsetHeight ? f.height / film.frame.offsetHeight : 1;
        const left = f.left + r.left * kx;
        const top = f.top + r.top * ky;
        const width = r.width * kx;
        const height = r.height * ky;
        return { left, top, width, height, right: left + width, bottom: top + height };
    };
    const styleOf = (el) => el.ownerDocument.defaultView.getComputedStyle(el);
    // A film task is gone when its player unmounted or its iframe reloaded.
    const gone = (task) => {
        if (!task.el.isConnected) return true;
        if (!task.film) return false;
        return !task.film.player.isConnected || task.film.frame.contentDocument !== task.el.ownerDocument;
    };

    // The film hides whole scenes with autoAlpha: an inline visibility on the
    // layer or any ancestor. (Our own hiding is a stylesheet rule, never inline.)
    const filmHidden = (el) => {
        for (let node = el; node; node = node.parentElement) {
            if (node.style?.visibility === 'hidden') return true;
        }
        return false;
    };
    // A film layer is in view when it is inside the film's frame and the film
    // has not faded or hidden it.
    const filmInView = (el, rect, frame, vh) => rect.width >= 1 && rect.height >= 1
        && rect.right > frame.left && rect.left < frame.right && rect.bottom > frame.top && rect.top < frame.bottom
        && frame.top < vh * 0.94
        && (!el.checkVisibility || el.checkVisibility({ checkOpacity: true }))
        && !filmHidden(el);
    // ...and uncovered when nothing opaque sits on it (a notebook page under
    // the next one). Transparent overlays, like a film's full-frame scene
    // layer, do not count. Costs a hit test, so only candidates get one.
    const opaque = (cs) => {
        if (cs.backgroundImage !== 'none') return true;
        const parts = (cs.backgroundColor.match(/\(([^)]+)\)/)?.[1] || '').split(/[\s,/]+/).filter(Boolean);
        return parts.length >= 3 && (parts.length < 4 || parseFloat(parts[3]) >= 0.9);
    };
    const filmUncovered = (el) => {
        const view = el.ownerDocument.defaultView;
        const r = el.getBoundingClientRect();
        const stack = el.ownerDocument.elementsFromPoint(
            clamp(r.left + r.width / 2, 0, view.innerWidth - 1),
            clamp(r.top + r.height / 2, 0, view.innerHeight - 1),
        );
        // Topmost first. A hidden layer is not in it, but its ancestors are.
        for (const hit of stack) {
            if (hit === el || hit.contains(el) || el.contains(hit)) return true;
            if (opaque(view.getComputedStyle(hit))) return false;
        }
        return true;
    };

    // A run of words (a title split into spans) is one text layer in a film.
    // On the page only plain inline runs count (a code line split into tokens):
    // inline-block chips stay layers of their own.
    const inlineText = (el, strict) => {
        const inner = el.getElementsByTagName('*');
        if (inner.length > 60 || !(el.textContent || '').trim()) return false;
        const view = el.ownerDocument.defaultView;
        for (const child of inner) {
            const { display } = view.getComputedStyle(child);
            if (strict ? display !== 'inline' : !display.startsWith('inline')) return false;
        }
        return true;
    };
    const walkFilm = (parent, parentTask, film) => {
        // Sized against the film's own frame: a scene backdrop is not a layer to draw.
        const viewport = film.frame.getBoundingClientRect();
        for (const el of parent.children) {
            if (el.dataset?.swarm || el.matches(SKIP_SELECTOR)) continue;
            const cs = styleOf(el);
            if (cs.display === 'none') continue;
            const rect = rectOf(el);
            const text = cs.display !== 'contents' && inlineText(el);
            const kind = text ? 'text' : cs.display === 'contents' ? null : classify(el, cs, rect, viewport);
            let task = null;
            if (kind) {
                task = {
                    el, kind, film, parent: parentTask, state: 'pending', still: 0, shown: 0, hidden: 0, last: null,
                    typeable: kind === 'text' && typeof el.offsetWidth === 'number' && cs.display !== 'inline',
                };
                filmTasks.push(task);
                el.dataset.swarm = 'pending';
            }
            if (kind !== 'text' && kind !== 'media') walkFilm(el, task || parentTask, film);
        }
    };

    // ---------- scan: tag layers and remember who must be built first ----------
    const walk = (parent, parentTask, lateOnly, film) => {
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        for (const el of parent.children) {
            if (el.dataset?.swarm || el.matches(SKIP_SELECTOR)) continue;
            const cs = styleOf(el);
            if (cs.display === 'none' || cs.position === 'fixed') continue;
            const rect = rectOf(el);
            const kind = cs.display === 'contents' ? null
                : rect.width >= 1 && rect.height >= 1 && inlineText(el, true) ? 'text' : classify(el, cs, rect, viewport);
            let task = null;
            // Content that arrives mid-build is only taken while still below
            // the fold: hiding something the reader can already see would flash.
            if (kind && (!lateOnly || rect.top > viewport.height * 0.9)) {
                task = {
                    el,
                    kind,
                    film,
                    parent: parentTask,
                    state: 'pending',
                    // clip-path on a wrapping inline box is unreliable: those fade in.
                    // (offsetWidth, not instanceof: film elements belong to another window.)
                    typeable: kind === 'text' && typeof el.offsetWidth === 'number' && cs.display !== 'inline',
                };
                tasks.push(task);
                el.dataset.swarm = 'pending';
            }
            if (kind !== 'text' && kind !== 'media') walk(el, task || parentTask, lateOnly, film);
        }
    };
    const scan = (lateOnly) => roots.forEach((root) => walk(root, null, lateOnly, null));

    // Films load after the page: pick each one up once its composition is in.
    const adoptFilms = () => {
        for (const [filmDoc, film] of films) {
            if (!film.player.isConnected || film.frame.contentDocument !== filmDoc) films.delete(filmDoc);
        }
        for (const player of doc.querySelectorAll('hyperframes-player')) {
            const frame = player.iframeElement;
            let filmDoc;
            try {
                filmDoc = frame?.contentDocument;
            } catch {
                continue; // cross-origin film: leave it alone
            }
            const root = filmDoc?.querySelector('[data-composition-id]');
            if (!root || films.has(filmDoc)) continue;
            const style = filmDoc.createElement('style');
            style.textContent = LAYER_STYLE;
            filmDoc.head.appendChild(style);
            const film = { frame, player, style };
            films.set(filmDoc, film);
            walkFilm(root, null, film);
        }
        for (let i = filmTasks.length - 1; i >= 0; i -= 1) {
            if (gone(filmTasks[i]) && filmTasks[i].state !== 'active') filmTasks.splice(i, 1);
        }
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
                write(el, 'transform', `translate3d(${x}px,${y}px,0)`);
            },
        };
        agent.set(agent.x, agent.y);
        return agent;
    });

    const drift = (agent, now) => [
        Math.sin(now / 900 + agent.seed) * 9,
        Math.cos(now / 1150 + agent.seed) * 7,
    ];
    const tween = (ms, fn) => new Promise((resolve) => tweens.add({ t: 0, ms, fn, resolve }));
    // Step aside to the agent's own spot, so cursors that finish together do not pile up.
    const release = (agent) => {
        const angle = agent.id * 2.4 + 0.6;
        const sx = agent.x;
        const sy = agent.y;
        const tx = clamp(sx + Math.cos(angle) * 48, 12, window.innerWidth - 96);
        const ty = clamp(sy + Math.sin(angle) * 36, 12, window.innerHeight - 44);
        tween(280, (p) => {
            const e = ease(p);
            agent.set(sx + (tx - sx) * e, sy + (ty - sy) * e);
        }).then(() => {
            if (dead || state.finished) return;
            const [dx, dy] = drift(agent, performance.now());
            agent.ax = agent.x - dx;
            agent.ay = agent.y - dy;
            agent.busy = false;
            agent.film = false;
        });
    };
    const place = (node, x, y, w, h) => {
        write(node, 'transform', `translate3d(${x}px,${y}px,0)`);
        if (w != null) write(node, 'width', `${w}px`);
        write(node, 'height', `${h}px`);
    };

    // ---------- build one layer ----------
    const settle = (task, built, agent, rect) => {
        if (task.state === 'done') return;
        task.state = 'done';
        task.built = built;
        if (!built) {
            delete task.el.dataset.swarm;
            if (!task.film) state.skipped += 1;
            return;
        }
        if (!task.film) state.built += 1;
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
        const cs = styleOf(el);
        const width = el.offsetWidth;
        const height = el.offsetHeight;
        const padTop = parseFloat(cs.paddingTop) || 0;
        const lineHeight = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) || 16) * 1.25;
        const lines = Math.max(1, Math.round((height - padTop - (parseFloat(cs.paddingBottom) || 0)) / lineHeight));
        const chars = Math.max(1, (el.textContent || '').trim().length);
        const perLine = Math.max(1, Math.ceil(chars / lines));
        const clip = (p, now) => {
            const at = p * lines;
            const line = Math.min(lines - 1, Math.floor(at));
            // Snap to whole characters so the reveal steps like keystrokes.
            const frac = p >= 1 ? 1 : Math.round((at - line) * perLine) / perLine;
            const value = typedClip({ width, height, lines, line, frac, padTop, lineHeight });
            // Queued with the other writes; only the first must land before the layer shows.
            if (now) el.style.clipPath = value;
            else write(el, 'clipPath', value);
            return { x: width * frac, y: padTop + line * lineHeight };
        };
        typing.set(el, el.style.clipPath);
        clip(0, true);
        // Visible but still marked, so owners (story cards) know it is mid-build.
        el.dataset.swarm = 'typing';
        write(agent.caret, 'opacity', 1);
        await tween(clamp(chars * 14, 260, 1600), (p) => {
            const at = clip(p);
            const rect = rectOf(el);
            const kx = rect.width / width;
            const ky = rect.height / height;
            const cx = rect.left + at.x * kx;
            const cy = rect.top + at.y * ky;
            place(agent.caret, cx, cy, null, lineHeight * ky);
            place(agent.sel, rect.left, rect.top, rect.width, rect.height);
            agent.set(cx + 3, cy + lineHeight * ky * 0.55);
        });
        write(agent.caret, 'opacity', 0);
        if (typing.has(el)) {
            el.style.clipPath = typing.get(el);
            typing.delete(el);
        }
        if (el.dataset.swarm === 'typing') delete el.dataset.swarm;
    };

    // Travel to a layer's top-left corner on a slight arc: straight lines read as robotic.
    const travel = (agent, el) => {
        const sx = agent.x;
        const sy = agent.y;
        const start = rectOf(el);
        const distance = Math.hypot(start.left - sx, start.top - sy);
        const bend = (agent.id % 2 ? 1 : -1) * Math.min(70, distance * 0.18);
        return tween(clamp(distance * 0.85, 180, 520), (p) => {
            const e = ease(p);
            const rect = rectOf(el);
            const dx = rect.left - sx;
            const dy = rect.top - sy;
            const len = Math.hypot(dx, dy) || 1;
            const k = Math.sin(Math.PI * e) * bend;
            agent.set(sx + dx * e - (dy / len) * k, sy + dy * e + (dx / len) * k);
        });
    };

    const build = async (agent, task) => {
        agent.busy = true;
        agent.film = !!task.film;
        task.state = 'active';
        const { el } = task;
        let rect = rectOf(el);
        await travel(agent, el);
        if (dead) return;

        write(agent.sel, 'opacity', 1);
        const drawMs = task.kind === 'text' ? 200 : clamp((rect.width + rect.height) * 0.45, 240, 520);
        await tween(drawMs, (p) => {
            const e = ease(p);
            rect = rectOf(el);
            place(agent.sel, rect.left, rect.top, rect.width * e, rect.height * e);
            write(agent.badge, 'text', `${Math.round(rect.width * e)} × ${Math.round(rect.height * e)}`);
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
                rect = rectOf(el);
                place(agent.sel, rect.left, rect.top, rect.width, rect.height);
                agent.set(rect.right, rect.bottom);
            });
        }
        if (dead) return;
        write(agent.sel, 'opacity', 0);
        settle(task, true, agent, rect);
        release(agent);
    };

    // ---------- films: mark what each on-screen film shows, as it shows it ----------
    let filmClock = 0;
    let filmWaiting = 0; // film layers on screen still to be built
    const dispatchFilms = (step, vh, idle) => {
        // Every other dispatch is plenty for a film, and halves the layout reads.
        filmClock += step;
        if (filmClock < 200) return;
        const dt = filmClock;
        filmClock = 0;
        const frames = new Map(); // player -> rect, read once per pass
        const ready = [];
        let waiting = 0;
        for (const task of filmTasks) {
            if (task.state === 'active') continue;
            const { player } = task.film;
            if (!frames.has(player)) frames.set(player, player.getBoundingClientRect());
            const frame = frames.get(player);
            if (frame.bottom < 0 || frame.top > vh) continue; // off screen: skip the layout reads
            const rect = rectOf(task.el);
            const shows = !player.closest('[data-swarm-hold]') && filmInView(task.el, rect, frame, vh);
            if (task.state === 'done') {
                // Hidden by the film (a bubble faded, a page turned): build it again next time.
                task.hidden = shows ? 0 : task.hidden + dt;
                if (task.hidden <= FILM_REARM_MS || task.el.dataset.swarm) continue;
                task.state = 'pending';
                task.el.dataset.swarm = 'pending';
                task.shown = 0;
                task.still = 0;
            }
            // Only layers that hold still: a box drawn over a flipping page reads as wrong.
            const { last } = task;
            const moved = !last || Math.abs(last.left - rect.left) > 1.5 || Math.abs(last.top - rect.top) > 1.5
                || Math.abs(last.width - rect.width) > 1.5 || Math.abs(last.height - rect.height) > 1.5;
            task.last = rect;
            task.shown = shows ? task.shown + dt : 0;
            task.still = shows && !moved ? task.still + dt : 0;
            if (!shows || !filmUncovered(task.el)) continue;
            waiting += 1;
            if (task.parent && task.parent.state !== 'done') continue;
            if (task.still < FILM_SETTLE_MS && task.shown < FILM_RESTLESS_MS) continue;
            ready.push({ task, top: rect.top, left: rect.left });
        }
        filmWaiting = waiting;
        ready.sort((a, b) => a.top - b.top || a.left - b.left);
        for (const { task, top, left } of ready) {
            if (!idle.length) break;
            let best = 0;
            for (let i = 1; i < idle.length; i += 1) {
                if (Math.hypot(idle[i].x - left, idle[i].y - top) < Math.hypot(idle[best].x - left, idle[best].y - top)) best = i;
            }
            build(idle.splice(best, 1)[0], task);
        }
    };

    // Auto-scroll (this engine's and the story player's, see storyAutoplay.js)
    // holds while cursors construct what a film shows, so none of it is skipped.
    // The film stands still while held, so its layers settle and can be built.
    let holdMs = 0;
    const holdScroll = (dt) => {
        const busy = filmWaiting > 0 || agents.some((agent) => agent.busy && agent.film);
        holdMs = busy ? holdMs + dt : 0;
        // Past the cap, let the film move on for a second, then hold again.
        if (holdMs > FILM_HOLD_MAX_MS + 1000) holdMs = 0;
        const hold = busy && holdMs < FILM_HOLD_MAX_MS;
        doc.documentElement.toggleAttribute('data-swarm-busy', hold);
        return hold;
    };

    // ---------- dispatch: hand on-screen layers to free agents ----------
    const dispatch = (now, dt) => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const ready = [];
        let open = 0;
        let front = vh; // top edge of the highest layer on screen still to finish
        adoptFilms();
        for (const task of tasks) {
            if (task.state === 'done') continue;
            open += 1;
            const { el } = task;
            if (task.state !== 'pending') {
                front = Math.min(front, rectOf(el).top);
                continue;
            }
            if (gone(task)) { settle(task, false); continue; }
            if (task.parent && task.parent.state !== 'done') continue;
            const rect = rectOf(el);
            // Collapsed, scrolled past, or off to the side: never visible to build.
            if (rect.width < 1 || rect.height < 1 || rect.bottom < -20 || rect.right < 0 || rect.left > vw) {
                if (rect.top < vh) settle(task, false);
                continue;
            }
            if (rect.top > vh * 0.94) continue;
            // An owner says this part is not on screen yet (e.g. a stage still clipped away).
            if (el.closest('[data-swarm-hold]')) continue;
            if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true })) {
                // Waiting on the site's own reveal animation; do not wait forever.
                task.waited = (task.waited || 0) + dt;
                if (task.waited > INVISIBLE_GRACE_MS) settle(task, false);
                continue;
            }
            ready.push({ task, top: rect.top, left: rect.left });
        }
        ready.sort((a, b) => a.top - b.top || a.left - b.left);
        if (ready.length) front = Math.min(front, ready[0].top);
        // The reader scrolled faster than the cursors build: work faster, do not leave them a blank page.
        rush += (clamp((ready.length + filmWaiting) / (agents.length * 2), 1, 3) - rush) * 0.3;
        const idle = agents.filter((agent) => !agent.busy);
        for (const { task, top, left } of ready) {
            if (!idle.length) break;
            let best = 0;
            for (let i = 1; i < idle.length; i += 1) {
                if (Math.hypot(idle[i].x - left, idle[i].y - top) < Math.hypot(idle[best].x - left, idle[best].y - top)) best = i;
            }
            build(idle.splice(best, 1)[0], task);
        }
        dispatchFilms(dt, vh, idle);

        const hold = holdScroll(dt);
        if (!open) return finish();
        // Auto-scroll glides: full speed while the work is low on screen, easing
        // to a stop as the unfinished front nears the top, so nothing is passed.
        // A film is scrubbed by the scroll, so it slows with its backlog rather than
        // stopping dead (a stalled film reads as lag): layers are built on the move.
        scrollGoal = Math.min(
            clamp((front / vh - 0.4) / 0.35, 0, 1),
            hold ? clamp(1 - filmWaiting / (agents.length * 1.5), 0.15, 1) : 1,
        );
        maxScroll = doc.documentElement.scrollHeight - vh;
        if (hold || ready.length || agents.some((agent) => agent.busy && !agent.film)) { stuckMs = 0; return undefined; }
        if (window.scrollY >= maxScroll - 4) {
            // Bottom of the page and nothing buildable is left on screen.
            stuckMs += dt;
            if (stuckMs > 1500) {
                tasks.forEach((task) => settle(task, false));
                return finish();
            }
        }
        return undefined;
    };

    // Runs every frame so the scroll is smooth; dispatch only sets its pace.
    const autoScroll = (dt) => {
        if (!state.auto || state.finished) { scrollV = 0; scrollPos = null; return; }
        scrollV += (scrollGoal - scrollV) * Math.min(1, dt / 220);
        if (scrollV < 0.01) { scrollPos = null; return; }
        if (scrollPos == null) scrollPos = window.scrollY;
        // The page is not where it was put (scrollbar drag, anchor jump): the reader took over.
        else if (Math.abs(window.scrollY - scrollPos) > 150) { state.auto = false; scrollPos = null; return; }
        scrollPos = Math.min(maxScroll, scrollPos + AUTO_VIEWPORTS_PER_SECOND * window.innerHeight * state.speed * scrollV * (dt / 1000));
        if (window.__lenis) window.__lenis.scrollTo(scrollPos, { immediate: true, force: true });
        else window.scrollTo({ top: scrollPos, behavior: 'instant' });
    };

    function finish() {
        if (state.finished) return;
        state.finished = true;
        snapshot = null;
        observer.disconnect();
        listen(false);
        doc.documentElement.removeAttribute('data-swarm-busy');
        // Films keep playing without cursors from here on.
        filmTasks.forEach((task) => { if (task.state !== 'active') delete task.el.dataset.swarm; });
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
            tw.t += dt * state.speed * rush;
            const p = Math.min(1, tw.t / tw.ms);
            tw.fn(p);
            if (p >= 1) {
                tweens.delete(tw);
                tw.resolve();
            }
        }
        for (const agent of agents) {
            if (agent.busy) continue;
            // Idle cursors ease apart so they never sit in a stack.
            for (const other of agents) {
                if (other === agent) continue;
                const gx = agent.ax - other.x;
                const gy = agent.ay - other.y;
                const gap = Math.hypot(gx, gy);
                if (gap >= 72) continue;
                const push = ((72 - gap) / 72) * dt * 0.12;
                agent.ax = clamp(agent.ax + (gap ? gx / gap : Math.cos(agent.seed)) * push, 12, window.innerWidth - 96);
                agent.ay = clamp(agent.ay + (gap ? gy / gap : Math.sin(agent.seed)) * push, 12, window.innerHeight - 44);
            }
            const [dx, dy] = drift(agent, now);
            agent.set(agent.ax + dx, agent.ay + dy);
        }
        sinceDispatch += dt;
        if (!state.finished && sinceDispatch >= 100) {
            dispatch(now, sinceDispatch);
            sinceDispatch = 0;
        }
        autoScroll(dt);
        flush();
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
                const rect = rectOf(entry.el);
                place(box, rect.left, rect.top, rect.width, rect.height);
                flush();
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
            writes.clear();
            typing.forEach((clipPath, el) => { el.style.clipPath = clipPath; });
            doc.querySelectorAll('[data-swarm]').forEach((el) => delete el.dataset.swarm);
            doc.documentElement.removeAttribute('data-swarm-busy');
            films.forEach((film, filmDoc) => {
                filmDoc.querySelectorAll('[data-swarm]').forEach((el) => delete el.dataset.swarm);
                film.style.remove();
            });
            layer.remove();
            style.remove();
        },
    };
}
