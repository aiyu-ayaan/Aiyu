import { NextResponse } from 'next/server';

export function middleware(request) {
    const requestHeaders = new Headers(request.headers);
    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
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
