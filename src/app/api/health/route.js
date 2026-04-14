/**
 * Health Check Endpoint
 * Used by Docker healthcheck to verify container is running properly
 */

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db';

export async function GET(request) {
    const startedAt = Date.now();
    const { searchParams } = new URL(request.url);
    const deep = searchParams.get('deep') === '1';

    try {
        if (!deep) {
            return NextResponse.json({
                status: 'healthy',
                mode: 'shallow',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                responseTimeMs: Date.now() - startedAt,
                checks: {
                    database: 'skipped',
                },
            }, {
                status: 200,
                headers: {
                    'Cache-Control': 'no-store, max-age=0',
                },
            });
        }

        await dbConnect();

        const isMongoReady = mongoose.connection.readyState === 1 && Boolean(mongoose.connection.db);
        if (isMongoReady) {
            await mongoose.connection.db.admin().ping();
        }

        const databaseStatus = isMongoReady ? 'up' : 'down';
        const healthy = databaseStatus === 'up';

        return NextResponse.json({
            status: healthy ? 'healthy' : 'degraded',
            mode: 'deep',
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
            mode: deep ? 'deep' : 'shallow',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            responseTimeMs: Date.now() - startedAt,
            checks: {
                database: 'down',
            },
            error: 'Health check failed',
        }, {
            status: deep ? 503 : 200,
            headers: {
                'Cache-Control': 'no-store, max-age=0',
            },
        });
    }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
