import crypto from 'crypto';
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Config from '@/models/Config';
import { getSession } from '@/lib/auth';

function hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function requireSession() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }
    return null;
}

async function getTokenStatus() {
    try {
        await dbConnect();
        const config = await Config.findOne().select('+blogApiTokenHash blogApiTokenLast4 blogApiTokenCreatedAt').lean();

        return NextResponse.json({
            success: true,
            data: {
                hasToken: Boolean(config?.blogApiTokenHash),
                last4: config?.blogApiTokenLast4 || '',
                createdAt: config?.blogApiTokenCreatedAt || null,
            },
        });
    } catch (error) {
        console.error('Failed to fetch blog token status:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch token status' },
            { status: 500 }
        );
    }
}

async function generateToken() {
    try {
        await dbConnect();

        const token = `blg_${crypto.randomBytes(32).toString('hex')}`;
        const tokenHash = hashToken(token);

        await Config.findOneAndUpdate(
            {},
            {
                $set: {
                    blogApiTokenHash: tokenHash,
                    blogApiTokenLast4: token.slice(-4),
                    blogApiTokenCreatedAt: new Date(),
                },
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return NextResponse.json({
            success: true,
            data: {
                token,
                createdAt: new Date().toISOString(),
                last4: token.slice(-4),
            },
        });
    } catch (error) {
        console.error('Failed to generate blog token:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate token' },
            { status: 500 }
        );
    }
}

async function revokeToken() {
    try {
        await dbConnect();
        await Config.findOneAndUpdate(
            {},
            {
                $set: {
                    blogApiTokenHash: '',
                    blogApiTokenLast4: '',
                    blogApiTokenCreatedAt: null,
                },
            },
            { upsert: true, setDefaultsOnInsert: true }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to revoke blog token:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to revoke token' },
            { status: 500 }
        );
    }
}

export async function GET() {
    const unauthorized = await requireSession();
    if (unauthorized) return unauthorized;
    return getTokenStatus();
}

export async function POST() {
    const unauthorized = await requireSession();
    if (unauthorized) return unauthorized;
    return generateToken();
}

export async function DELETE() {
    const unauthorized = await requireSession();
    if (unauthorized) return unauthorized;
    return revokeToken();
}
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
