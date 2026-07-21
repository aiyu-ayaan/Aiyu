# Design Spec: Social Metadata Overrides Wiring

This document defines the architecture and plan for wiring the per-page social metadata overrides into the public pages.

## Goal

Ensure all public pages managed by the `SOCIAL_PAGES` configuration in `src/lib/socialMeta.js` apply the admin-defined social titles, descriptions, and Open Graph images, defaulting to the global OG image if no per-page override is configured.

## Excluded Routes

- **Blogs:** Both the listing and details pages are excluded as they carry their own per-post social and blog metadata.
- **Dynamic detail routes:** (`/projects/[id]`, `/apps/[id]`, `/ai/[section]`) are excluded from per-page overrides, as their metadata is dynamically populated based on the specific database entry being viewed.

## Proposed Changes

We will modify the `generateMetadata()` function of the following files:

### Version 1 (Classic) Pages
- `src/app/v1/page.js` (Home, key: `/`)
- `src/app/v1/about-me/page.js` (About Me, key: `/about-me`)
- `src/app/v1/projects/page.js` (Projects, key: `/projects`)
- `src/app/v1/apps/page.js` (Apps, key: `/apps`)
- `src/app/v1/gallery/page.js` (Gallery, key: `/gallery`)
- `src/app/v1/github/page.js` (GitHub, key: `/github`)
- `src/app/v1/contact-us/page.js` (Contact Us, key: `/contact-us`)

### Version 2 Pages
- `src/app/v2/page.js` (Home, key: `/`)
- `src/app/v2/about-me/page.js` (About Me, key: `/about-me`)
- `src/app/v2/apps/page.js` (Apps, key: `/apps`)
- `src/app/v2/gallery/page.js` (Gallery, key: `/gallery`)
- `src/app/v2/github/page.js` (GitHub, key: `/github`)
- `src/app/v2/contact-us/page.js` (Contact Us, key: `/contact-us`)
- `src/app/v2/ai/page.js` (AI Hub, key: `/ai`)

*Note: `src/app/v2/projects/page.js` is already wired up correctly.*

### Integration Pattern

For each page, we will update the imports and `generateMetadata` as follows:

```javascript
import { getSocialMeta, applySocialOverrides } from '@/lib/socialMeta';

export async function generateMetadata() {
  const [config, social] = await Promise.all([getConfigData(), getSocialMeta()]);
  const baseName = config?.siteTitle || config?.logoText || 'Portfolio';
  const baseUrl = getSiteUrl();
  const description = '...'; // existing description

  const base = {
    title: `${baseName} | Page Name`,
    description,
    openGraph: {
      title: `${baseName} | Page Name`,
      description,
      url: `${baseUrl}${v2PublicPath(config, '/page-name')}`, // or raw /page-name for v1
      type: 'website',
    },
    alternates: {
      canonical: `${baseUrl}${v2PublicPath(config, '/page-name')}`,
    },
  };

  return applySocialOverrides(base, social, '/page-name', { baseUrl, fallbackImage: config?.ogImage });
}
```

## Verification Plan

### Automated Verification
- Verify that `npm run lint` compiles cleanly with no errors.

### Manual Verification
- Deploy locally and check standard metadata returns on the public routes by requesting their HTML and checking `<title>`, `<meta property="og:title">`, `<meta property="og:description">`, and `<meta property="og:image">` tags.
