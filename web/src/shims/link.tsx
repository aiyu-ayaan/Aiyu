// `next/link` for the Vite app: client-side navigation inside this app, a plain <a> (full load) for everything else.
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';
import { isAppRoute } from '../appRoutes';

type Href = string | { pathname?: string; query?: Record<string, string>; hash?: string };

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: Href;
  replace?: boolean;
  scroll?: boolean;
  prefetch?: boolean | null;
  children?: ReactNode;
};

function toUrl(href: Href): string {
  if (typeof href === 'string') return href;
  const qs = href.query ? `?${new URLSearchParams(href.query)}` : '';
  return `${href.pathname ?? ''}${qs}${href.hash ? `#${href.hash.replace(/^#/, '')}` : ''}`;
}

const Link = forwardRef<HTMLAnchorElement, Props>(function Link({ href, replace, scroll: _s, prefetch: _p, ...rest }, ref) {
  const url = toUrl(href);
  if (isAppRoute(url) && !rest.target) {
    return <RouterLink ref={ref} to={url} replace={replace} {...rest} />;
  }
  return <a ref={ref} href={url} {...rest} />;
});

export default Link;
