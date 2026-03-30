/**
 * Health Check Endpoint
 * Used by Docker healthcheck to verify container is running properly
 */

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

export async function GET() {
    const startedAt = Date.now();

    try {
        await dbConnect();

        const isMongoReady = mongoose.connection.readyState === 1 && Boolean(mongoose.connection.db);
        if (isMongoReady) {
            await mongoose.connection.db.admin().ping();
        }

        const databaseStatus = isMongoReady ? 'up' : 'down';
        const healthy = databaseStatus === 'up';

        return NextResponse.json({
            status: healthy ? 'healthy' : 'degraded',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            responseTimeMs: Date.now() - startedAt,
            checks: {
                database: databaseStatus,
            },
        }, {
            status: healthy ? 200 : 503,
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    } catch (error) {
        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            responseTimeMs: Date.now() - startedAt,
            checks: {
                database: 'down',
            },
            error: 'Health check failed',
        }, {
            status: 503,
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
