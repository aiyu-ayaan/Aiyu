export const navLinks = [
  {
    name: '_hello',
    href: '/',
  },
  {
    name: '_about-me',
    href: '/about-me',
  },
  {
    name: '_projects',
    href: '/projects',
  },
  {
    name: '_apps',
    href: '/apps',
  },
  // The `_resume` link is intentionally omitted here. It is injected at
  // request time by SiteLayout (src/app/(site)/layout.js) only when a resume
  // is configured in the DB (config.resume), pointing at /api/resume for an
  // uploaded file or the external URL. This keeps the resume DB-backed and
  // persistent across container rebuilds — never baked into the image.
];

export const contactLink = {
  name: 'contact-me',
  href: 'http://bento.me/aiyu',
};
