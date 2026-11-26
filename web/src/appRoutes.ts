// Paths this Vite app routes on the client (the Rust server's page routes). Links to anything else, such as legal
// pages, files and the API, must be full page loads. Keep in sync with `server/src/lib.rs`.
const APP_ROUTES: RegExp[] = [/^\/admin(\/|$)/, /^\/$/, /^\/games\/?$/, /^\/games\/[^/]+\/?$/, /^\/blogs\/?$/, /^\/blogs\/[^/]+\/?$/, /^\/(about-me|apps|projects|gallery|github|contact-us|ai|sitemap|desktop)\/?$/, /^\/(apps|projects|ai)\/[^/]+\/?$/];

export function isAppRoute(href: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  const path = href.split(/[?#]/)[0];
  return APP_ROUTES.some((r) => r.test(path));
}
