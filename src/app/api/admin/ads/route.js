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
        let adsConfig = await Ads.findOne().select(
            '+encryptedClientId ' +
            '+placements.top.encryptedSlotId ' +
            '+placements.middle.encryptedSlotId ' +
            '+placements.bottom.encryptedSlotId ' +
            '+placements.sidebar.encryptedSlotId ' +
            '+placements.footer.encryptedSlotId'
        ).lean();
        
        if (!adsConfig) {
            adsConfig = await Ads.create({});
        }

        const placements = {};
        const placementKeys = ['top', 'middle', 'bottom', 'sidebar', 'footer'];
        
        placementKeys.forEach(key => {
            const placement = adsConfig.placements?.[key] || {};
            placements[key] = {
                enabled: placement.enabled || false,
                slotId: decrypt(placement.encryptedSlotId) || '',
                adType: placement.adType || 'display',
                adLayoutKey: placement.adLayoutKey || ''
            };
        });

        const data = {
            adsenseEnabled: adsConfig.adsenseEnabled || false,
            clientId: decrypt(adsConfig.encryptedClientId) || '',
            placements
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

        if (body.clientId !== undefined) {
            updateData.encryptedClientId = encrypt(body.clientId);
        }

        if (body.placements) {
            updateData.placements = {};
            const placementKeys = ['top', 'middle', 'bottom', 'sidebar', 'footer'];
            
            placementKeys.forEach(key => {
                const p = body.placements[key];
                if (p) {
                    updateData.placements[key] = {
                        enabled: Boolean(p.enabled),
                        adType: p.adType || 'display',
                        adLayoutKey: p.adLayoutKey || ''
                    };
                    if (p.slotId !== undefined) {
                        updateData.placements[key].encryptedSlotId = encrypt(p.slotId);
                    }
                }
            });
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
