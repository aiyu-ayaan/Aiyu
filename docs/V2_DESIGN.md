# V2 — Editorial-Depth Redesign

`/v2` and `/v2/about-me` are a from-scratch redesign of the home and about
pages: same sections, same data sources, different presentation. This
document is the reference for extending or maintaining that work.

## Why it's a separate route tree

- `/` and `/about-me` (and everything else) are untouched. V2 is additive —
  nothing in the classic site imports from `v2/`.
- `src/app/v2/` has its own `layout.js`, so it renders `V2Header` /
  `V2Footer` instead of the classic `Header` / `Footer`, while still sharing
  the root layout's providers (`ThemeProvider`, `ClientEnhancements`) and the
  same data fetchers (`getLayoutData`, `getHomePageData`, `getAboutData`).
- A dismissible popup (`V2BetaPopup`, rendered from `ClientEnhancements`
  only when `pathname === '/'`) points classic-home visitors at `/v2`.
  Dismissal is remembered in `localStorage` (`v2-beta-popup-dismissed`).

## Design language

Where the classic site uses `glass-panel` / `glass-tile` cards throughout,
v2 below the hero deliberately avoids that look. Each chapter is:

- **Full-bleed**, not boxed in a panel — content sits directly on the page
  background, separated by `1px solid var(--hairline)` rules instead of
  card borders.
- **Numbered** — `V2ChapterHead` (`src/app/components/landing/v2/`) renders
  a mono `/01 — Eyebrow` label, a giant headline, and a ghost outlined
  numeral (`-webkit-text-stroke`) that parallaxes at depth behind the text.
- **Mono-annotated** — dates, tags, stack names, and status strings render
  in `font-mono`, uppercase, wide letter-spacing — terminal/ledger voice,
  not sentence case UI copy.
- **Editorial rows over cards** — where v1 uses a grid of glass cards (blog
  list, project list, skills), v2 uses full-width hairline-separated rows:
  index / title / meta, in the style of a magazine's table of contents.

All existing CSS tokens (`--accent-cyan`, `--text-bright`, `--hairline`,
`--bg-secondary`, etc.) are reused as-is — v2 is a different arrangement of
the same design system, not a new palette.

## The 3D scroll engine

`src/app/components/landing/v2/gsap3d.js` is the v2 counterpart to the
classic `shared/gsapScroll.js`. Same rules, different vocabulary:

- `data-v2="<preset>"` — one-shot 3D entrance on scroll
  (`deep`, `flip-x`, `door-left`, `door-right`, `line`, `float`, `rise`).
- `data-v2-group` / `data-v2-stagger` — stagger a container's `[data-v2]`
  children off one trigger.
- `data-v2-depth="<speed>"` — scrubbed depth parallax (decorative glows).
- `data-v2-tilt` — the "panel falls away" exit: a section leans back and
  sinks in Z as it scrolls past.
- `useV2Fx(scopeRef, { reducedMotion, extra, dependencies })` — one-call
  section setup, mirroring `useSectionFx`. `extra` is where bespoke
  timelines live (pinned decks, HUD stand-ups, word-by-word ink-in).

**Device tiers are inherited, not reimplemented.** `isLiteDevice()` (reads
`html[data-perf="lite"]`, set pre-paint for reduced-motion / data-saver /
weak hardware — see `perf-data-perf-flag` in project memory) and
`prefersReducedMotion` from `useDevicePerformance()` both come from the
existing v1 infrastructure. `useV2Fx` checks both before running any
ScrollTrigger — lite/reduced-motion visitors get the exact same DOM,
statically visible, no pins, no scrub.

### Bespoke 3D set pieces (patterns worth reusing)

- **Pinned depth deck** (`V2Showcase`) — cards are stacked in Z with
  `position: absolute`, pinned via `ScrollTrigger`, and each scroll step
  throws the front card past the camera (`z`, `autoAlpha` on separate
  tweens so the fade finishes before the dolly, avoiding text overlap —
  see the fix in `V2Showcase.js`) while the rest dolly forward one slot.
- **HUD stand-up** (`V2MissionControl`, `V2CharacterSheet`) — a console
  panel lies back at ~30-38° and rotates to face the camera on scroll.
  **Trigger off an untransformed wrapper div, never the rotating element
  itself** — ScrollTrigger measures the trigger's `getBoundingClientRect()`,
  and a `rotationX` transform skews that measurement.
- **Ledger timeline** (`V2Timeline`, shared by experience/education/
  certifications) — a vertical spine (`scaleY` from 0, `transformOrigin:
  '50% 0%'`) scrubs open as the list scrolls into view; entries hinge in
  from alternating edges.
- **Word-by-word ink-in** (`V2About`) — the pull-quote is split into
  `<span>` per word, each animated `opacity: 0.12 → 1` with a shared
  scrubbed timeline (`stagger` on a single tween, not per-word triggers).
- **Fly-through hero** (`V2Hero`) — pins the hero stage and dollies a
  headline + floating "shard" chips through Z as the user scrolls off it.

## File map

```
src/app/v2/
  layout.js                 — V2Header + V2Footer, shares root providers
  page.js                   — /v2 (home)
  about-me/page.js          — /v2/about-me

src/app/components/landing/v2/
  gsap3d.js                 — the 3D scroll engine (see above)
  V2ChapterHead.js          — shared numbered chapter header
  V2Header.js / V2Footer.js — v2-only chrome
  V2ScrollProgress.js       — fixed gradient beam, page-scroll scrubbed
  V2Hero.js, V2Snapshot.js, V2MissionControl.js, V2TechStack.js,
  V2About.js, V2Showcase.js, V2Projects.js, V2Blogs.js
  V2LazySections.js         — dynamic-import + ViewportLazySection wiring
                              for the below-the-fold chapters

src/app/components/about/v2/
  AboutV2.js                — page shell, composes the chapters below
  V2AboutHero.js, V2CharacterSheet.js, V2Skills.js, V2Timeline.js

src/app/components/shared/V2BetaPopup.js
  — classic-home-only nudge toward /v2, gated in ClientEnhancements.js
```

## Data contracts

V2 components consume the **exact same shapes** as their v1 counterparts —
`getHomePageData()`, `getAboutData()`, `getConfigData()`, `getLayoutData()`
are unchanged. No new admin fields were added. Two things worth knowing if
you touch `/admin`:

- `statusSection` (Mission Control) and `showcaseSection` (Focus Areas) are
  shared between v1 and v2 — editing them in `/admin/home` changes both.
  The showcase section's admin copy still describes the v1 "sideways rail"
  wording; consider updating it since v2 presents it as a depth deck.
- Project/blog/skill shapes (`ProjectCard`/`ProjectDialog` field names,
  `skill.level`, `blog.readTime`) are reused verbatim — no mapping layer.

## Extending v2

1. New chapter → copy the shape of an existing one: a `<section>` with a
   `ref` passed to `useV2Fx`, a `V2ChapterHead` for the numbered intro, and
   hairline-separated content below. Add it to `V2LazySections.js` (home)
   or `AboutV2.js` (about) inside a `ViewportLazySection` if it's heavy.
2. New 3D behavior → add it to `gsap3d.js` as another `data-v2-*` attribute
   handled inside `animateV2Reveals`/`animateV2Depth`/`animateV2Tilt`, or as
   bespoke code in a section's `extra` callback if it's a one-off (pinned
   decks, HUD stand-ups) rather than a reusable preset.
3. Always verify against `html[data-perf="lite"]` and
   `prefers-reduced-motion` — `useV2Fx` already skips all scroll FX for
   both, so new bespoke timelines inside `extra` must check
   `reducedMotion` themselves before creating any ScrollTrigger.
4. Test at a real mobile width (Pixel 7 / 412px) before calling a chapter
   done — pinned/rotated elements are the most likely to overflow
   horizontally; `document.documentElement.scrollWidth >
   document.documentElement.clientWidth` is the quick check.
