# Admin design system: the root shell of the public site

Applies to `/admin/*`. The brief: the admin must look like the same product as the public site. Where a generic
recommendation (ui-ux-pro-max suggested Fira fonts and a blue/amber light palette) disagrees with the public site,
the public site wins; its accessibility checklist still applies.

## Subject and job

A one-person CMS for a developer's portfolio. The user edits content, watches traffic and server health, and
configures integrations. Dense, scannable, calm.

## Voice taken from the public site

- Shell prompts head each page (`TermHead.js`): `admin@aiyu:~/blogs$ edit`.
- Navigation is mono text; the current entry is bracketed `[ blogs ]` (`V2Header.js`).
- Hairlines, quiet translucent surfaces, large radii only on panels (`globals.css` `:root`).
- Colours come from the theme CSS variables, so the admin follows the active theme in light and dark.

## Tokens (never hard-code colours)

| Role | Variable |
|---|---|
| Page | `--bg-primary` |
| Sidebar, inset areas | `--bg-secondary` |
| Panel | `--surface-glass` over `--bg-primary`, border `--hairline` |
| Raised control, hover row | `--bg-elevated`, `--bg-hover` |
| Headings / body / secondary / hint | `--text-bright` / `--text-primary` / `--text-secondary` / `--text-tertiary` |
| Action, focus ring, current item | `--accent-cyan` |
| Path in prompts | `--accent-purple` |
| Success / warning / error / info | `--status-success` / `--status-warning` / `--status-error` / `--status-info` |

`--text-muted` is for decoration only (brackets, separators): it fails contrast for text people must read.

## Type

- Geist (`--font-sans`): titles, body, buttons, form fields.
- Geist Mono (`--font-mono`): prompts, navigation, ids, paths, numbers in tables, code.
- Sizes: title 28/32 bold tight; panel title 15 semibold; body 14; hint 12.5. Inputs 16px below 640px.
- Sentence case. No tracked all-caps labels, no eyebrow above headings, no arrows appended to buttons.

## Layout

```
+-----------+---------------------------------------------------------+
| ~/aiyu    |  [menu]  admin / blogs               search  theme      |
| content   +---------------------------------------------------------+
|  home     |  admin@aiyu:~/blogs$ ls                                 |
|  [ blogs ]|  Blogs                                   [ New post ]   |
|  gallery  |  One sentence saying what this page does.               |
| system    |  +---------------------------------------------------+  |
|  config   |  | panel: hairline border, 14px radius, no shadow    |  |
+-----------+--+---------------------------------------------------+--+
```

**Use the whole width.** `adm-page` fills the content area (capped at 120rem, centred). No page may leave a large
empty column on a 1920px screen, and none may stretch one short form across it either:

- Dashboards: a 12-column grid; panels sized to their content, rows of equal height, no ragged holes.
- Lists: a full-width table or list with a toolbar (search, filters, counts, primary action) above it.
- Editors and settings: two columns from 1280px, the main form in the wide one and a sticky side column (publish
  state, save, preview, help, related items) in the narrow one; fields grouped in titled panels, two or three to a
  row where they are short.

24px gaps between panels, 16px inside (20px from 640px). Hairline rows, not a card per row, unless the item is a
picture.

## Every item is designed

Not only the page frame: each row, card, form section, chip, toggle, empty state, dialog and toolbar. A row shows
the thing (thumbnail or icon where one exists), its name, its facts in aligned columns, its state as a badge, and its
actions as icon buttons with labels for screen readers. Reorderable rows have one drag handle (no "drag row" text).
No `BACK_TO_...` or `SNAKE_CASE` labels: the prompt line and breadcrumb show the place; a plain "Back to apps" link
only where a step back is a real need.

## Signature, and restraint

The prompt line is the one distinctive element: it shows where you are. Everything else stays quiet: no gradients on
cards, no glow, no coloured icon tiles, no hover lifting. Motion only answers an action (150-200ms colour and
opacity), and respects `prefers-reduced-motion`.

## Components

Shared classes live in `src/app/styles/admin.css` (inside `@layer components`, so Tailwind utilities override them);
shared React primitives in `src/app/components/admin/ui/`. Pages use these instead of repeating utility strings.

## Words

Name things as the admin thinks of them. A button says what it does ("Save changes"), and its toast uses the same
verb ("Changes saved"). Errors say what failed and what to do. Empty lists invite the first action.

## Quality floor

Visible `:focus-visible` ring on everything interactive; labels tied to inputs; `aria-label` on icon-only buttons;
44px touch targets on small screens; no horizontal page scroll at 375px (wide tables scroll inside their panel);
4.5:1 text contrast in both variants.
