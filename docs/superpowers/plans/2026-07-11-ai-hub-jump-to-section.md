# AI Hub Jump-to-Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dynamic, responsive "jump to" navigation bar to the `/ai` page hero, similar to the one on the `/about-me` page, which updates automatically based on the sections enabled in the database.

**Architecture:** We compute the enabled sections in `AiHub.js` and construct the `jumpLinks` array. We pass this array to the `AiHero` child component, which renders the jump links using the dynamic styling and GSAP entry animations.

**Tech Stack:** React 19, Next.js 16, Tailwind CSS 4, React Icons (FaArrowDown).

## Global Constraints
- Do not break existing page behaviors.
- Ensure all interactive elements have descriptive properties.
- Use conventional commits at each stage.
- Run `npm run lint` to verify that there are no lint issues.

---

### Task 1: Pass dynamic jump links from parent to child

**Files:**
- Modify: [AiHub.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/ai/v2/AiHub.js)

**Interfaces:**
- Produces: `jumpLinks` prop passed to `AiHero` (which is an array of `{ href: string, label: string }`).

- [ ] **Step 1: Update `AiHub.js` to compute `jumpLinks` and pass it to `AiHero`**
  Modify [AiHub.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/ai/v2/AiHub.js):
  ```jsx
  // Calculate jumpLinks from enabled sections
  const jumpLinks = enabled
      .filter((s) => s.type !== 'hero')
      .map((s) => ({
          href: `#ai-${s.id}`,
          label: s.type === 'stats' ? 'telemetry' : s.type,
      }));
  ```
  Pass `jumpLinks` to the `AiHero` component when it maps.

- [ ] **Step 2: Commit Task 1**
  Run:
  ```bash
  git add src/app/components/ai/v2/AiHub.js
  git commit -m "feat(ai): compute and pass jumpLinks from AiHub to AiHero"
  ```

---

### Task 2: Render jump links in AiHero

**Files:**
- Modify: [AiHero.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/ai/v2/AiHero.js)

**Interfaces:**
- Consumes: `jumpLinks` prop (array of `{ href: string, label: string }`)

- [ ] **Step 1: Import `FaArrowDown` and render jump links in `AiHero.js`**
  Modify [AiHero.js](file:///d:/VS-Code/Next%20JS/Aiyu/src/app/components/ai/v2/AiHero.js) to accept `jumpLinks = []`.
  Import:
  ```javascript
  import { FaArrowDown } from 'react-icons/fa6';
  ```
  Render under the subtitle:
  ```jsx
  {jumpLinks.length > 0 && (
      <div data-v2-group data-v2-stagger="0.05" className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 font-mono text-sm">
          <span data-v2="rise" className="inline-flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <FaArrowDown size={10} aria-hidden="true" /> jump to
          </span>
          {jumpLinks.map((item) => (
              <a
                  key={item.href}
                  href={item.href}
                  data-v2="rise"
                  className="group cursor-pointer transition-colors duration-200"
                  style={{ color: 'var(--text-secondary)' }}
              >
                  <span style={{ color: accent }}>[</span>
                  <span className="mx-1 underline-offset-4 group-hover:underline">{item.label}</span>
                  <span style={{ color: accent }}>]</span>
              </a>
          ))}
      </div>
  )}
  ```

- [ ] **Step 2: Commit Task 2**
  Run:
  ```bash
  git add src/app/components/ai/v2/AiHero.js
  git commit -m "feat(ai): render dynamic jumpLinks in AiHero component"
  ```

---

### Task 3: Verification and Lint Checks

- [ ] **Step 1: Run linter to verify code style and correctness**
  Run: `npm run lint`
  Expected output: No lint errors related to modified files.

- [ ] **Step 2: Verify locally**
  Run `npm run dev` and open `http://localhost:3000/ai` to verify:
  1. "jump to" links appear.
  2. Clicking on a link scrolls to the corresponding section.
  3. The page and sections load properly.
