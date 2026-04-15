import { NextResponse } from 'next/server';

export function middleware() {
    return NextResponse.next();
}

// Keep middleware off static assets and low-value file requests so spikes reach
// the origin with less per-request overhead.
export const config = {
    matcher: [
        '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|images|uploads|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|css|js|map|txt|xml)$).*)',
    ],
};
