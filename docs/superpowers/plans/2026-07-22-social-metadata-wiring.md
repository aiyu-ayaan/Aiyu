# Social Metadata Overrides Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the newly built per-page social metadata overrides into the public pages (`/`, `/about-me`, `/projects`, `/apps`, `/gallery`, `/github`, `/contact-us`, `/ai`), while excluding blogs and dynamic detail pages.

**Architecture:** Use `Promise.all` to fetch both `getConfigData()` and `getSocialMeta()` concurrently in each page's `generateMetadata` function. Define the base metadata object, then apply social overrides using `applySocialOverrides` and return the merged result.

**Tech Stack:** Next.js App Router (metadata API), JavaScript.

## Global Constraints
- Do not break admin authentication or protected routes.
- Keep public UI changes responsive.
- Prefer small, atomic commits for each page integrated.
- Never commit secrets from `.env` or generated credentials.

---

### Task 1: Wire up Classic (v1) Public Page Metadata

**Files:**
- Modify: `src/app/v1/page.js`
- Modify: `src/app/v1/about-me/page.js`
- Modify: `src/app/v1/projects/page.js`
- Modify: `src/app/v1/apps/page.js`
- Modify: `src/app/v1/gallery/page.js`
- Modify: `src/app/v1/github/page.js`
- Modify: `src/app/v1/contact-us/page.js`

**Interfaces:**
- Consumes: `getSocialMeta` and `applySocialOverrides` from `@/lib/socialMeta`
- Produces: Overridden metadata objects returned from `generateMetadata()`

- [ ] **Step 1: Wire `src/app/v1/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  And replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const siteTitle = `${baseName} | ${config?.profession || 'Software Engineer'} Portfolio`;
    const siteDescription = config?.siteDescription || 'Professional portfolio showcasing projects, blogs, and expertise.';

    const base = {
      title: siteTitle,
      description: siteDescription,
      keywords: ['portfolio', 'developer', 'projects', 'blogs', 'web development', config?.profession || 'full stack', 'freelance'].join(', '),
      openGraph: {
        title: siteTitle,
        description: siteDescription,
        url: baseUrl,
        type: 'website',
        locale: 'en_US',
        siteName: siteTitle,
      },
      twitter: {
        card: 'summary_large_image',
        title: siteTitle,
        description: siteDescription,
      },
      alternates: {
        canonical: baseUrl,
      },
    };

    return applySocialOverrides(base, social, '/', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 2: Wire `src/app/v1/about-me/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  And replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Learn more about my background, skills, and experience.';

    const base = {
      title: `${baseName} | About Me`,
      description,
      keywords: ['about', 'developer', 'experience', 'skills', 'background', config?.profession || 'full stack'].join(', '),
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-snippet': -1,
          'max-image-preview': 'large',
          'max-video-preview': -1,
        },
      },
      openGraph: {
        title: `${baseName} | About Me`,
        description,
        url: `${baseUrl}/about-me`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${baseName} | About Me`,
        description,
      },
      alternates: {
        canonical: `${baseUrl}/about-me`,
      },
    };

    return applySocialOverrides(base, social, '/about-me', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 3: Wire `src/app/v1/projects/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  And replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Explore my latest projects and portfolio work.';

    const base = {
      title: `${baseName} | Projects`,
      description,
      keywords: ['projects', 'portfolio', 'development', 'case studies', 'web development', config?.profession || 'full stack'].join(', '),
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-snippet': -1,
          'max-image-preview': 'large',
          'max-video-preview': -1,
        },
      },
      openGraph: {
        title: `${baseName} | Projects`,
        description,
        url: `${baseUrl}/projects`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${baseName} | Projects`,
        description,
      },
      alternates: {
        canonical: `${baseUrl}/projects`,
      },
    };

    return applySocialOverrides(base, social, '/projects', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 4: Wire `src/app/v1/apps/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  And replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Explore my deployed apps and live projects.';

    const base = {
      title: `${baseName} | Apps`,
      description,
      keywords: ['apps', 'portfolio', 'deployments', 'software', config?.profession || 'full stack'].join(', '),
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-snippet': -1,
          'max-image-preview': 'large',
          'max-video-preview': -1,
        },
      },
      openGraph: {
        title: `${baseName} | Apps`,
        description,
        url: `${baseUrl}/apps`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${baseName} | Apps`,
        description,
      },
      alternates: {
        canonical: `${baseUrl}/apps`,
      },
    };

    return applySocialOverrides(base, social, '/apps', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 5: Wire `src/app/v1/gallery/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  And replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Browse through my certificates and visual achievements.';

    const base = {
      title: `${baseName} | Gallery`,
      description,
      keywords: ['gallery', 'photos', 'certificates', 'achievements', 'portfolio'].join(', '),
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-snippet': -1,
          'max-image-preview': 'large',
          'max-video-preview': -1,
        },
      },
      openGraph: {
        title: `${baseName} | Gallery`,
        description,
        url: `${baseUrl}/gallery`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${baseName} | Gallery`,
        description,
      },
      alternates: {
        canonical: `${baseUrl}/gallery`,
      },
    };

    return applySocialOverrides(base, social, '/gallery', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 6: Wire `src/app/v1/github/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  And replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'View repository metrics, contribution analytics, and open-source updates.';

    const base = {
      title: `${baseName} | GitHub`,
      description,
      keywords: ['github', 'open source', 'repositories', 'portfolio', 'developer stats'].join(', '),
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-snippet': -1,
          'max-image-preview': 'large',
          'max-video-preview': -1,
        },
      },
      openGraph: {
        title: `${baseName} | GitHub`,
        description,
        url: `${baseUrl}/github`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${baseName} | GitHub`,
        description,
      },
      alternates: {
        canonical: `${baseUrl}/github`,
      },
    };

    return applySocialOverrides(base, social, '/github', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 7: Wire `src/app/v1/contact-us/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  And replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Get in touch for inquiries, collaborations, or job opportunities.';

    const base = {
      title: `${baseName} | Contact Us`,
      description,
      keywords: ['contact', 'email', 'hiring', 'portfolio', 'freelance'].join(', '),
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-snippet': -1,
          'max-image-preview': 'large',
          'max-video-preview': -1,
        },
      },
      openGraph: {
        title: `${baseName} | Contact Us`,
        description,
        url: `${baseUrl}/contact-us`,
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${baseName} | Contact Us`,
        description,
      },
      alternates: {
        canonical: `${baseUrl}/contact-us`,
      },
    };

    return applySocialOverrides(base, social, '/contact-us', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 8: Commit Stage 1**
  Run: `git commit -a -m "feat(social): wire social overrides for classic v1 pages"`

---

### Task 2: Wire up Version 2 (v2) Public Page Metadata

**Files:**
- Modify: `src/app/v2/page.js`
- Modify: `src/app/v2/about-me/page.js`
- Modify: `src/app/v2/apps/page.js`
- Modify: `src/app/v2/gallery/page.js`
- Modify: `src/app/v2/github/page.js`
- Modify: `src/app/v2/contact-us/page.js`
- Modify: `src/app/v2/ai/page.js`

**Interfaces:**
- Consumes: `getSocialMeta` and `applySocialOverrides` from `@/lib/socialMeta`
- Produces: Overridden metadata objects returned from `generateMetadata()`

- [ ] **Step 1: Wire `src/app/v2/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  Replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const siteTitle = `${baseName} | ${config?.profession || 'Software Engineer'} Portfolio`;
    const baseUrl = getSiteUrl();
    const siteDescription = config?.siteDescription || 'Professional portfolio showcasing projects, blogs, and expertise.';

    const base = {
      title: siteTitle,
      description: siteDescription,
      openGraph: {
        title: siteTitle,
        description: siteDescription,
        url: `${baseUrl}${v2PublicPath(config, '')}`,
        type: 'website',
        locale: 'en_US',
        siteName: siteTitle,
      },
      alternates: {
        canonical: `${baseUrl}${v2PublicPath(config, '')}`,
      },
    };

    return applySocialOverrides(base, social, '/', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 2: Wire `src/app/v2/about-me/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  Replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Learn more about my background, skills, and experience.';

    const base = {
      title: `${baseName} | About Me`,
      description,
      openGraph: {
        title: `${baseName} | About Me`,
        description,
        url: `${baseUrl}${v2PublicPath(config, '/about-me')}`,
        type: 'website',
      },
      alternates: {
        canonical: `${baseUrl}${v2PublicPath(config, '/about-me')}`,
      },
    };

    return applySocialOverrides(base, social, '/about-me', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 3: Wire `src/app/v2/apps/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  Replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Hosted apps and services as a live process table — V2 edition.';

    const base = {
      title: `${baseName} | Apps`,
      description,
      openGraph: {
        title: `${baseName} | Apps`,
        description,
        url: `${baseUrl}${v2PublicPath(config, '/apps')}`,
        type: 'website',
      },
      alternates: {
        canonical: `${baseUrl}${v2PublicPath(config, '/apps')}`,
      },
    };

    return applySocialOverrides(base, social, '/apps', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 4: Wire `src/app/v2/gallery/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  Replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'A pure photo wall — the visual archive with nothing but the frames. V2 edition.';

    const base = {
      title: `${baseName} | Gallery`,
      description,
      openGraph: {
        title: `${baseName} | Gallery`,
        description,
        url: `${baseUrl}${v2PublicPath(config, '/gallery')}`,
        type: 'website',
      },
      alternates: {
        canonical: `${baseUrl}${v2PublicPath(config, '/gallery')}`,
      },
    };

    return applySocialOverrides(base, social, '/gallery', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 5: Wire `src/app/v2/github/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  Replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'A dashboard detailing active projects, languages, and commit history. V2 edition.';

    const base = {
      title: `${baseName} | GitHub`,
      description,
      openGraph: {
        title: `${baseName} | GitHub`,
        description,
        url: `${baseUrl}${v2PublicPath(config, '/github')}`,
        type: 'website',
      },
      alternates: {
        canonical: `${baseUrl}${v2PublicPath(config, '/github')}`,
      },
    };

    return applySocialOverrides(base, social, '/github', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 6: Wire `src/app/v2/contact-us/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  Replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Send an uplink signal. Reach out directly. V2 edition.';

    const base = {
      title: `${baseName} | Contact Us`,
      description,
      openGraph: {
        title: `${baseName} | Contact Us`,
        description,
        url: `${baseUrl}${v2PublicPath(config, '/contact-us')}`,
        type: 'website',
      },
      alternates: {
        canonical: `${baseUrl}${v2PublicPath(config, '/contact-us')}`,
      },
    };

    return applySocialOverrides(base, social, '/contact-us', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 7: Wire `src/app/v2/ai/page.js`**
  Modify imports and `generateMetadata`:
  ```javascript
  import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';
  ```
  Replace `generateMetadata` with:
  ```javascript
  export async function generateMetadata() {
    const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
    const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
    const baseUrl = getSiteUrl();
    const description = 'Artificial intelligence models, fine-tuned engines, and interactive chat playgrounds. V2 edition.';

    const base = {
      title: `${baseName} | AI Hub`,
      description,
      openGraph: {
        title: `${baseName} | AI Hub`,
        description,
        url: `${baseUrl}${v2PublicPath(config, '/ai')}`,
        type: 'website',
      },
      alternates: {
        canonical: `${baseUrl}${v2PublicPath(config, '/ai')}`,
      },
    };

    return applySocialOverrides(base, social, '/ai', { baseUrl, fallbackImage: config?.ogImage });
  }
  ```

- [ ] **Step 8: Commit Stage 2**
  Run: `git commit -a -m "feat(social): wire social overrides for v2 pages"`

---

### Task 3: Verification & Integrity Check

**Files:**
- None

- [ ] **Step 1: Run ESLint**
  Run: `npm run lint`
  Expected: Clean compilation, no syntax errors.

- [ ] **Step 2: Run Production Build**
  Run: `npm run build`
  Expected: Successful production build.
