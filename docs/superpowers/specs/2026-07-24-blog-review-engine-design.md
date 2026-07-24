# Blog Review Engine Specification

## Overview
The Blog Review Engine automatically intercepts newly created or updated blog posts (via `POST /api/blogs` or Admin UI), evaluates whether they are test blogs, spam, or placeholder posts using multi-layer pattern matching and heuristics, flags them for review, and places them in **CEASE** status (`published: false`).

## Core Requirements
1. **Multi-Layer Pattern & Heuristic Detection**:
   - Built-in keyword and regex matching (`test`, `demo`, `sample`, `lorem ipsum`, `foo bar`, `asdf`, `test blog`, etc.) across `title`, `content`, `excerpt`, `slug`, `tags`, and `keywords`.
   - Heuristics: minimum content length threshold (< 30 chars), placeholder links.
   - Dynamic custom keyword list configurable in Admin Settings.
2. **Automated CEASE Status**:
   - Flagged posts automatically set `published = false` (CEASED signal status) to prevent test content from going live on public routes.
   - Stores `isFlagged: true`, `flagReason: string`, and `reviewStatus: 'FLAGGED'`.
3. **Admin Review Interface**:
   - `/admin/blogs` displays a `FLAGGED FOR REVIEW` badge and tooltips/popovers with the flag reason.
   - Admin action buttons to "Review & Approve" (clears flag and optionally broadcasts) or "Cease".
   - Quick filters for `All`, `Flagged for Review`, `Ceased`, and `Broadcast Active`.
4. **Admin Blog Configuration**:
   - Settings in `/admin/blogs/config` to enable/disable review engine and edit custom test patterns/keywords.

## Database Schema Changes (`prisma/schema.prisma`)
Add the following fields to `model Blog`:
```prisma
  isFlagged    Boolean  @default(false)
  flagReason   String   @default("")
  reviewStatus String   @default("CLEAN") // CLEAN, FLAGGED, APPROVED
```
Index:
```prisma
  @@index([isFlagged, createdAt])
```

## System Architecture

### 1. Engine Module (`src/lib/blogReviewEngine.js`)
Function: `evaluateBlogForReview(payload, customConfig)`
- Normalizes input text from title, content, excerpt, slug, tags, keywords.
- Runs regex checks: `/\btest\b/i`, `/\bdemo\b/i`, `/\bsample\b/i`, `/\blorem\s+ipsum\b/i`, `/\bfoo\s*bar\b/i`, `/\basdf\b/i`, `/test\s*blog/i`.
- Evaluates heuristics (short content length < 30 chars, dummy URLs).
- Evaluates configured custom keywords.
- Returns `{ isFlagged: boolean, flagReason: string, reviewStatus: 'FLAGGED' | 'CLEAN' }`.

### 2. API Routes (`src/app/api/blogs/route.js` & `src/app/api/blogs/[id]/route.js`)
- On creation (`POST`):
  - Fetches site config to check `enableBlogReviewEngine` and `customTestKeywords`.
  - Executes `evaluateBlogForReview`.
  - If flagged: sets `published = false`, `isFlagged = true`, `flagReason = reason`, `reviewStatus = 'FLAGGED'`.
- On update (`PUT`):
  - If blog is updated and re-evaluated or explicitly unflagged/approved by admin, update `isFlagged`, `flagReason`, and `reviewStatus` (`'APPROVED'`).

### 3. Admin UI (`src/app/admin/blogs/page.js` & `src/app/admin/blogs/config/page.js`)
- **Blog Listing Page (`/admin/blogs`)**:
  - Filter tabs: All, Flagged, Ceased, Active.
  - Flagged badge indicator with flag reason tooltip.
  - Approve & Broadcast action handler.
- **Blog Settings Page (`/admin/blogs/config`)**:
  - Toggle for `enableBlogReviewEngine` (default `true`).
  - Textarea for `customTestKeywords`.

## Verification Strategy
- Prisma migration / `prisma db push` check.
- Automated unit test suite (`src/lib/__tests__/blogReviewEngine.test.js`) verifying pattern matches, clean blogs, edge cases.
- `npm run lint` and API validation via dev server.
