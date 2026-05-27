import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import dbConnect from '@/lib/db';
import CronEnv from '@/models/CronEnv';
import { encrypt, decrypt } from '@/lib/encryption';

// GET: Retrieve global cron env secrets (Admin only)
async function getCronEnv(request) {
    await dbConnect();
    try {
        let cronEnv = await CronEnv.findOne({});
        if (!cronEnv) {
            cronEnv = await CronEnv.create({ env: [] });
        }
        
        // Decrypt values for admin view
        const envList = (cronEnv.env || []).map(item => ({
            key: item.key,
            value: item.value ? decrypt(item.value) : ''
        }));

        return NextResponse.json({ success: true, data: envList });
    } catch (error) {
        console.error('[API CRON ENV GET ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// POST: Save/Update global cron env secrets (Admin only)
async function saveCronEnv(request) {
    await dbConnect();
    try {
        const body = await request.json();
        const { env = [] } = body;

        // Encrypt values before saving
        const encryptedEnv = (env || []).map(item => ({
            key: item.key,
            value: item.value ? encrypt(item.value) : ''
        }));

        let cronEnv = await CronEnv.findOne({});
        if (!cronEnv) {
            cronEnv = await CronEnv.create({ env: encryptedEnv });
        } else {
            cronEnv.env = encryptedEnv;
            await cronEnv.save();
        }

        // Decrypt values back for the response
        const decryptedList = (cronEnv.env || []).map(item => ({
            key: item.key,
            value: item.value ? decrypt(item.value) : ''
        }));

        return NextResponse.json({ success: true, data: decryptedList });
    } catch (error) {
        console.error('[API CRON ENV POST ERROR]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export const GET = withAuth(getCronEnv);
export const POST = withAuth(saveCronEnv);
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
