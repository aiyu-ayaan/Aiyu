/**
 * Health Check Endpoint
 * Used by Docker healthcheck to verify container is running properly
 */

import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Basic health check - returns 200 if the server is responding
        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({
            status: 'unhealthy',
            error: 'Health check failed'
        }, { status: 503 });
    }
}

export const dynamic = 'force-dynamic';
