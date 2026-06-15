// Utility: hide selected social links by name (PostgreSQL/Prisma).
//   node --env-file=.env scripts/manage-socials.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function manageSocials() {
    const toHide = ['Email', 'Coffee', 'Instagram'];

    for (const name of toHide) {
        const res = await prisma.social.updateMany({
            where: { name: { contains: name, mode: 'insensitive' } },
            data: { isHidden: true },
        });
        console.log(`Hidden ${name}: ${res.count} updated.`);

        const updated = await prisma.social.findMany({
            where: { name: { contains: name, mode: 'insensitive' } },
        });
        updated.forEach((s) => console.log(`  - ${s.name} is now hidden: ${s.isHidden}`));
    }

    console.log('Done.');
}

manageSocials()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
