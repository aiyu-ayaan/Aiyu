// Paths served by this Vite app (and by the Rust server's `web` routes). Everything else is still a Next page,
// so links to it must be full page loads. Keep in sync with `server/src/web.rs`.
const APP_ROUTES: RegExp[] = [/^\/games\/?$/, /^\/games\/[^/]+\/?$/, /^\/blogs\/?$/, /^\/blogs\/[^/]+\/?$/, /^\/(about-me|apps|projects|gallery|github|contact-us|ai|sitemap)\/?$/, /^\/(apps|projects|ai)\/[^/]+\/?$/];

export function isAppRoute(href: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  const path = href.split(/[?#]/)[0];
  return APP_ROUTES.some((r) => r.test(path));
}
