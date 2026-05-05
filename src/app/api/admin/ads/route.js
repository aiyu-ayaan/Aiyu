import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Ads from '@/models/Ads';
import { getSession } from '@/lib/auth';
import cache from '@/lib/cache';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();
        let adsConfig = await Ads.findOne().select('+encryptedClientId +encryptedSlotId').lean();
        
        if (!adsConfig) {
            adsConfig = await Ads.create({});
        }

        const data = {
            adsenseEnabled: adsConfig.adsenseEnabled || false,
            clientId: decrypt(adsConfig.encryptedClientId) || '',
            slotId: decrypt(adsConfig.encryptedSlotId) || '',
            adCount: adsConfig.adCount || 1
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error('Failed to fetch ads config:', error);
        return NextResponse.json({ error: 'Failed to fetch ads configuration' }, { status: 500 });
    }
}

export async function PUT(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        await dbConnect();
        const body = await request.json();
        
        const updateData = {
            adsenseEnabled: Boolean(body.adsenseEnabled),
        };

        if (body.adCount !== undefined) {
            updateData.adCount = Number(body.adCount);
        }

        if (body.clientId !== undefined) {
            updateData.encryptedClientId = encrypt(body.clientId);
        }
        if (body.slotId !== undefined) {
            updateData.encryptedSlotId = encrypt(body.slotId);
        }

        const updatedAds = await Ads.findOneAndUpdate(
            {}, 
            { $set: updateData }, 
            { new: true, upsert: true, runValidators: true }
        );

        await cache.invalidateAsync('db:ads');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update ads config:', error);
        return NextResponse.json({ error: 'Failed to update ads configuration' }, { status: 500 });
    }
}
