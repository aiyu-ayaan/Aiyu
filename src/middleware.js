import { NextResponse } from 'next/server';
import { decrypt } from './lib/auth';
import { cookies } from 'next/headers';

export async function middleware(request) {
    const path = request.nextUrl.pathname;
    const isPublicPath = path === '/admin/login';

    const cookieStore = await cookies();
    const cookie = cookieStore.get('session')?.value;
    const session = await decrypt(cookie);

    if (path.startsWith('/admin') && !isPublicPath && !session) {
        return NextResponse.redirect(new URL('/admin/login', request.nextUrl));
    }

    if (isPublicPath && session) {
        return NextResponse.redirect(new URL('/admin', request.nextUrl));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*'],
};
