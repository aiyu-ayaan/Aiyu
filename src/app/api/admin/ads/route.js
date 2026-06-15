import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSingleton, upsertSingleton } from '@/lib/serialize';
import { getSession } from '@/lib/auth';
import cache from '@/lib/cache';
import { encrypt, decrypt } from '@/lib/encryption';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let adsConfig = await getSingleton(prisma, 'ads');

        if (!adsConfig) {
            adsConfig = await upsertSingleton(prisma, 'ads', {});
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
            adsTxt: adsConfig.adsTxt || '',
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
        const body = await request.json();

        const updateData = {
            adsenseEnabled: Boolean(body.adsenseEnabled),
            adsTxt: body.adsTxt !== undefined ? String(body.adsTxt) : '',
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

        await upsertSingleton(prisma, 'ads', updateData);

        await cache.invalidateAsync('db:ads');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to update ads config:', error);
        return NextResponse.json({ error: 'Failed to update ads configuration' }, { status: 500 });
    }
}
