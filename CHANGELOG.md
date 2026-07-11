# Changelog

## [4.7.7](https://github.com/aiyu-ayaan/Aiyu/compare/v4.7.6...v4.7.7) (2026-07-11)

### Features

* Implement AI Hub sub-pages with overflow handling and "See all" links
* Split export into per-collection JSON files

### Bug Fixes

* : Fix release done
* Include AI Hub section content in export/import

### Other Changes

* Merge branch 'fix-backup-ai-and-split'

## [4.7.6](https://github.com/aiyu-ayaan/Aiyu/compare/v4.7.5...v4.7.6) (2026-07-11)

### Features

* Add new predefined themes: Copper Patina, Nebula Drift, Royal Sapphire, Ink & Vermilion, Acid Graphite, and Firefly Grove
* Add jump-to-section navigation on AI Hub page
* Add JWT_SECRET mock for testing environment

### Bug Fixes

* : Fix release done
* Remove app memory/CPU caps causing runtime OOM kills
* : Fix release done

### Other Changes

* Replace native alert/confirm with toast + dialog
* Warn against low NODE_OPTIONS heap caps in .env
* Add jump to section implementation plan
* Add jump to section design doc
* Release v4.7.5 (#247)

## [4.7.5](https://github.com/aiyu-ayaan/Aiyu/compare/v4.7.4...v4.7.5) (2026-07-10)

### Features

* Auto-ping toggle in the Indexing tab
* Auto-ping section pages when header config changes
* Auto-ping Google Indexing API on project and app changes
* Auto-ping Google Indexing API on blog create/update/delete
* Add auto-indexing lib gated by indexing.autoPing config
* Route-change crossfade plus header and hero motion refinements
* Premium interaction polish and accessibility prefs in design system
* Soften 3D motion presets into a calmer, premium reveal language
* Add gtag client helper for GA page views and events
* Add dynamic breadcrumb structured data to all nav pages
* Add AI Hub endpoint and enhance skills display with animations

### Bug Fixes

* : Fix release done
* Surface Google error message on failed indexing log rows
* Send GA page_view on every client-side route change
* Fix : MCP server updates and UI updates

### Other Changes

* Cut image from 935MB to 592MB by pruning Prisma dead weight
* Add design engineering and animation review skills based on Emil Kowalski's philosophy
* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu

## [4.7.4](https://github.com/aiyu-ayaan/Aiyu/compare/v4.7.3...v4.7.4) (2026-07-08)

### Features

* Add v2 reveal animations to the sitemap page
* Migrate sitemap page to v2 and tidy footer links
* Add v2 project detail page
* Add v2 app detail page
* Restyle command palette to match v2 design
* Add [search] command-palette trigger
* Add metrics and topics sections to GitHub stats and config pages
* Rebuild /admin/ai-page as card-based live CRUD editor
* Replace generic AI-section tools with per-section CRUD
* Per-section REST CRUD under /api/ai
* Add aiSections core lib + hydrate reads from tables
* Add relational tables for AI section content

### Bug Fixes

* : MCP server updates and UI updates
* Show full image with auto height on app/project pages
* Escape `//` section labels as JSX string literals
* Rewrite /apps/<id> and /projects/<id> to v2 tree

### Other Changes

* Merge branch 'feat/v2-header-search'
* Use a search icon button, matching the theme toggle
* Add idempotent AI-section backfill script
* Document per-section REST + MCP APIs

## [4.7.3](https://github.com/aiyu-ayaan/Aiyu/compare/v4.7.2...v4.7.3) (2026-07-07)

### Bug Fixes

* (routing): prevent internal upstream host leaks in production redirects (#243)
* Green the failing unit, e2e, and lint checks blocking the dependabot PRs (#242)
* Satisfy @eslint/js 10 recommended rules (cause chains, dead assigns)
* Pin react version so lint survives eslint 10

### Other Changes

* Merge branch 'origin/master' — resolve proxy.test.js conflict (keep #243 regression test)
* Bump @eslint/js from 9.39.4 to 10.0.1 (#225)
* Bump sharp from 0.34.5 to 0.35.3 (#234)
* Bump eslint from 9.39.4 to 10.6.0 (#235)
* Bump simple-icons from 16.18.0 to 16.25.0 (#236)
* Bump tailwindcss from 4.3.1 to 4.3.2 (#237)
* Target the header landmark, not the boot loader's header
* Expect default-version prefix to collapse to clean URLs

## [4.7.2](https://github.com/aiyu-ayaan/Aiyu/compare/v4.7.1...v4.7.2) (2026-07-07)

### Bug Fixes

* : run scroll animations on all devices, not just the "full" tier

### Other Changes

* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu

## [4.7.1](https://github.com/aiyu-ayaan/Aiyu/compare/v4.7.0...v4.7.1) (2026-07-06)

### Bug Fixes

* : Proxy normalize fetch URL for Docker and improve error logging

### Other Changes

* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu

## [4.7.0](https://github.com/aiyu-ayaan/Aiyu/compare/v4.6.2...v4.7.0) (2026-07-06)

### Features

* : MCP server and new page is getting introduce i.e AI
* Add server health metrics and usage meters to dashboard
* Per-section stage settings with Beta/Alpha badges
* Real dashboard overview replacing the nav mirror
* V2 CMS shell with persistent sidebar drawer
* Accept the MCP write token on the blog/content APIs
* MCP tools + docs to read and edit /ai page sections
* Persist AI page config in the backend and backups
* Complete SEO for the /ai page
* Optional link per agent skill
* Admin skills editor edits name + description
* Skills section lists agent skills by name + description
* Dynamic, admin-editable AI Hub page (/ai) (#238)
* Add /admin/ai-page visual editor
* Add public /ai page in the v2 editorial system
* Add /api/ai-page config endpoint
* Add schema-driven data layer for the AI Hub page
* Implement dynamic v2 nav, classic toggle, new-tab targets, and fix duplicate resume link
* Redesign boot loader to the v2 editorial system
* Never boot-gate blog and admin routes
* Enhance mobile Table of Contents with drawer functionality and improved styling
* Enhance TOC and heading handling, improve image processing with gamma correction
* Add Security tab for write access + token management
* Add secured write tools to the StreamableHTTP server
* Add hashed write-token columns to McpConfig
* Add MCP documentation endpoint and server implementation
* Serve a standard MCP StreamableHTTP endpoint at /api/mcp
* Add MCP Server admin panel + dashboard card
* Add admin API route for MCP config
* DB-backed MCP server card via mcpConfig lib
* Add McpConfig singleton model + migration

### Bug Fixes

* Resolve broken sidebar favicon logo due to hydration mismatch
* Sticky (not fixed) save bar so it never hides the last row
* More bottom padding so save bar never hides last section
* Robust sidebar brand favicon with fallback
* Use _id for activity feed keys
* Masonry dashboard layout to remove empty column gaps
* Resolve incorrect redirect to nextjs/admin/login

### Other Changes

* Cover demand-driven row/column projection
* Demand-driven fetch for $collection template variables
* Add AI Hub skills API reference section
* Dedupe pre-paint data-perf script
* Add @modelcontextprotocol/sdk

## [4.6.2](https://github.com/aiyu-ayaan/Aiyu/compare/v4.6.1...v4.6.2) (2026-07-04)

### Bug Fixes

* : implement version-aware path handling across components and proxy

### Other Changes

* Update various screenshot assets

## [4.6.1](https://github.com/aiyu-ayaan/Aiyu/compare/v4.6.0...v4.6.1) (2026-07-03)

### Features

* Migrate custom lightbox to yet-another-react-lightbox
* Migrate custom lightbox to yet-another-react-lightbox

### Bug Fixes

* : Next.js services error found in prod build
* Hide default zoom buttons and fix slide counter index NaN
* Remove V2 suffix from page metadata titles
* Lock body scroll, hide scroll-to-top, and improve accessibility in lightbox
* Toggle body class to hide scroll-to-top button in lightbox
* Adjust stacking context and add scroll-to-top hiding rule
* Hide floating scroll-to-top button when v2 footer is reached
* Fix production hostname redirect and simplify version routing

### Other Changes

* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu

## [4.6.0](https://github.com/aiyu-ayaan/Aiyu/compare/v4.5.5...v4.6.0) (2026-07-03)

### Features

* : V2 pages are made succesfully
* Add getPublicOrigin helper to resolve the client-facing origin
* Browse the non-default version under a visible /v1 (or /v2) prefix
* Enhance mobile menu functionality and add tests for navigation behavior
* Add '/github' route to public pages and adjust cache TTL for development feat(V2Header): include 'github' link in V2 header navigation feat(VersionForm): clear cookie on version change to reflect new default immediately
* Convert the GitHub page to the editorial-depth style
* Add scroll-to-zoom and click-drag panning in V2 gallery details
* Add direct click-and-drag panning and scroll zoom in classic gallery details
* Redesign DeploymentDialog theme to follow V2 editorial style
* Redesign ProjectDialog theme to follow V2 editorial style
* Serve v2 at the classic URLs when it is default
* Add /v2/contact-us in the editorial voice
* Default site version switch at /admin/version
* Mount the interactive terminal in the v2 header
* Add /v2/blogs/[id] detail page and cover images
* Link the new archive pages across the v2 shell
* Add /v2/blogs as a zero-JS server-rendered index
* Add /v2/apps hosted-services process table
* Add /v2/gallery images-only photo wall
* Add /v2/projects year-grouped archive

### Bug Fixes

* Redirect to the real host, not 0.0.0.0, after GitHub login
* Make /v1 and /v2 explicit version switches so a stale cookie can never lock the site
* Update GSAP animations to avoid "animating from 0 to 0" issue
* Stop shards/meta/cue vanishing after a scroll round-trip

### Other Changes

* Use shared getPublicOrigin; fix admin gate 0.0.0.0 redirects
* Sync folder renames from (site) to v1
* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu
* Plain theme background and no terminal on reading pages
* Cover blog detail, version switch, terminal header
* Drop the entrance animation on photos

## [4.5.5](https://github.com/aiyu-ayaan/Aiyu/compare/v4.5.4...v4.5.5) (2026-07-02)

### Features

* Give /v2 its own header and footer
* Add /v2/about-me with editorial-depth chapters
* Wire /v2 route with projects, blogs and scroll progress
* Add tech-cloud, about and depth-deck showcase chapters
* Add 3D hero, snapshot and mission-control chapters
* Add 3D scroll engine for the /v2 experience

### Bug Fixes

* : Release is done with v2 pages

### Other Changes

* Add GSAP skills for ScrollTrigger, Timeline, and Utils
* Redesign chapters with an editorial-depth language
* Add GitHub OAuth env vars to app service

## [4.5.4](https://github.com/aiyu-ayaan/Aiyu/compare/v4.5.3...v4.5.4) (2026-06-28)

### Features

* Add auto-seed on first app startup via instrumentation hook
* Allow GITHUB_OAUTH_CALLBACK_URL to override the derived callback
* Add env-toggleable GitHub OAuth login restricted to a single user

### Bug Fixes

* : Fix release is done
* Prevent Lenis scroll hijacking on projects, apps, and command palette overlays
* Resolve scroll-hijacking bug in help output overlay
* Resolve localhost redirect issues and prevent loops

### Other Changes

* Remove /api/seed endpoint

## [4.5.3](https://github.com/aiyu-ayaan/Aiyu/compare/v4.5.2...v4.5.3) (2026-06-25)

### Bug Fixes

* : release v4.5.3
* Fix ! : New fix release pushed with resolving dockers issues

## [4.5.2](https://github.com/aiyu-ayaan/Aiyu/compare/v4.5.1...v4.5.2) (2026-06-24)

### Features

* Add interactive visitor world map
* Resolve visitor country everywhere for geo reporting
* Split sessions by state with auto-expiry notice
* Auto-prune inactive sessions after 7 days
* Add trend deltas, overview insights & geo breakdown

### Bug Fixes

* : release v4.5.2
* Fix! : release v4.5.2
* Stop edge proxy failing open and restore agent-discovery
* Constant-time admin credentials and global login backstop
* Resolve client IP from trusted proxy headers
* Exclude authenticated admin from visitor analytics

### Other Changes

* Remove hardcoded admin password fallback
* Remove unused BLOG_API_KEY / x-api-key auth path
* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu
* Abort superseded dynamic-variable preview requests
* Make dynamic-variable preview cheap
* Bound cron template data loading to prevent OOM

## [4.5.1](https://github.com/aiyu-ayaan/Aiyu/compare/v4.5.0...v4.5.1) (2026-06-24)

### Features

* Add one-by-one AI SEO auto-fixing with pause and resume
* Validate credentials and replace native alert dialogs with toasts
* Redesign AI config dashboard to support 4 sections with draggable priorities
* Integrate vercel ai gateway and request-scoped byok into vision/caption generation API
* Integrate vercel ai gateway and request-scoped byok into text generation API
* Update configuration and model api endpoints for multi-provider schema

### Bug Fixes

* : New fix release is done
* Aggregate statistics for all providers and map gemini to google

### Other Changes

* Bump react-vertical-timeline-component from 3.6.0 to 4.0.0 (#224)
* Bump @google/genai from 1.52.0 to 2.9.0 (#223)
* Bump js-cookie from 3.0.7 to 3.0.8 (#222)
* Bump @tailwindcss/postcss from 4.2.4 to 4.3.1 (#221)
* Match dashboard background with the rest of admin panel
* Refact: Docker file changes removing auto start

## [4.5.0](https://github.com/aiyu-ayaan/Aiyu/compare/v4.4.0...v4.5.0) (2026-06-18)

### Features

* : feat version release done
* Add Security and Server Health nav cards to command center
* Server metrics, uptime monitor + AI error analyzer
* Session manager + audit log dashboard
* DB-backed sessions + audit/uptime models, auth refactor
* Admin SEO & Crawl dashboard UI + nav card
* Google Indexing API integration
* Meta audit + live crawl libs, API routes, shared CLI
* Add SeoConfig + IndexingLog models, serializer registry, seed
* Add hover popovers for top pages and referrers
* Add hover preview popovers with thumbnails and descriptions for top content

### Bug Fixes

* Configure github.com for next/image remote patterns
* Change pgAdmin default email domain to resolve validation failure
* Make traffic line chart interactive and track entity views

### Other Changes

* Read robots/sitemap from DB SeoConfig with code fallback
* Update k6 load test script configuration
* Allow CDN caching of public HTML to fix crawl budget
* Add sitemap crawl audit script

## [4.4.0](https://github.com/aiyu-ayaan/Aiyu/compare/v4.3.2...v4.4.0) (2026-06-16)

### Features

* : New minor release is done which include first party analytics screen, also include test script for unit and ui-testing.On the bugs front this closes #215
* Wire analytics into backup/export, import & database reset
* /admin/analytics dashboard + command-center card
* Admin read API + SVG chart components
* Client beacon + entity/CTA tracking hooks
* Tracking engine + public ingestion API
* Prisma models + migration + serialize registry

### Bug Fixes

* Use FaTriangleExclamation (fa6) on dashboard
* Bound zip-import size and add timeouts to AI provider fallback
* Remove weak JWT secret fallback, harden session cookies, cap rate-limit memory
* Patch high/moderate npm vulnerabilities
* Update memory limits and cache TTL, enhance image loading in gallery

### Other Changes

* Update vitest to version 4.1.9 and add postcss override; enhance JSX handling in vitest config
* Update PR workflow to include lint, unit, and e2e tests; remove deprecated release workflow
* Disable boot loader animation during e2e tests
* Disable Next.js progress bar during e2e testing
* Document test suite commands and update stack badges
* Public smoke, navigation, theme and admin-auth flows
* Add playwright config with auto-started dev server
* Component tests for ThemeToggle and TicTacToe
* Unit tests for file validation, seo, cache and theme utils
* Add vitest harness with jsdom + react testing library
* Implementation plan for full test suite
* Spec for full unit + UI test suite
* Use next/image for project cards, cap AI-caption upload size
* Update various screenshot images for improved visuals
* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu

## [4.3.2](https://github.com/aiyu-ayaan/Aiyu/compare/v4.3.1...v4.3.2) (2026-06-15)

### Features

* Add session-aware terminal boot screen with 3D wireframe
* Add Terminal Matrix programmer-vibe preset
* Add six fresh predefined theme presets
* Loosen mobile stat tiles and spotlight padding
* Scale up mobile repo cards, stats, profile and activity
* Enlarge mobile card content to match home project cards
* Revert apps to vertical grid and add entrance animations on mobile
* Redesign repository cards with premium styling, icons, topics, and animations
* Convert to native CSS columns layout for clean vertical list scroll animations
* Revert horizontal scroll views to vertical masonry and grid layouts with GSAP reveals
* Revert list view layout to vertical layout as requested
* Add GSAP scroll reveals to app details page
* Add GSAP scroll reveals and horizontal scroll pinning for apps
* Add GSAP scroll reveals and horizontal scroll pinning for repos
* Add GSAP scroll reveals and horizontal scroll pinning in filmstrip view
* Add scroll-reveal animations to blog detail page
* Add scroll-reveal animations and horizontal scrolling layout to blogs page
* Add GSAP scroll reveals and horizontal scroll pinning in grid view
* Add scroll-reveal animations to About Me page
* Support horizontal reveals using GSAP containerAnimation
* Repeat scroll entrance reveals on vertical scroll and soften duration
* Add live icon preview to showcase cards configuration
* Make focus areas editable and add database migration guide
* Enable smooth horizontal pinning scroll on mobile devices

### Bug Fixes

* : Fix version release done 🚀
* Adjust horizontal scroll container and improve layout for GitHub stats display
* Cross-tab presence gating + no content flash; skip on blogs
* Remove buggy horizontal scroll reveal animation causing empty area on load
* Remove buggy horizontal scroll reveal animation causing empty area on load
* Change default mobile card width to 80vw for correct rendering
* Resolve horizontal card cutoff on mobile viewports
* Reduce horizontal scroll stage height and stretch repo cards
* Remove GSAP scroll reveal animations to prevent page scrolling lag
* Fix gallery and dynamic lists scroll reveal animations by adding dependencies to useSectionFx
* Prevent temporal dead zone ReferenceErrors by moving useEffects after memo declarations
* Fix closing JSX tags and imports
* Use portal for dialogs to prevent transform offset and reduce hero clamp min size
* Resolve tech stack filter wrapping and dialog centering issues

### Other Changes

* Merge branch 'feat/terminal-boot-loader'
* Merge branch 'feat/fresh-theme-presets'
* Merge branch 'feat/mobile-card-redesign'
* Merge branch 'perf/optimization-pass'
* Untrack local codegraph files and enforce gitignore
* Fix tech stack card animations on filter switch
* Remove obsolete codegraph daemon PID file
* Lazy-load Lenis instead of bundling it in the global shell
* Add device-tier LOD, reduced-motion support, and animation optimizations

## [4.3.1](https://github.com/aiyu-ayaan/Aiyu/compare/v4.3.0...v4.3.1) (2026-06-15)

### Features

* Automate releases from commit-message markers (#210)

### Bug Fixes

* : Dependencies are update now 🚀
* Unblock PR builds failing on standalone + Turbopack (middleware NFT) (#209)
* HTTP-only origin for Cloudflare tunnel (drop HTTPS/certs)

### Other Changes

* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu
* Bump lucide-react from 1.14.0 to 1.18.0 (#189)
* Bump js-cookie from 3.0.5 to 3.0.7 (#194)
* Bump react from 19.2.5 to 19.2.7 (#191)
* Bump tailwindcss from 4.2.4 to 4.3.1 (#190)
* Bump protobufjs from 7.5.6 to 7.6.4 (#196)
* Bump ws from 8.20.0 to 8.21.0 (#197)

## [4.3.0](https://github.com/aiyu-ayaan/Aiyu/compare/v4.2.1...v4.3.0) (2026-06-15)

### Features

* feat(db): update GitHub delegate naming in migration and related files
* feat(db): Postgres/Prisma infra, drop Mongoose, migration report (Stage 8)
* feat(db): add idempotent Mongo->Postgres migration script (Stage 7)
* feat(db): migrate admin import/export to Prisma (Stage 6)
* feat(db): migrate cron runner, notifications & seed to Prisma (Stage 5)
* feat(db): migrate admin CRUD routes to Prisma (Stage 4)
* feat(db): migrate public read paths to Prisma (Stage 3)
* feat(db): add serializer shim + port shared libs to Prisma (Stage 2)
* feat(db): add Prisma + PostgreSQL schema and tooling (Stage 1)

### Bug Fixes

* fix(resume): update professional summary and project details
* fix(docker): isolated Prisma CLI so migrate deploy finds its full dep tree
* fix(docker): build container DATABASE_URL from POSTGRES_* with postgres host

### Other Changes

* Resolve merge conflict
* perf(deploy): memory-aware PM2 worker default for small VPS (Stage 4)
* perf(hero): cap three.js render loop to 30/48fps by tier (Stage 3)
* perf(scripts): defer GA + AdSense to lazyOnload (Stage 2)
* perf(client): defer lenis/gsap/framer-motion out of root bundle (Stage 1)

## [4.2.1](https://github.com/aiyu-ayaan/Aiyu/compare/v4.2.0...v4.2.1) (2026-06-13)

### Features

* feat(admin): implement server route for lightweight icon catalog to optimize admin bundle
* feat: Add UI/UX Pro Max Search script and Home Showcase Scroll component
* feat(landing): refine entrance choreography for projects/tech/status
* feat(scroll): add left/right reveals, auto-alternating containers, and horizontal scroll

### Bug Fixes

* fix(landing): resolve filter layout wrap styling issue on mobile
* fix(hero): keep the hero name on one line across viewports

### Other Changes

* perf(scroll): gate blur/parallax/pin + WebGL hero on lite & touch devices
* perf(landing): add data-perf device tier flag + lite CSS fallbacks

## [4.2.0](https://github.com/aiyu-ayaan/Aiyu/compare/v4.1.3...v4.2.0) (2026-06-12)

### Features

* feat(metrics): add detailed performance metrics and logs for k6 tests
* feat(public-ui): align about projects and apps with premium design
* feat(portfolio): polish navigation and footer chrome
* feat(portfolio): refine landing chapters and showcase cards
* feat(portfolio): establish premium landing visual system
* feat(codegraph): add .gitignore and daemon.pid for CodeGraph configuration
* feat(tech-stack): configure skill cards and progress bar scroll animations to play once
* feat(scroll): integrate Lenis smooth scroll and refine GSAP entrance presets
* feat(design): refine navigation and footer with quiet premium chrome
* feat(design): restyle project showcase and blog cards with premium glass treatment
* feat(design): restyle tech stack and about sections with refined chapter layout
* feat(design): restyle snapshot and mission control as premium glass chapters
* feat(design): restyle hero with centered large-type layout and quiet glass surfaces
* feat(design): add premium design foundation with glass surfaces and refined typography
* feat(home): add admin-configurable mission control status section
* feat(home): redesign snapshot, tech stack, about, projects and blogs with 3d scroll reveals
* feat(home): rebuild hero with three.js particle scene and gsap scroll choreography
* feat(home): add shared gsap scroll-trigger utilities with 3d reveal presets
* feat(docker): support NGINX_HTTPS_PORT and mount certs directory in Nginx service
* feat(nginx): configure HTTPS server on port 443 with SSL hardening and HTTP redirect
* feat(nginx): add self-signed certificate generation helper scripts
* feat(nginx): set up certs directory structure and update gitignore
* feat(docker): add replica set compose configuration

### Bug Fixes

* fix(public-ui): restore compact premium page spacing
* fix(portfolio): stabilize mobile lazy section loading
* fix(scroll): disable Lenis on mobile and touch devices to prevent scroll-locking
* fix(home): replace deprecated THREE.Clock with timestamp-based elapsed time
* fix(home): make scroll animations reversible and conflict-free

### Other Changes

* Merge branch 'codex/perf-priority-fixes'
* style(landing): restore original container max-width for hero panels
* style(blogs): align BlogList, BlogDetailClient, and BlogsPageHeader container widths with header
* style(components): align About, Projects, Deployments, ContactPageClient, and GalleryClient container widths with header
* style(landing): align FuturisticResume, GamePortfolio, and Footer container widths with header
* chore(deps): add gsap, @gsap/react and three for 3d homescreen experience
* refactor(docker): change default database to standalone mongodb to reduce RAM usage

## [4.1.3](https://github.com/aiyu-ayaan/Aiyu/compare/v4.1.2...v4.1.3) (2026-06-04)

### Features

* feat(admin): implement ads.txt content editor in ads config dashboard
* feat(ads): add adsTxt database field and dynamic ads.txt route handler
* feat(gallery): add click-to-close on empty/padding space in lightbox

### Bug Fixes

* fix(gallery): resolve viewport image cropping in lightbox by adding inline contain styles
* fix(blog): replace next/image with standard img in blog detail full-screen modal
* fix(blog): preserve aspect ratio and auto-adjust height for blog banner image
* fix(blog): resolve blog title image visibility in blog details page

### Other Changes

* refactor(blogs): clean up unused next/image import in BlogDetailClient
* perf(layout): optimize google adsense script loading strategy
* perf(gallery): implement progressive loading for lightbox images
* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu

## [4.1.2](https://github.com/aiyu-ayaan/Aiyu/compare/v4.1.1...v4.1.2) (2026-06-01)

### Bug Fixes

* fix(seo): replace dynamic import with direct component usage in work-in-progress page
* fix(seo): split dynamic ssr:false into client wrapper component
* fix(seo): add noindex metadata to 404 page to prevent indexing
* fix(seo): add metadata to work-in-progress page with canonical and robots
* fix(seo): use getSiteUrl() and add robots metadata on about-me page
* fix(seo): block all query-string URLs in robots.txt to prevent parameter duplicates
* fix(config): add trailingSlash: false to eliminate trailing-slash duplicate pages
* fix: resolve build errors from dynamic import and restored data files

### Other Changes

* Revert "refactor: remove unused components and stale fallback data"
* refactor: remove unused hooks (useProgressiveImage, useBackgroundLinkExtraction)
* refactor: remove unused components and stale fallback data
* perf: convert blog images to next/image for optimized delivery
* security: add CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
* perf: remove blocking CSS imports and duplicate font declarations
* perf: lazy load heavyweight components with next/dynamic

## [4.1.1](https://github.com/aiyu-ayaan/Aiyu/compare/v4.1.0...v4.1.1) (2026-05-31)

### Features

* feat(QuestMap, QuestNode, QuestProfile): enhance responsiveness and styling adjustments for better mobile experience

## [4.1.0](https://github.com/aiyu-ayaan/Aiyu/compare/v4.0.1...v4.1.0) (2026-05-29)

### Features

* feat(FuturisticResume): enhance theme support for dynamic styling based on light/dark mode
* feat(themes): add 8 additional beautiful modern system presets, bringing total to 18
* feat(themes): remove Dynamic Theme Synthesizer section
* feat(themes): implement Dynamic Theme Synthesizer and separate modern and legacy presets sections
* feat(api): expose legacy themes and add isLegacy flag in GET themes endpoint
* feat(admin): add back navigation button to adsense configuration page
* feat(screenshots): update various screenshots for improved visual representation
* feat(crons): implement stable and exponential retry backoff policies for task scheduler
* feat(timezone): implement timezone configuration API with GET and POST endpoints to manage default timezone and recalculate active cron job schedules
* feat(about): implement scroll-triggered active state and fully responsive, centered mobile card layout to prevent overlaps
* feat(about): swap experience section above technical skills section
* feat(about): segregate sections into separate maps and optimize scroll performance by removing SVG filters
* feat(about): integrate QuestProfile and QuestMap into About page component
* feat(about): implement winding serpentine QuestMap and responsive QuestNode components
* feat(about): create QuestProfile component for RPG status tracking
* feat(deployments): update card layout and adjust typography for improved readability
* feat(apps): redesign apps page cards and grid spacing

### Bug Fixes

* fix(themes): remove activate action bar from synthesizer preview card
* fix(themes): correct synthesizer vertical stretch and dropdown text truncation
* fix(about): revert inline mobile card and implement responsive, widened 90vw card layout under nodes to resolve text wrapping
* fix(about): resolve clipping on quest cards by removing overflow-hidden from game board wrapper
* fix(about): resolve missing FaGraduationCap and FaMedal imports
* fix(header): adjust scroll progress damping and refine gradient background

### Other Changes

* refactor(themes): migrate original 21 presets to legacy and define 10 modern system presets
* refactor(admin): optimize core settings and identity forms layout for mobile responsiveness
* refactor(admin): make ThemeEditor, StorageManager, and MarkdownToolbar components fully responsive
* refactor(admin): optimize core layout containers and dashboard padding for mobile responsiveness

## [4.0.1](https://github.com/aiyu-ayaan/Aiyu/compare/v4.0.0...v4.0.1) (2026-05-28)

### Features

* feat(blogs): expand BlogList and BlogsPageHeader layout container to 80%
* feat(blogs): expand BlogDetailClient container to 80% and enhance typography legibility
* feat(blogs): cap BlogDetailClient and article column to highly readable max-w-3xl
* feat(blogs): redesign BlogCard listing row digests with structured image aspect ratios
* feat(blogs): cap BlogList layout container to max-w-4xl for narrow paper grid
* feat(admin): redesign header layout and add skins control button in HomeForm
* feat(landing): enrich landing hero with top telemetry panel and syntax highlighted code blocks
* feat(landing): increase size of left panel and code editor block
* feat(landing): redesign hero to unified cyber dashboard console
* feat(FuturisticResume): enhance code editor with dynamic lines and custom scrollbar

### Other Changes

* style(blogs): restore dynamic theme detection and dark mode overrides
* style(blogs): lock blog theme context exclusively to light-paper mode
* refactor(landing): align hero layout and set card heights to 450px for perfect vertical symmetry
* refactor(landing): restore clean floating dual-column layout with widescreen cap
* layout(pages): align all page containers with header width symmetry
* layout(landing): expand homepage sections and footer container widths
* layout(header): expand header container width to 80% on desktop

## [4.0.0](https://github.com/aiyu-ayaan/Aiyu/compare/v3.10.0...v4.0.0) (2026-05-27)

### Features

* feat(crons): add log card collapse control
* feat(crons): add execution logs history page
* feat(crons): persist webhook execution logs
* feat(cron): implement dynamic template resolution for webhook configurations
* feat(cron): add webhook URL type support and enhance preview functionality
* feat(terminal): add apps command and suggestions for navigation
* feat(database): backup and restore cron jobs, ads, and notifications
* feat(cron): add predefined site url and device metadata variables
* feat(cron): make environment variables global and add global envs modal panel
* feat(cron): integrate fixed/expression headers toggles and env secrets modal UI
* feat(cron): encrypt environment variables and support secure  template evaluation
* feat(cron): add webhookEnv and webhookHeadersType to database schema and APIs
* feat(cron): integrate n8n-style fixed/expression tabs and live preview panel
* feat(cron): create live template preview API endpoint
* feat(cron): add webhookBodyType to database schema and API routes
* feat(cron): add UI inputs for custom body and dynamic variables help guide
* feat(cron): implement dynamic template variable compiler in execution runner
* feat(cron): add webhookBody to database schema and API endpoints
* feat(cron): add support for custom webhook headers in cron jobs
* feat(screenshots): capture github page with 4.5s load delay for complete async data rendering
* feat(screenshots): increase wait timeout to 4.5s specifically for GitHub route
* feat(screenshots): filter table to dark-only, update legacy image files, and capture admin dashboard
* feat(screenshots): expand script to support admin login, legacy copy, and dark-only table
* feat(screenshots): capture all public pages in desktop/mobile and light/dark modes, and update README.md comparison table
* feat(screenshots): add automated capture script for all pages

### Bug Fixes

* fix(crons): keep log collapse action visible
* fix(terminal): prevent command output overlay from clipping in header
* fix(readme): update Next.js version and enhance badge visibility

### Other Changes

* refactor(crons): replace log dialog with history page
* docs: update README for webhook expression switches, global secrets, and variables
* style(cron): make dialog modal form fields scrollable and header/footer stationary
* docs(readme): rewrite bloated readme into sleek high-impact landing page
* docs(readme): document task scheduler, notifications, contact webhooks, and adsense
* chore(deps): add playwright to devDependencies and package scripts

## [3.10.0](https://github.com/aiyu-ayaan/Aiyu/compare/v3.9.2...v3.10.0) (2026-05-26)

### Features

* feat(ads): make adsense script preview editable
* feat(ads): inject adsense script from admin settings
* feat(contact): implement redesigned contact settings dashboard with side-by-side push and webhook routing cards
* feat(contact): add n8nWebhookEnabled property to config model and update contact API to support dual routing
* feat(notification): implement visual cron job linking and fallback configure alert
* feat(notification): implement visual notification integration dashboard UI
* feat(notification): implement direct validation test route
* feat(notification): register Notification menu option in admin dashboard
* feat(notification): implement notification dispatch service and config REST API
* feat(notification): create NotificationConfig database schema and extend Cron schema
* feat(cron): implement visual cron builder and real-time human-readable translations
* feat(cron): implement high-fidelity task scheduler administration dashboard UI
* feat(cron): register Cron Jobs task scheduler module on admin homepage dashboard
* feat(cron): implement CRUD and manual run API endpoints for task scheduling
* feat(cron): initialize cron background scheduler inside database connection trigger
* feat(cron): implement lightweight cron engine and background runner
* feat(cron): refactor and share core clean/migrate logic into storageAudit utility
* feat(cron): create Cron database schema definition
* feat(storage): build detailed pre-migration preview audit dialog showing affected files and db records
* feat(storage): implement get method for pre-migration dry-run/preview audit
* feat(storage): implement webp migration protocol card in storage manager ui
* feat(storage): add api route for webp image migration and database replacement
* feat(upload): always convert uploaded images to webp format

### Bug Fixes

* fix(notification): safely encode headers using character code loops to comply with strict ESLint regex rules
* fix(cron): import ShieldAlert from lucide-react in crons configuration page
* fix(cron): decouple cron runner from database layer to resolve static compiling edge tracing
* fix(storage): resolve syntax error inside handleMigration catch block
* fix(seo): use 308 permanent redirect for project and app dynamic route normalization
* fix(seo): use 308 permanent redirect for blog dynamic route normalization
* fix(seo): update HTML sitemap to resolve projects and apps slugs dynamically

### Other Changes

* refactor(ads): replace script editor with header status
* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu

## [3.9.2](https://github.com/aiyu-ayaan/Aiyu/compare/v3.9.1...v3.9.2) (2026-05-14)

### Features

* feat(gallery): enhance image viewer with panning and zooming capabilities
* feat(gallery): enhance image viewer with navigation and zoom functionality

### Bug Fixes

* fix(home): calculate project stats from full data
* fix(home): include experience entries in snapshot
* fix(blog): optimize layout and typography for better readability

### Other Changes

* chore: update ESLint configuration and dependencies
* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu
* chore(deps-dev): bump eslint-config-next from 16.2.1 to 16.2.4 (#181)
* chore(deps): bump lucide-react from 0.575.0 to 1.14.0 (#180)
* chore(deps): bump @google/genai from 1.50.1 to 1.52.0 (#182)
* chore(deps-dev): bump eslint from 9.39.4 to 10.3.0 (#183)
* chore(deps): bump next from 16.2.4 to 16.2.6 (#187)
* build(deps): bump react-dom from 19.2.4 to 19.2.5 (#165)

## [3.9.1](https://github.com/aiyu-ayaan/Aiyu/compare/v3.9.0...v3.9.1) (2026-05-06)

### Features

* feat: update MongoDB service configurations and optimize caching strategies across the application
* feat: optimize Docker configuration by reducing memory limits and removing PM2 dependency

### Bug Fixes

* fix(github): enrich push activity counts
* fix(github): show push commit counts
* fix(seo): reduce stale crawl targets
* fix(seo): enforce canonical host signals

### Other Changes

* perf(site): warm public data cache on startup
* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu

## [3.9.0](https://github.com/aiyu-ayaan/Aiyu/compare/v3.8.4...v3.9.0) (2026-05-05)

### Features

* feat: add manual release workflow to automate version bumping, changelog generation, and PR creation
* feat: implement site-wide HTML sitemap and add dynamic footer component
* feat: create BlogDetailClient component for markdown rendering and ad integration
* feat: implement Google AdSense configuration management system with secure storage and admin UI
* feat: implement Google AdSense integration with admin dashboard configuration and dynamic frontend ad rendering

### Bug Fixes

* fix(seo): fix canonical URLs, add robots metadata and JSON-LD structured data (#184)

## [3.8.4](https://github.com/aiyu-ayaan/Aiyu/compare/v3.8.3...v3.8.4) (2026-05-01)

### Features

* feat: add configuration for codegraph MCP server

### Bug Fixes

* fix(seo): prevent detail route redirect loops
* fix(seo): align googlebot robots rules
* fix(seo): canonicalize sitemap and legacy routes
* fix(seo): normalize canonical public URLs

### Other Changes

* chore: remove CodeGraph configuration and related files

## [3.8.3](https://github.com/aiyu-ayaan/Aiyu/compare/v3.8.2...v3.8.3) (2026-04-29)

### Features

* feat: add nginx service with healthcheck and volume configurations
* feat: enhance image file handling in export route by adding directory reading
* feat: strip H1 content from blog posts and optimize rendering
* feat(docker): update port configurations for local and production setups

### Bug Fixes

* fix: clean up JSX formatting and improve readability in BlogDetailClient component
* fix(discovery): expand markdown negotiation for agents

### Other Changes

* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu

## [3.8.2](https://github.com/aiyu-ayaan/Aiyu/compare/v3.8.1...v3.8.2) (2026-04-26)

### Features

* feat(discovery): expose WebMCP homepage tools
* feat(discovery): add homepage agent link headers
* feat(discovery): publish agent discovery metadata

### Bug Fixes

* fix(discovery): define oidc route config locally

## [3.8.1](https://github.com/aiyu-ayaan/Aiyu/compare/v3.8.0...v3.8.1) (2026-04-26)

### Features

* feat: update robots.txt to clarify content signal usage and permissions

## [3.8.0](https://github.com/aiyu-ayaan/Aiyu/compare/v3.7.3...v3.8.0) (2026-04-23)

### Features

* feat: enhance changelog generation to include categorized commit messages
* feat: add utility to check for localhost and IP links in extracted URLs
* feat: enhance layout and styling for blog components to improve responsiveness and user experience
* feat: implement getSiteUrl utility for consistent base URL handling across the application
* feat: update admin blog navigation and add API reference page

### Other Changes

* Merge branch 'master' of https://github.com/aiyu-ayaan/Aiyu

## [3.7.3](https://github.com/aiyu-ayaan/Aiyu/compare/v3.7.2...v3.7.3) (2026-04-22)

### Notes

- Release 3.7.3

## [3.7.2](https://github.com/aiyu-ayaan/Aiyu/compare/v3.6.2...v3.7.2) (2026-04-22)

### Notes

- Release 3.7.2

## [3.6.2](https://github.com/aiyu-ayaan/Aiyu/compare/v3.6.1...v3.6.2) (2026-04-20)

### Notes

- Release 3.6.2

## [3.6.1](https://github.com/aiyu-ayaan/Aiyu/compare/v3.5.1...v3.6.1) (2026-04-19)

### Notes

- Release 3.6.1

## [3.5.1](https://github.com/aiyu-ayaan/Aiyu/compare/v3.5.0...v3.5.1) (2026-04-14)


### ⚠ BREAKING CHANGES

* Fix release done
* Fix release done
* Minor version update to 3.5.0
* Enhance release trigger logic and version handling in workflow
* Minor version update to 3.5.0
* Add test file for release
* Test release without space after exclamation
* Remove ANALYSIS.txt and optimization summary files after blog page performance enhancements
* sync package-lock.json and correct package version to 6.0.0
* Correct commit type syntax in release-please configuration
* Patch Release 🔥
* Patch Release 🔥
* theme interaction model changed (legacy segmented theme control removed), and UI structure/behavior has been fully redesigned across major routes.

### Features

* Add `SpaceBackground` component to render an animated space-themed background with stars, shooting stars, and dynamic effects. ([0c97843](https://github.com/aiyu-ayaan/Aiyu/commit/0c97843fb760d646cf9361c8349429fba8595187))
* Add a 404 Not Found page and implement initial database seeding with migration documentation. ([f07d97d](https://github.com/aiyu-ayaan/Aiyu/commit/f07d97dc22d3317beeb67f0ac780183febc575ec))
* Add a new contact page displaying dynamic contact details, a form, and a configurable resume download link. ([85891d6](https://github.com/aiyu-ayaan/Aiyu/commit/85891d62b3a50a7a6d99d30aceb79819417fdd74))
* Add admin About Me form with drag-and-drop reordering and simple-icons integration. ([2d7362c](https://github.com/aiyu-ayaan/Aiyu/commit/2d7362c9c7131306ae43eb0cf359211fd307d114))
* add admin dashboard with database import and export functionality. ([b7dcca2](https://github.com/aiyu-ayaan/Aiyu/commit/b7dcca26bc6b078c49e6be4ecfbfbf580076c13f))
* Add admin data export/import functionality, Config model, and new UI components for About, Tech Stack, and Gallery sections. ([73b8a49](https://github.com/aiyu-ayaan/Aiyu/commit/73b8a49081ce9f0b255f8a7d3689707ec578364a))
* Add admin database management page with export and import functionality. ([ee1a631](https://github.com/aiyu-ayaan/Aiyu/commit/ee1a6310ddf2ab2a7bffdaf1d5c3d37ea5914570))
* add admin page for contact configuration and message management ([1637e4c](https://github.com/aiyu-ayaan/Aiyu/commit/1637e4c40c56181d4f460336fb77c2adecb87e03))
* Add admin pages for new blog creation and editing. ([41fbd82](https://github.com/aiyu-ayaan/Aiyu/commit/41fbd8214856d6012382ea957685c9aa41f08cf4))
* Add an animated `SpaceBackground` component featuring dynamic stars, shooting stars, and a cyber-grid. ([d669489](https://github.com/aiyu-ayaan/Aiyu/commit/d669489f6e4925c16ba50f867eb9fdf545a6247d))
* add API endpoint to retrieve package version and update Footer component to display version ([d5df58a](https://github.com/aiyu-ayaan/Aiyu/commit/d5df58af3c023c6b304472a5960128ce916a728a))
* Add API endpoints for blog post creation and retrieval, including a Mongoose model and API documentation. ([ee12752](https://github.com/aiyu-ayaan/Aiyu/commit/ee127521cf0e7fb4913c8a3e49149b57e60701ed))
* Add back navigation to SnakeGame and update game state management ([073b1cc](https://github.com/aiyu-ayaan/Aiyu/commit/073b1cc8cdb8ab8d48b4c0c9df73f6b14cb29475))
* Add back navigation to TicTacToe component and update GamePortfolio to support it ([d2bc115](https://github.com/aiyu-ayaan/Aiyu/commit/d2bc1156c324d0913fa19384b26a148b05cbba21))
* add BlogDetailClient component to display blog post content with markdown rendering, syntax highlighting, and share functionality. ([af620f2](https://github.com/aiyu-ayaan/Aiyu/commit/af620f26b5b2535f751aa6935ebf894d1369b30f))
* add BlogLinkInput component to support internal blog selection and external URL entry ([7604dbe](https://github.com/aiyu-ayaan/Aiyu/commit/7604dbe38191d2beb093ca935a01048aa505de81))
* add certifications section to About component and update aboutData ([7640dda](https://github.com/aiyu-ayaan/Aiyu/commit/7640dda3c587f1f722935acb172b1bd30567f651))
* add client-side contact page with form and admin page for managing contact settings and messages. ([fa2f618](https://github.com/aiyu-ayaan/Aiyu/commit/fa2f618a522651d5de9c80a98fe156e0b031c647))
* Add client-side gallery component with image display, download, and lightbox functionality. ([08b3e12](https://github.com/aiyu-ayaan/Aiyu/commit/08b3e12bfe891352c70f99a068ae1503529dfc1b))
* Add comprehensive admin dashboard for portfolio management including GitHub integration, content, and theme settings. ([fe01a71](https://github.com/aiyu-ayaan/Aiyu/commit/fe01a71600b8f2bee34f187d5b12e95fc69c54a7))
* add comprehensive project documentation for setup, API, deployment, and Docker, and update README with links. ([775f7c1](https://github.com/aiyu-ayaan/Aiyu/commit/775f7c10dcf10c0739f3196d58e10d81a152dc94))
* Add confetti effect on winner announcement in TicTacToe component ([a375532](https://github.com/aiyu-ayaan/Aiyu/commit/a375532ca8a4ad995ad71c506b5ba29edb1b91c3))
* add contact and GitHub statistics pages ([d84611a](https://github.com/aiyu-ayaan/Aiyu/commit/d84611a6781246da4c227ed25e867eb0b24909fe))
* add core portfolio pages including layout, about, blogs, and projects. ([efe2f69](https://github.com/aiyu-ayaan/Aiyu/commit/efe2f695b68f060e4fe994709b8887c5af22b274))
* add deployment management components and data model ([5ce2f36](https://github.com/aiyu-ayaan/Aiyu/commit/5ce2f36c39141e06b7d88ec10f220495c24a3cb3))
* Add dynamic blog and project sections with content filtering, an About page, and a site configuration model. ([6e9608f](https://github.com/aiyu-ayaan/Aiyu/commit/6e9608f1b5a3a08f42170e81d6375c1d4b1c4f6b))
* Add dynamic header component with Mongoose data model and admin form. ([dc056e5](https://github.com/aiyu-ayaan/Aiyu/commit/dc056e5e5a252af3618479a0c4bb40ac29493e7a))
* Add environment variable for N8N webhook URL in Next.js build process ([60e967f](https://github.com/aiyu-ayaan/Aiyu/commit/60e967f2591fcd5b82f8aea3e01d27b2bac5413e))
* Add extra tuning for content-heavy routes to optimize header performance ([63da458](https://github.com/aiyu-ayaan/Aiyu/commit/63da458d90ef0a7b19c4623922ae08bd1c347ed6))
* add favicon link to layout and update metadata for icon ([a421b4c](https://github.com/aiyu-ayaan/Aiyu/commit/a421b4cc8ec7d23813208ec9ae8562bf6e34e01f))
* add footer visibility detection and update scroll-to-top button behavior ([812b8c8](https://github.com/aiyu-ayaan/Aiyu/commit/812b8c81d8aa39850ee983f7dc8be9d582389956))
* Add foundational UI components for header, footer, about, blogs, and projects sections. ([38783a1](https://github.com/aiyu-ayaan/Aiyu/commit/38783a128998b8702fbcf70b557c27ec40d81f5f))
* Add FuturisticResume component featuring interactive glitch effects, 3D tilt, magnetic pull, and dynamic text. ([24f90d4](https://github.com/aiyu-ayaan/Aiyu/commit/24f90d459b8bed738d77936e833ba58fc9250fbc))
* Add FuturisticResume component with interactive glitch, tilt, and magnetic effects, dynamic data, and typewriter animation. ([7e59ebd](https://github.com/aiyu-ayaan/Aiyu/commit/7e59ebdd9e6e173c821af67a0c6cdb1b7715bc1e))
* add GamePortfolio component with interactive games, typewriter effect, and animated background. ([6cd0e38](https://github.com/aiyu-ayaan/Aiyu/commit/6cd0e38aebd1b9dfb7f7055ed40d9e757425565d))
* add GamePortfolio component with playable games and AdminThemesPage for theme management. ([4ea7c25](https://github.com/aiyu-ayaan/Aiyu/commit/4ea7c25128b3288b421acfc64a024aa46c69bd70))
* add GitHub Actions workflow for Next.js deployment to GitHub Pages ([e9ad671](https://github.com/aiyu-ayaan/Aiyu/commit/e9ad671a2a1f8818199b2c57cb9f306cb5612114))
* add GitHub Actions workflow for server deployment ([1a0c1cd](https://github.com/aiyu-ayaan/Aiyu/commit/1a0c1cdc4908b9222791b914595f7cce384a92e6))
* Add GitHub Actions workflow for server deployment via SSH. ([8f3c97a](https://github.com/aiyu-ayaan/Aiyu/commit/8f3c97ab9614769e2033057795669bf9b388c4c6))
* Add GitHub Actions workflow for server deployment via SSH. ([2e2d782](https://github.com/aiyu-ayaan/Aiyu/commit/2e2d782043b4ec070ff094b28a15b3f6622426ad))
* Add GitHub integration with API endpoints for user statistics and configuration management. ([54194b7](https://github.com/aiyu-ayaan/Aiyu/commit/54194b731ff93f821e08593655c86972214ca113))
* Add GitHub stats client component to display user profile, repositories, languages, contributions, and activity. ([ed11d08](https://github.com/aiyu-ayaan/Aiyu/commit/ed11d08366abf7332daa5051fbb8d7cb9577872b))
* Add GitHub stats configuration admin page and client component. ([2fd95c2](https://github.com/aiyu-ayaan/Aiyu/commit/2fd95c28396528607e91f885c039648b983d5294))
* add GITHUB_TOKEN environment variable to Dockerfile and docker-compose configuration. ([1091d56](https://github.com/aiyu-ayaan/Aiyu/commit/1091d56c809a6eff6f898b89680cbcb2edf009cc))
* Add global configuration model and admin management for footer settings. ([f3c063c](https://github.com/aiyu-ayaan/Aiyu/commit/f3c063c2269b23d67d54713201951fbba040d3af))
* Add HomeBlogs component to display recent blog posts and introduce comprehensive dark/light theme variables in global CSS. ([e1c3af4](https://github.com/aiyu-ayaan/Aiyu/commit/e1c3af460035669623e92f7d51b8d6a66c9ef6ff))
* Add HomePageContent component with integrated sections and unlock functionality ([bc66e14](https://github.com/aiyu-ayaan/Aiyu/commit/bc66e14ed30b5319082cca046a817eb6e7b7079f))
* Add image upload API and feature-rich root layout with dynamic metadata, theme, and analytics, and switch Docker to a non-root user. ([9071069](https://github.com/aiyu-ayaan/Aiyu/commit/9071069ac3475820741e3dbfc1286c2b876c7088))
* add lazy loading and async decoding to images across multiple components ([22fa1a0](https://github.com/aiyu-ayaan/Aiyu/commit/22fa1a004ea4b8336636db8f374b5bfecc3e5f96))
* Add line hover effect to header logo and style adjustments for SnakeGamePortfolio ([b477957](https://github.com/aiyu-ayaan/Aiyu/commit/b4779570402deb541c7522aa2825dacf635b9546))
* Add N8nChat component for AI assistance and update layout to include it ([4567d7d](https://github.com/aiyu-ayaan/Aiyu/commit/4567d7d4b1b7109e28fd2514e7bd16e4257ca22b))
* Add Neon Cyberpunk project with details and code link ([ed61f30](https://github.com/aiyu-ayaan/Aiyu/commit/ed61f30593346b2b8767eef554cca8965af0b2da))
* Add new blog creation page with markdown editor and preview, API endpoint, and database model. ([0876764](https://github.com/aiyu-ayaan/Aiyu/commit/0876764df1f568a21bcc7f1fc98fbc0f03e946dc))
* Add PR Build Check workflow for automated linting and build verification ([5720a1f](https://github.com/aiyu-ayaan/Aiyu/commit/5720a1f3e5f7f5c2759a6f9f9b34a779354a3b3d))
* add professional summary and implement HomeAbout and HomeProjects components with animations ([62326ac](https://github.com/aiyu-ayaan/Aiyu/commit/62326ac7f675520018d473621f24b0005e630d0f))
* add react-confetti for win state celebration in SnakeGamePortfolio component ([bd85507](https://github.com/aiyu-ayaan/Aiyu/commit/bd85507f0579b861d587f1adbe7026b4ef66f663))
* add react-icons dependency and integrate calendar icon in Timeline component ([025b19e](https://github.com/aiyu-ayaan/Aiyu/commit/025b19ed2c73c84cd47865676af74bf038f00b21))
* Add release-please workflow and configuration for automated releases ([1fd24e0](https://github.com/aiyu-ayaan/Aiyu/commit/1fd24e03e89e3bbcaaf609233350799dc9ac0b94))
* add RouteBetaBadge component and integrate into various pages ([dc715ab](https://github.com/aiyu-ayaan/Aiyu/commit/dc715ab3b23b1117322fd265438d7e7ef71ce1b9))
* Add secure image upload with HEIC conversion, image processing, and a gallery management UI. ([6ffd80d](https://github.com/aiyu-ayaan/Aiyu/commit/6ffd80d3c2544e881b3f97f5ab08680f80b4c349))
* Add TechStackCarousel and HomeProjects components to the landing page. ([e9b71d1](https://github.com/aiyu-ayaan/Aiyu/commit/e9b71d1c1166761f96262cf901975b376a3dccf9))
* add TechStackCarousel component to display skills with animated or static layouts and dynamic icon loading. ([98067f1](https://github.com/aiyu-ayaan/Aiyu/commit/98067f1e701adf5fda3dbd0419348271dd24762a))
* Added option to publish and unpublish blogs ([c1db532](https://github.com/aiyu-ayaan/Aiyu/commit/c1db5328ad822b1adb91ad417cbe489f4054fe48))
* Beta Badge Integration ([#139](https://github.com/aiyu-ayaan/Aiyu/issues/139)) ([70a1e77](https://github.com/aiyu-ayaan/Aiyu/commit/70a1e774934d54af28467e011ff6d13ad0446d52))
* **blogs:** Implement dynamic blog detail page with server-side data fetching and client-side markdown rendering. ([bbe6d0d](https://github.com/aiyu-ayaan/Aiyu/commit/bbe6d0dff73036896506c305f41d4fc68c8eb8ed))
* Define global styles including dark/light theme variables, animations, and third-party component customizations. ([e694ec0](https://github.com/aiyu-ayaan/Aiyu/commit/e694ec013eec6cccf9c30c7780d190ba915b92c4))
* Enhance About component with skills expansion and professional experience timeline ([804c571](https://github.com/aiyu-ayaan/Aiyu/commit/804c5713c22bdb70f66cbd01259e7f3ff57936c7))
* enhance blog management with slug generation and Open Graph image support ([147b1fd](https://github.com/aiyu-ayaan/Aiyu/commit/147b1fdec616cea952949f3fea7b9a9738718701))
* Enhance BlogDetailClient with optimized image handling and improved markdown styling ([1e25143](https://github.com/aiyu-ayaan/Aiyu/commit/1e2514321957784a187943c6b623f220d06c6886))
* Enhance deployment workflow with environment input and conditio… ([78ec4d6](https://github.com/aiyu-ayaan/Aiyu/commit/78ec4d6cdb134a88d2a9bd4ed0b072d264437b2d))
* Enhance deployment workflow with environment input and conditional deployment triggers ([c1087f7](https://github.com/aiyu-ayaan/Aiyu/commit/c1087f7fbb82fd56223ebf91358034470d2033e7))
* enhance download button accessibility in GalleryClient ([8cb3682](https://github.com/aiyu-ayaan/Aiyu/commit/8cb3682f85b6b28c06e73b70009ace501dcc1ba4))
* Enhance header with water-fill progress bar and wavy edge animation ([4506ef1](https://github.com/aiyu-ayaan/Aiyu/commit/4506ef1e082b6001699301d9fa34ef747bdacb2c))
* Enhance health check API to support shallow and deep modes ([fb0735f](https://github.com/aiyu-ayaan/Aiyu/commit/fb0735fb85657e29b4dd5b8089b6e3198dbf8e89))
* enhance project display with conditional image rendering and project type icons in Timeline ([0ad3917](https://github.com/aiyu-ayaan/Aiyu/commit/0ad3917f5c2b7967bffeb2c093bb736de2fe6ae2))
* Enhance project sorting logic and add display order to project selection ([6d24eae](https://github.com/aiyu-ayaan/Aiyu/commit/6d24eae2a91df84e5529c08e660227c174ae52ce))
* enhance ProjectDialog with improved status handling and UI updates ([c38adb4](https://github.com/aiyu-ayaan/Aiyu/commit/c38adb43a2007a8d736db001dcb867c93907411b))
* enhance Projects and ProjectDialog components with filtering options and improved styling ([e8af72a](https://github.com/aiyu-ayaan/Aiyu/commit/e8af72a5480f7bfe65dc1338007bd3ebaa1a2443))
* Enhance SEO optimization across the portfolio website ([06657a0](https://github.com/aiyu-ayaan/Aiyu/commit/06657a02005fca6cc246da39f0df07ce0a3b0501))
* Enhance sitemap generation with dynamic routes for projects and deployments, add slug handling for entities ([74947f3](https://github.com/aiyu-ayaan/Aiyu/commit/74947f31051ef476d2007875c98e0ed59aa6d589))
* Enhance skills display in About component with improved animations and layout ([9b2dcd3](https://github.com/aiyu-ayaan/Aiyu/commit/9b2dcd371c02f77f4bd960a2d84a55d5981c2b7c))
* enhance TechStackDialog styling and implement project selection dialog in HomeProjects component ([a325817](https://github.com/aiyu-ayaan/Aiyu/commit/a3258170efae2380f93d0bc4c7d13491118b7e8b))
* Establish initial portfolio structure with admin blog/social management, authentication, and API endpoints. ([f6cf787](https://github.com/aiyu-ayaan/Aiyu/commit/f6cf78714112fec57110972c0fea9d4c59b58b72))
* extend confetti display duration in SnakeGamePortfolio component ([5c0f87e](https://github.com/aiyu-ayaan/Aiyu/commit/5c0f87ee9d660919c08ed2d4688645ea98e49d33))
* Implement a file upload API route and disable non-root user in … ([ebc007a](https://github.com/aiyu-ayaan/Aiyu/commit/ebc007a3279f92e93c2a07f77706064289d3f4b3))
* Implement a file upload API route and disable non-root user in Dockerfile. ([a017156](https://github.com/aiyu-ayaan/Aiyu/commit/a017156dbae8a18dcd311cdbcbcbf9eaead902e2))
* implement a new contact page with an interactive form and dynamic information display. ([1d3a9a2](https://github.com/aiyu-ayaan/Aiyu/commit/1d3a9a2c29285387525bb2482327817e76c4088b))
* Implement AboutForm component for admin panel with drag-and-drop reordering and icon selection. ([07d987a](https://github.com/aiyu-ayaan/Aiyu/commit/07d987a45c3e7df871a3a16ce269c17e9a328f6a))
* Implement admin blog creation and editing with markdown, image upload, and date picker. ([97d6a9a](https://github.com/aiyu-ayaan/Aiyu/commit/97d6a9a4671d0d842f2352bc7f00dfc1f419297b))
* Implement admin contact page for managing settings and messages, supported by a new API route. ([891a7ca](https://github.com/aiyu-ayaan/Aiyu/commit/891a7ca7f56b34b1bbd99c83999e5519392cee7a))
* Implement admin database export and import functionality with a dedicated UI. ([94907ca](https://github.com/aiyu-ayaan/Aiyu/commit/94907ca5f031323afb66d90074e39cb2b3aedeae))
* Implement AI difficulty levels and game mode selection in TicTacToe component ([a2fb12f](https://github.com/aiyu-ayaan/Aiyu/commit/a2fb12fd67596238190445ce1cfc179bf9880a2d))
* Implement API endpoints for file upload and serving. ([ec815f2](https://github.com/aiyu-ayaan/Aiyu/commit/ec815f258d999149a84965784282914a4f0043b9))
* Implement background link extraction with web worker and optimize blog detail components ([6fa6d85](https://github.com/aiyu-ayaan/Aiyu/commit/6fa6d857c0987ac647fed8b9652566206b2c8eb3))
* implement blog detail page with dynamic content rendering, metadata generation, and sharing functionality. ([bbffb55](https://github.com/aiyu-ayaan/Aiyu/commit/bbffb55e13b17402c3807967a0b2a779c23a2de1))
* Implement blog feature with public detail view and admin create/edit functionality.feat: Implement blog feature with public detail view and admin create/edit functionality. ([2ac8c6c](https://github.com/aiyu-ayaan/Aiyu/commit/2ac8c6cc6d9fa9113842fb18b0e846fb096beb22))
* Implement cache purging functionality and disable caching for admin data ([f71474a](https://github.com/aiyu-ayaan/Aiyu/commit/f71474ae51109c1bd6b888c14961e64ac9d9650c))
* implement client-side blog detail page with markdown rendering, syntax highlighting, and share functionality. ([2e156ee](https://github.com/aiyu-ayaan/Aiyu/commit/2e156eed2ac82c9ab2a5458671c38ad047885ccb))
* implement client-side project filtering, sorting, and display components for the projects page ([ef3211f](https://github.com/aiyu-ayaan/Aiyu/commit/ef3211f501393acb766924ce1a612cafb0ef6a57))
* Implement comprehensive blog management system with admin panel and image upload functionality. ([fcedddf](https://github.com/aiyu-ayaan/Aiyu/commit/fcedddf4121709290cf2c31106386050b0fc6a03))
* Implement contact page with form submission, admin configuration, and message management. ([b40e5b4](https://github.com/aiyu-ayaan/Aiyu/commit/b40e5b45b9ffe74aa10e59b1fe9496e853aff910))
* implement core UI components for portfolio sections including GitHub stats, projects, blogs, and general utilities. ([c2999bd](https://github.com/aiyu-ayaan/Aiyu/commit/c2999bd9957d0fa12c5eeda58f38236c0187aee9))
* implement deployment and project management components with associated data models and fetchers ([2fb8193](https://github.com/aiyu-ayaan/Aiyu/commit/2fb8193b14197db43d8081b581807b33d1d6576b))
* implement full portfolio website with admin panel, API, and database models ([52072c9](https://github.com/aiyu-ayaan/Aiyu/commit/52072c9d46f64f831ddaf13f1e53f909a9f79743))
* Implement gallery feature with public display, admin management, and authentication middleware. ([c196612](https://github.com/aiyu-ayaan/Aiyu/commit/c196612042a865bf06e1a57f4ab92154fcb6de34))
* Implement GitHub integration with public stats display and admin configuration. ([1d40bf7](https://github.com/aiyu-ayaan/Aiyu/commit/1d40bf7b31730c60cdef78bd8220e60aa63e1c66))
* implement GitHub stats display with new API route, client component, and model, along with an updated env example. ([eb8ff2a](https://github.com/aiyu-ayaan/Aiyu/commit/eb8ff2acf16f0af30d2c83fff91864c0b2a221db))
* Implement global styles with dark/light theme support, animations, and third-party component theming. ([0cd7438](https://github.com/aiyu-ayaan/Aiyu/commit/0cd7438654705010a81d931e0ab9cba1916a1c72))
* implement home page content management with an admin form, a futuristic resume display, and a corresponding data model. ([8f4b687](https://github.com/aiyu-ayaan/Aiyu/commit/8f4b687675ead4d47ac216201724c4bd978cfd77))
* Implement image gallery with Masonry layout and lightbox, and establish core site layout including a new header. ([b2b01cb](https://github.com/aiyu-ayaan/Aiyu/commit/b2b01cbe4cc0e14d52ff7b79bcd614bb8d0fa83e))
* Implement initial admin dashboard page with sectioned navigation and logout functionality. ([81b6cb0](https://github.com/aiyu-ayaan/Aiyu/commit/81b6cb00de5865b6442eb41d460260b977feb0ad))
* Implement initial landing page structure with new FuturisticResume and animated Divider components. ([7afcda5](https://github.com/aiyu-ayaan/Aiyu/commit/7afcda58051b3c18eb9abed2072929df13a7d353))
* Implement initial landing page structure, About admin form with icon support, About model, and landing page components for blogs and tech stack. ([edc1843](https://github.com/aiyu-ayaan/Aiyu/commit/edc1843d04fb183434d1ed3a9db5483eb433a9e1))
* implement loading animation and transition for Snake Game portfolio ([911aadc](https://github.com/aiyu-ayaan/Aiyu/commit/911aadc1558dd8eec1c3c38018dd2dd7e6ee9f5b))
* implement Open Graph link previews for blog content with a new API route and dedicated component. ([ea62a93](https://github.com/aiyu-ayaan/Aiyu/commit/ea62a93c13042e77d5fc67f9ce4998849e9bd63a))
* implement project reordering and status management features ([dc458b3](https://github.com/aiyu-ayaan/Aiyu/commit/dc458b37c35f0caa832f1c48973a6c83e92df843))
* Implement project showcase with interactive components ([73de78e](https://github.com/aiyu-ayaan/Aiyu/commit/73de78ef9c79b08b77506968b86bab3f34fcc423))
* implement Projects section with ProjectCard and ProjectDialog components, update header links ([f3217b2](https://github.com/aiyu-ayaan/Aiyu/commit/f3217b2d65be46b8307974c15c2f435c4109d096))
* Implement secure file upload API, add gallery image URL migration endpoint, and configure Next.js image handling. ([91ee417](https://github.com/aiyu-ayaan/Aiyu/commit/91ee41727d11dfbcfcc92ad4b91f9c1af5eedc73))
* Implement site configuration and content management with admin forms, models, and core UI components. ([4aa30ee](https://github.com/aiyu-ayaan/Aiyu/commit/4aa30ee58c3e580c1dcabc93d7950a6834b0a4f8))
* Implement site configuration management with a new model, admin form, dynamic metadata, and Google Analytics integration. ([b2412da](https://github.com/aiyu-ayaan/Aiyu/commit/b2412da143981564bc401adf7607da6e6271888a))
* implement skeleton loading components for various pages and enhance loading states ([5536ced](https://github.com/aiyu-ayaan/Aiyu/commit/5536ced89648124f11d0e90dc6a45cdd178c78b0))
* implement TypewriterEffect component for dynamic role display ([a5c2c40](https://github.com/aiyu-ayaan/Aiyu/commit/a5c2c40c3d29172108bbf9390cd34cec8f2bed2a))
* Increase Docker Compose CPU and memory limits and reservations to prevent freezing ([7dfe041](https://github.com/aiyu-ayaan/Aiyu/commit/7dfe041bbf046ee94101832c57809618ecd9d9c5))
* Initialize `public/uploads` with `.gitkeep` and configure `.gitignore` to ignore its contents, along with adding initial example images. ([b7a2add](https://github.com/aiyu-ayaan/Aiyu/commit/b7a2addab22caade6ddf83e0a540a9a7e5c6a574))
* integrate framer-motion for loading animation and enhance Snake Game UI with transitions ([779db0e](https://github.com/aiyu-ayaan/Aiyu/commit/779db0e13b1dde907031c1db8eed2ce4733183db))
* integrate TypewriterEffect component in About and Projects sections, enhance Divider with animation ([6113e69](https://github.com/aiyu-ayaan/Aiyu/commit/6113e6987dd30b10d82ca3c02f3e44efd3b2332b))
* integrate vertical timeline for professional experience and education sections in About component ([41c04c9](https://github.com/aiyu-ayaan/Aiyu/commit/41c04c922c4d433b295b0dfb89dbb497c573a646))
* Integrate vertical timeline for project display and enhance tech stack dialog ([3fe84fe](https://github.com/aiyu-ayaan/Aiyu/commit/3fe84fec1adb80e7b23806d8f81ba20057507c66))
* Introduce a dynamic theming system with admin management, API endpoints, and a React context for application. ([8e2fda5](https://github.com/aiyu-ayaan/Aiyu/commit/8e2fda5ea91a89c19c9a1922404ed019e933840c))
* introduce admin forms for managing site configuration and home … ([c674592](https://github.com/aiyu-ayaan/Aiyu/commit/c67459285f98664923febc00efd62b30b78cf1b6))
* introduce admin forms for managing site configuration and home page content, and add author name environment variable. ([8c68292](https://github.com/aiyu-ayaan/Aiyu/commit/8c68292941f9802b44f47736064a0236fec63387))
* Introduce blog creation functionality with a new admin page, API route, and blog card component. ([bf77638](https://github.com/aiyu-ayaan/Aiyu/commit/bf77638c8475b8631a3f4f33e916a99bcdebf409))
* Introduce blog detail page with markdown rendering, add admin blog listing and deletion, and update Docker configurations for upload persistence. ([31752fc](https://github.com/aiyu-ayaan/Aiyu/commit/31752fc31cad62e58e9e70f3d235d43287a7829f))
* Introduce Home model and admin form to manage homepage content, including futuristic resume and hero section settings. ([4f1cb59](https://github.com/aiyu-ayaan/Aiyu/commit/4f1cb59d1493e5d1ac40f6b4a0669b65a99f3184))
* introduce interactive FuturisticResume, animated Divider, GamePortfolio, and reusable SpaceBackground components. ([81ddcbe](https://github.com/aiyu-ayaan/Aiyu/commit/81ddcbee2997d4873bdb09151885ec79010c6f28))
* Introduce site-wide configuration model, admin dashboard, and integrate config into the main site layout and footer. ([652f947](https://github.com/aiyu-ayaan/Aiyu/commit/652f9470e91be4f66625b6001f32add273f57c56))
* Minor Relase done ✅ ([2d18584](https://github.com/aiyu-ayaan/Aiyu/commit/2d18584337f6bef6c7eb33e2ddf43e144a598a45))
* Minor version update to 3.5.0 ([71ec9ee](https://github.com/aiyu-ayaan/Aiyu/commit/71ec9ee2b81007b0389aacd77f3b9c022753bac5))
* Minor version update to 3.5.0 ([76f0d89](https://github.com/aiyu-ayaan/Aiyu/commit/76f0d89a4b7f5848d07e06175c7841e849f45285))
* move database connection to the try block for sitemap generatio… ([d29b913](https://github.com/aiyu-ayaan/Aiyu/commit/d29b9138c7034c02a599dc0d161bf52c4d7ed53c))
* move database connection to the try block for sitemap generation and add warning for unavailable database ([c72a26f](https://github.com/aiyu-ayaan/Aiyu/commit/c72a26ff3b83cdec3b8c0d81662b23ec3ae57807))
* move project data to a separate file and import it into Projects component ([2d3047f](https://github.com/aiyu-ayaan/Aiyu/commit/2d3047ffc0b5bf89262b07f8de5089d83b56912d))
* move skills, experiences, and education data to a separate aboutData file for better organization ([2107d29](https://github.com/aiyu-ayaan/Aiyu/commit/2107d29579ecd4dc46901ed226e7a391ea0e714c))
* Now Image available at DockerHub ([#108](https://github.com/aiyu-ayaan/Aiyu/issues/108)) ([e4a47c7](https://github.com/aiyu-ayaan/Aiyu/commit/e4a47c7569e4b68587c46ca1727708c3ad9c9857))
* Optimize blog detail page by fetching blog and config data concurrently and enhance metadata extraction ([06bc58f](https://github.com/aiyu-ayaan/Aiyu/commit/06bc58f9ad55ed9635b8cb993113df4560760571))
* Optimize blog page performance by addressing critical bottlenecks, including scroll event handling, link extraction, and caching mechanisms ([fd57c48](https://github.com/aiyu-ayaan/Aiyu/commit/fd57c48c2b44a77fdcb45ffbca89579a87732775))
* refactor About and Projects components to use dynamic data from aboutData and projectsData, update TypewriterEffect roles ([e67263d](https://github.com/aiyu-ayaan/Aiyu/commit/e67263dc823335fac0509f8798d5897d4c43a2ce))
* refactor Footer component to use dynamic social links from siteData ([83e6d59](https://github.com/aiyu-ayaan/Aiyu/commit/83e6d59b1fe572104e4ecc72e524f5b9b8f068c0))
* Refactor GitHub Actions workflows for release management and deployment ([4dd4741](https://github.com/aiyu-ayaan/Aiyu/commit/4dd47412f063b4af5797e1d51d931d155617e924))
* Refactor Header component to use dynamic navigation links and update SnakeGamePortfolio with new data structure ([f0d4f21](https://github.com/aiyu-ayaan/Aiyu/commit/f0d4f214159346d012eaf6c49573b994fa3b1d4e))
* Refactor N8nChat component for improved webhook handling and add new skills to aboutData ([537757f](https://github.com/aiyu-ayaan/Aiyu/commit/537757f982771b4d086a818bfc9e614ff687abee))
* Refactor timeline components and styles, remove YearNode, and enhance layout with custom CSS ([1f3431b](https://github.com/aiyu-ayaan/Aiyu/commit/1f3431b2f0c462e76c22eea8d7e1908ec14148f5))
* Release V2.1.12  ([#125](https://github.com/aiyu-ayaan/Aiyu/issues/125)) ([46eddf6](https://github.com/aiyu-ayaan/Aiyu/commit/46eddf657269ddead90e91d42528a307aa0f0024))
* Rename workflow to Build & Deploy and add deployment steps via SSH ([cf97a88](https://github.com/aiyu-ayaan/Aiyu/commit/cf97a882210ae817c33fb6dfb5f36b8b3d02975c))
* replace FuturisticResume with GamePortfolio component, adding interactive Snake and Tic-Tac-Toe games. ([03e7303](https://github.com/aiyu-ayaan/Aiyu/commit/03e730307bcac1101e823c748088277b3ee856bf))
* Replace SnakeGamePortfolio with GamePortfolio component and implement TicTacToe and SnakeGame functionality ([8ee8ed6](https://github.com/aiyu-ayaan/Aiyu/commit/8ee8ed68d8bd3889c332649b82837e68a6bc240f))
* simplify section titles in About component for clarity ([7d9d085](https://github.com/aiyu-ayaan/Aiyu/commit/7d9d085578b6a7321a3eb7eb02e4faf7869a6c0f))
* Update About component and certifications data with new skills and courses ([a99dd95](https://github.com/aiyu-ayaan/Aiyu/commit/a99dd959f0ce527613ff5f7b24954a23852c4699))
* Update code link for Neon Cyberpunk project to point to the Visual Studio Marketplace ([921892a](https://github.com/aiyu-ayaan/Aiyu/commit/921892a62f149f8a641a904457cd06bd524d8e68))
* update dependencies and add new components ([12acca0](https://github.com/aiyu-ayaan/Aiyu/commit/12acca0a6e6f7dd0d29ab4b9b7bb0ad18b913f07))
* update HomeProjects component layout and add theme color meta tag in layout ([6aafe60](https://github.com/aiyu-ayaan/Aiyu/commit/6aafe60fa387196d50dbea367e3f1e39653841d5))
* Update project images to use object-contain for better display and add new projects to projectsData ([87b5612](https://github.com/aiyu-ayaan/Aiyu/commit/87b5612a972a4bfe59c1f685040e6044516eba2a))
* Update resume.pdf to enhance project descriptions and improve clarity ([a3d67b8](https://github.com/aiyu-ayaan/Aiyu/commit/a3d67b82a74b7e64192c5db8f90201bfa2070fe4))
* update skills data in aboutData.js with additional technologies and levels ([6aa20bf](https://github.com/aiyu-ayaan/Aiyu/commit/6aa20bf8c01b8c2d309282ec10f1f94f3421198c))
* User Experience & UI Improvements ([#134](https://github.com/aiyu-ayaan/Aiyu/issues/134)) ([60cb754](https://github.com/aiyu-ayaan/Aiyu/commit/60cb754f6ef9ec7e8b40032bc2eaec3fa75c0f6d))
* User Experience & UI Improvements([#129](https://github.com/aiyu-ayaan/Aiyu/issues/129)) ([1834a62](https://github.com/aiyu-ayaan/Aiyu/commit/1834a6251866201363891a0306a2ba75aca3df7e))
* **workflows:** enhance deployment process with manual release notes and PR checks ([1e12e89](https://github.com/aiyu-ayaan/Aiyu/commit/1e12e8931d3739d1a4aec9519d30e9f8a461b665))


### Bug Fixes

* add overflow-y-auto to mobile menu for improved scrolling experience ([156ce79](https://github.com/aiyu-ayaan/Aiyu/commit/156ce7990c200f55becf3944710f24372b3c378a))
* Add spacing for better readability in README ([02996f9](https://github.com/aiyu-ayaan/Aiyu/commit/02996f9e63ee4c86e7d71f720237778b55e7f8ef))
* Add test file for release ([4912097](https://github.com/aiyu-ayaan/Aiyu/commit/491209758b392badbaaed251b02de30895491835))
* **blog:** restore soft detail page background blend ([af26085](https://github.com/aiyu-ayaan/Aiyu/commit/af26085ff4656c32ef54ea7ca4c63fc933104372))
* **build:** skip db fetches during build with safe data fallbacks ([b2fa0d0](https://github.com/aiyu-ayaan/Aiyu/commit/b2fa0d0991fc1a44afde4556832786460f29645a))
* **cache:** harden redis usage in docker runtime ([9bec460](https://github.com/aiyu-ayaan/Aiyu/commit/9bec460eb7646e05515b19a1c2f69265db96920f))
* **cache:** verify redis-backed API caching in dev ([ff4053a](https://github.com/aiyu-ayaan/Aiyu/commit/ff4053abfae51566abba42c7e14718ecaa40e0fc))
* clean up whitespace and improve layout responsiveness ([b17e7c2](https://github.com/aiyu-ayaan/Aiyu/commit/b17e7c25dde894a65c48c040c762e6b011fd1dfd))
* Correct commit type syntax in release-please configuration ([b98df05](https://github.com/aiyu-ayaan/Aiyu/commit/b98df051a9b0bf77d1fe2ccee51c328cf1430619))
* **deployments, projects:** adjust heading margin and padding for improved layout ([bbf58fc](https://github.com/aiyu-ayaan/Aiyu/commit/bbf58fc8bd8518ff98b1e75d8ccaf5968b6dc3df))
* enhance Docker setup with Redis and PM2 support, update README and add local compose file ([017102d](https://github.com/aiyu-ayaan/Aiyu/commit/017102dd4b40cef0f7b01f54502d6f0068221219))
* Enhance release trigger logic and version handling in workflow ([6e7c8df](https://github.com/aiyu-ayaan/Aiyu/commit/6e7c8dff3cca824ba2adb434d7559eb775ad41b3))
* Fix release done ([7eb7709](https://github.com/aiyu-ayaan/Aiyu/commit/7eb7709b0f91b024a91e797e095b506235caa6e0))
* Fix release done ([e1d4661](https://github.com/aiyu-ayaan/Aiyu/commit/e1d4661805fdf183afdcd6469dd1e89e5aeca818))
* Implement comprehensive security for file uploads and authentication, add security documentation, scripts, and a link preview component. ([e0d6b83](https://github.com/aiyu-ayaan/Aiyu/commit/e0d6b83df8c200638da6c83f1f9c3d0a7969a600))
* improve error handling for thumbnail deletion and clean up whitespace in updateGalleryItem function ([ed0d008](https://github.com/aiyu-ayaan/Aiyu/commit/ed0d0080b179983a51126ab4a01533304fb766f5))
* Optimize header performance by adjusting animation durations and reducing box-shadow effects ([490fd41](https://github.com/aiyu-ayaan/Aiyu/commit/490fd4109fa5946538658405609aba759c4eb063))
* Patch Release 🔥 ([4a48b8a](https://github.com/aiyu-ayaan/Aiyu/commit/4a48b8a3ec9f3e39b2f99850bb789edaf45691c0))
* Patch Release 🔥 ([610286e](https://github.com/aiyu-ayaan/Aiyu/commit/610286e4b9217334d22c913dbc2377abd924d91c))
* refactor CI/CD workflows for improved deployment process and clarity ([06ef157](https://github.com/aiyu-ayaan/Aiyu/commit/06ef15764b6d1eeb7eea4f3b450eb8a42f05cd69))
* Release v3.0.1 done([#127](https://github.com/aiyu-ayaan/Aiyu/issues/127)) ([243b5c5](https://github.com/aiyu-ayaan/Aiyu/commit/243b5c5f53fa40f92f32cb46c5ca92e3043d587d))
* Remove ANALYSIS.txt and optimization summary files after blog page performance enhancements ([080ed72](https://github.com/aiyu-ayaan/Aiyu/commit/080ed7254ab171caf8684fb71b384d2c3fc0a5e9))
* Remove CNAME file for domain configuration ([6dc121b](https://github.com/aiyu-ayaan/Aiyu/commit/6dc121b275cba6e74593e7c6966a9157faf6476a))
* Remove duplicate theme toggle, add timeline visibility in light theme, fix TicTacToe theme support ([5037748](https://github.com/aiyu-ayaan/Aiyu/commit/503774821a6a23d142c8e37ca864418637b99962))
* Remove overflow hidden from layout container for improved styling ([433b57c](https://github.com/aiyu-ayaan/Aiyu/commit/433b57cb4cd0324dba089c864b9022805af8f91c))
* reposition progress bar to bottom of header for improved visibility ([3e6c1a2](https://github.com/aiyu-ayaan/Aiyu/commit/3e6c1a268acc779a9bd44f79cb477d848d9097be))
* Restrict push trigger to master branch only in PR Build Check workflow ([4fe98d9](https://github.com/aiyu-ayaan/Aiyu/commit/4fe98d95a7c4a028c6c159d22b3c93f2b045a942))
* Revamp CI/CD workflow for release and deployment process ([7ceb898](https://github.com/aiyu-ayaan/Aiyu/commit/7ceb898f3d7bf20fc7ed7653004abeaa60106dbe))
* sync package-lock.json and correct package version to 6.0.0 ([184e67c](https://github.com/aiyu-ayaan/Aiyu/commit/184e67cc1583c0dd9eeb5df86edf5aac2caa852d))
* Test release without space after exclamation ([2e46c14](https://github.com/aiyu-ayaan/Aiyu/commit/2e46c146c027d45f00e083db051696ff225fdd0d))
* Update .env.example with correct Docker MongoDB URI and add troubleshooting ([5234ad1](https://github.com/aiyu-ayaan/Aiyu/commit/5234ad1e6cc89ca89c5afe57a928d3d84124ea2c))
* Update copyright year in LICENSE file to 2026 ([142dc58](https://github.com/aiyu-ayaan/Aiyu/commit/142dc5812e2b9554cf61138578c5cea796c7dd70))
* Update Docker and Nginx configurations for performance optimization and cache control ([b2fb80f](https://github.com/aiyu-ayaan/Aiyu/commit/b2fb80fa2609d45c7afa09fabbf0821b0d4dacca))
* update Dockerfile to use legacy peer resolution for npm ci command ([ab60711](https://github.com/aiyu-ayaan/Aiyu/commit/ab60711127f99e6759ed6dc44f46d2efbfed46e4))
* Update GitHub Actions conditions to remove workflow_dispatch trigger for Docker image push and deployment ([52edb90](https://github.com/aiyu-ayaan/Aiyu/commit/52edb904b9c4d74a8604ac7e8513c94e4a2087f0))
* Update import path for WorkInProgressComponent to shared directory ([6fdcf4a](https://github.com/aiyu-ayaan/Aiyu/commit/6fdcf4a343e4ba3a50f2619c0c58e18c37f2cd6a))
* Update MongoDB and Redis configurations for replica set support ([b51c10a](https://github.com/aiyu-ayaan/Aiyu/commit/b51c10a276ba093fae75a924b93c4f9bccf29f7c))
* Update project year format and remove deprecated project entry from projectsData ([72aad5d](https://github.com/aiyu-ayaan/Aiyu/commit/72aad5d6a6deac868a2749083581d5e9c29b5e52))
* update release configuration and validate commit syntax ([f2e4c58](https://github.com/aiyu-ayaan/Aiyu/commit/f2e4c58aeab9940e42596803875d5cb3d83857c4))


### Performance Improvements

* **api:** optimize public queries with caching, lean reads, and limits ([57dff63](https://github.com/aiyu-ayaan/Aiyu/commit/57dff639505546a4a980e49cc66050fd8fdc641e))
* **cache:** add Redis-backed shared cache with memory fallback ([3d6022f](https://github.com/aiyu-ayaan/Aiyu/commit/3d6022f1d8eb85a60dd7db94faa4522ef1b399e0))
* **rendering:** enable ISR and server-prefetch public content ([c0c8fc2](https://github.com/aiyu-ayaan/Aiyu/commit/c0c8fc24523ec69083b1435658817287ca7811e7))
* **scroll:** reduce blog detail paint cost ([1788765](https://github.com/aiyu-ayaan/Aiyu/commit/1788765f8dd86bdbf0930c4879108f2cc5c3048c))

## [3.5.0](https://github.com/aiyu-ayaan/Aiyu/compare/v3.4.0...v3.5.0) (2026-04-12)


### ⚠ BREAKING CHANGES

* Minor version update to 3.5.0
* Enhance release trigger logic and version handling in workflow
* Minor version update to 3.5.0
* Add test file for release
* Test release without space after exclamation
* Remove ANALYSIS.txt and optimization summary files after blog page performance enhancements
* sync package-lock.json and correct package version to 6.0.0
* Correct commit type syntax in release-please configuration
* Patch Release 🔥
* Patch Release 🔥

### Features

* Add release-please workflow and configuration for automated releases ([1fd24e0](https://github.com/aiyu-ayaan/Aiyu/commit/1fd24e03e89e3bbcaaf609233350799dc9ac0b94))
* Enhance header with water-fill progress bar and wavy edge animation ([4506ef1](https://github.com/aiyu-ayaan/Aiyu/commit/4506ef1e082b6001699301d9fa34ef747bdacb2c))
* Enhance project sorting logic and add display order to project selection ([6d24eae](https://github.com/aiyu-ayaan/Aiyu/commit/6d24eae2a91df84e5529c08e660227c174ae52ce))
* Enhance sitemap generation with dynamic routes for projects and deployments, add slug handling for entities ([74947f3](https://github.com/aiyu-ayaan/Aiyu/commit/74947f31051ef476d2007875c98e0ed59aa6d589))
* Implement background link extraction with web worker and optimize blog detail components ([6fa6d85](https://github.com/aiyu-ayaan/Aiyu/commit/6fa6d857c0987ac647fed8b9652566206b2c8eb3))
* Implement cache purging functionality and disable caching for admin data ([f71474a](https://github.com/aiyu-ayaan/Aiyu/commit/f71474ae51109c1bd6b888c14961e64ac9d9650c))
* Minor version update to 3.5.0 ([71ec9ee](https://github.com/aiyu-ayaan/Aiyu/commit/71ec9ee2b81007b0389aacd77f3b9c022753bac5))
* Minor version update to 3.5.0 ([76f0d89](https://github.com/aiyu-ayaan/Aiyu/commit/76f0d89a4b7f5848d07e06175c7841e849f45285))
* Optimize blog page performance by addressing critical bottlenecks, including scroll event handling, link extraction, and caching mechanisms ([fd57c48](https://github.com/aiyu-ayaan/Aiyu/commit/fd57c48c2b44a77fdcb45ffbca89579a87732775))
* Refactor GitHub Actions workflows for release management and deployment ([4dd4741](https://github.com/aiyu-ayaan/Aiyu/commit/4dd47412f063b4af5797e1d51d931d155617e924))


### Bug Fixes

* add overflow-y-auto to mobile menu for improved scrolling experience ([156ce79](https://github.com/aiyu-ayaan/Aiyu/commit/156ce7990c200f55becf3944710f24372b3c378a))
* Add spacing for better readability in README ([02996f9](https://github.com/aiyu-ayaan/Aiyu/commit/02996f9e63ee4c86e7d71f720237778b55e7f8ef))
* Add test file for release ([4912097](https://github.com/aiyu-ayaan/Aiyu/commit/491209758b392badbaaed251b02de30895491835))
* Correct commit type syntax in release-please configuration ([b98df05](https://github.com/aiyu-ayaan/Aiyu/commit/b98df051a9b0bf77d1fe2ccee51c328cf1430619))
* enhance Docker setup with Redis and PM2 support, update README and add local compose file ([017102d](https://github.com/aiyu-ayaan/Aiyu/commit/017102dd4b40cef0f7b01f54502d6f0068221219))
* Enhance release trigger logic and version handling in workflow ([6e7c8df](https://github.com/aiyu-ayaan/Aiyu/commit/6e7c8dff3cca824ba2adb434d7559eb775ad41b3))
* Optimize header performance by adjusting animation durations and reducing box-shadow effects ([490fd41](https://github.com/aiyu-ayaan/Aiyu/commit/490fd4109fa5946538658405609aba759c4eb063))
* Patch Release 🔥 ([4a48b8a](https://github.com/aiyu-ayaan/Aiyu/commit/4a48b8a3ec9f3e39b2f99850bb789edaf45691c0))
* Patch Release 🔥 ([610286e](https://github.com/aiyu-ayaan/Aiyu/commit/610286e4b9217334d22c913dbc2377abd924d91c))
* refactor CI/CD workflows for improved deployment process and clarity ([06ef157](https://github.com/aiyu-ayaan/Aiyu/commit/06ef15764b6d1eeb7eea4f3b450eb8a42f05cd69))
* Remove ANALYSIS.txt and optimization summary files after blog page performance enhancements ([080ed72](https://github.com/aiyu-ayaan/Aiyu/commit/080ed7254ab171caf8684fb71b384d2c3fc0a5e9))
* Remove CNAME file for domain configuration ([6dc121b](https://github.com/aiyu-ayaan/Aiyu/commit/6dc121b275cba6e74593e7c6966a9157faf6476a))
* Remove overflow hidden from layout container for improved styling ([433b57c](https://github.com/aiyu-ayaan/Aiyu/commit/433b57cb4cd0324dba089c864b9022805af8f91c))
* reposition progress bar to bottom of header for improved visibility ([3e6c1a2](https://github.com/aiyu-ayaan/Aiyu/commit/3e6c1a268acc779a9bd44f79cb477d848d9097be))
* Revamp CI/CD workflow for release and deployment process ([7ceb898](https://github.com/aiyu-ayaan/Aiyu/commit/7ceb898f3d7bf20fc7ed7653004abeaa60106dbe))
* sync package-lock.json and correct package version to 6.0.0 ([184e67c](https://github.com/aiyu-ayaan/Aiyu/commit/184e67cc1583c0dd9eeb5df86edf5aac2caa852d))
* Test release without space after exclamation ([2e46c14](https://github.com/aiyu-ayaan/Aiyu/commit/2e46c146c027d45f00e083db051696ff225fdd0d))
* Update copyright year in LICENSE file to 2026 ([142dc58](https://github.com/aiyu-ayaan/Aiyu/commit/142dc5812e2b9554cf61138578c5cea796c7dd70))
* Update Docker and Nginx configurations for performance optimization and cache control ([b2fb80f](https://github.com/aiyu-ayaan/Aiyu/commit/b2fb80fa2609d45c7afa09fabbf0821b0d4dacca))
* Update GitHub Actions conditions to remove workflow_dispatch trigger for Docker image push and deployment ([52edb90](https://github.com/aiyu-ayaan/Aiyu/commit/52edb904b9c4d74a8604ac7e8513c94e4a2087f0))
* Update MongoDB and Redis configurations for replica set support ([b51c10a](https://github.com/aiyu-ayaan/Aiyu/commit/b51c10a276ba093fae75a924b93c4f9bccf29f7c))
* update release configuration and validate commit syntax ([f2e4c58](https://github.com/aiyu-ayaan/Aiyu/commit/f2e4c58aeab9940e42596803875d5cb3d83857c4))
