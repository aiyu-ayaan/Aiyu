import { NextResponse } from 'next/server';

export function middleware(request) {
    // Clone the response headers
    const requestHeaders = new Headers(request.headers);

    // Add cache control headers to prevent browser caching
    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    // Only apply cache headers to site pages, not admin or API routes
    const pathname = request.nextUrl.pathname;
    
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/api')) {
        // Prevent browser caching for all public pages
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        response.headers.set('ETag', 'W/"dynamic-' + Date.now() + '"');
    }

    return response;
}

// Apply middleware to all routes except static assets
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        '/((?!_next/static|_next/image|favicon.ico|public).*)',
    ],
};
