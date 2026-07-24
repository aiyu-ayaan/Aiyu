# Blog Review Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-layer Blog Review Engine that automatically detects test blogs or spam patterns upon submission (via API or Admin UI), sets their status to CEASE (`published: false`), flags them for review with detailed reasons, and provides an admin review interface.

**Architecture:** Prisma schema extension for review metadata (`isFlagged`, `flagReason`, `reviewStatus`), a standalone review evaluation module (`src/lib/blogReviewEngine.js`) incorporating regexes, heuristics, and configurable keywords, API hooks in `POST /api/blogs` and `PUT /api/blogs/[id]`, and UI extensions in `/admin/blogs` and `/admin/blogs/config`.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Prisma ORM (PostgreSQL), Node.js test runner / Vitest.

## Global Constraints
- Do not break admin authentication or protected routes.
- Keep public UI changes responsive on mobile and desktop.
- Prefer small, atomic commits for each logical stage.
- Never commit secrets from `.env` or generated credentials.
- Do not remove existing behavior unless explicitly requested.

---

### Task 1: Database Schema Extension & Serialization Updates

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/serialize.js`

**Interfaces:**
- Consumes: Prisma Schema & serialization helpers.
- Produces: `isFlagged`, `flagReason`, `reviewStatus` fields on `Blog` Prisma model.

- [ ] **Step 1: Update `prisma/schema.prisma`**

Add fields to `model Blog`:
```prisma
  isFlagged    Boolean  @default(false)
  flagReason   String   @default("")
  reviewStatus String   @default("CLEAN")

  @@index([isFlagged, createdAt])
```

- [ ] **Step 2: Apply database migration / schema push**

Run: `npx prisma db push`
Expected: Schema pushed cleanly without errors.

- [ ] **Step 3: Update `src/lib/serialize.js`**

Ensure `isFlagged`, `flagReason`, and `reviewStatus` are included in serialization if needed.

- [ ] **Step 4: Commit Stage 1**

```bash
git add prisma/schema.prisma src/lib/serialize.js
git commit -m "feat(blog): add review engine schema fields to Blog model"
```

---

### Task 2: Core Blog Review Engine Module & Unit Tests

**Files:**
- Create: `src/lib/blogReviewEngine.js`
- Create: `src/lib/__tests__/blogReviewEngine.test.js`

**Interfaces:**
- Consumes: Raw blog payload object `{ title, content, excerpt, slug, tags, keywords }` and optional `customConfig`.
- Produces: `evaluateBlogForReview(payload, customConfig)` returning `{ isFlagged: boolean, flagReason: string, reviewStatus: 'FLAGGED' | 'CLEAN' }`.

- [ ] **Step 1: Write failing unit tests for `blogReviewEngine.js`**

Create `src/lib/__tests__/blogReviewEngine.test.js` covering:
- Clean blogs (pass without flag).
- Test keywords in title ("test blog", "demo post", "sample article", "asdf").
- Test keywords in content/tags ("lorem ipsum", "foo bar").
- Short content heuristic (< 30 characters).
- Custom blacklisted keywords.

- [ ] **Step 2: Run unit test to verify failure**

Run: `node --test src/lib/__tests__/blogReviewEngine.test.js`
Expected: FAIL due to missing module.

- [ ] **Step 3: Implement `src/lib/blogReviewEngine.js`**

Implement multi-layer detection logic with regex patterns and heuristic checks.

- [ ] **Step 4: Run unit test to verify pass**

Run: `node --test src/lib/__tests__/blogReviewEngine.test.js`
Expected: PASS all tests.

- [ ] **Step 5: Commit Stage 2**

```bash
git add src/lib/blogReviewEngine.js src/lib/__tests__/blogReviewEngine.test.js
git commit -m "feat(blog): add blog review engine pattern matching and heuristics"
```

---

### Task 3: API Integration & Config Endpoints

**Files:**
- Modify: `src/app/api/blogs/route.js`
- Modify: `src/app/api/blogs/[id]/route.js`
- Modify: `src/app/api/config/route.js`

**Interfaces:**
- Consumes: `evaluateBlogForReview` from `@/lib/blogReviewEngine`.
- Produces: Automatic flagging & CEASE status (`published = false`) on POST/PUT endpoints.

- [ ] **Step 1: Update `src/app/api/blogs/route.js` (POST handler)**

Integrate review engine call when blog is created. If `evaluateBlogForReview` returns `isFlagged: true`, override `published` to `false` and set `isFlagged`, `flagReason`, `reviewStatus: 'FLAGGED'`.

- [ ] **Step 2: Update `src/app/api/blogs/[id]/route.js` (PUT handler)**

Allow updating `isFlagged`, `flagReason`, `reviewStatus` (e.g. approving a post sets `reviewStatus: 'APPROVED'`, `isFlagged: false`).

- [ ] **Step 3: Update `src/app/api/config/route.js`**

Support saving/reading `enableBlogReviewEngine` (default true) and `customTestKeywords` (string/array).

- [ ] **Step 4: Commit Stage 3**

```bash
git add src/app/api/blogs/route.js src/app/api/blogs/[id]/route.js src/app/api/config/route.js
git commit -m "feat(blog): integrate review engine with blog creation and update APIs"
```

---

### Task 4: Admin UI Enhancements (`/admin/blogs` & `/admin/blogs/config`)

**Files:**
- Modify: `src/app/admin/blogs/page.js`
- Modify: `src/app/admin/blogs/config/page.js`

**Interfaces:**
- Consumes: Blog API endpoints returning `isFlagged`, `flagReason`, `reviewStatus`.
- Produces: Visual flagged badges, reason popover/tooltip, filter tabs, "Review & Approve" actions, and Review Engine configuration settings.

- [ ] **Step 1: Update `/admin/blogs/config/page.js`**

Add UI section for "Blog Review Engine Settings" with toggle and custom keyword textarea.

- [ ] **Step 2: Update `/admin/blogs/page.js`**

- Add filter state (`all`, `flagged`, `ceased`, `active`).
- Add `[FLAGGED FOR REVIEW]` badge and hover/click reason banner.
- Add "Review & Approve" action button which sets `reviewStatus = 'APPROVED'`, `isFlagged = false`, and allows broadcasting.

- [ ] **Step 3: Verify Admin UI functionality visually / manually**

- [ ] **Step 4: Commit Stage 4**

```bash
git add src/app/admin/blogs/page.js src/app/admin/blogs/config/page.js
git commit -m "feat(admin): add blog review engine controls, filter tabs, and review workflow to admin"
```

---

### Task 5: Final Verification & Linting

**Files:**
- None (Verification step)

- [ ] **Step 1: Run linter**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 2: Run automated test suite**

Run: `node --test src/lib/__tests__/blogReviewEngine.test.js`
Expected: All tests pass.

- [ ] **Step 3: Commit Stage 5**

```bash
git add .
git commit -m "chore(blog): final verification for blog review engine"
```
