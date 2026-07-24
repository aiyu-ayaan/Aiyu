const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

(async () => {
    try {
        const blogs = await p.blog.findMany({ where: { published: true }, take: 3, select: { id: true, title: true, socialImage: true, image: true, slug: true } });
        console.log('=== Blogs ===');
        console.log(JSON.stringify(blogs, null, 2));

        const gallery = await p.gallery.findMany({ take: 3, select: { id: true, src: true, description: true, isPinned: true } });
        console.log('\n=== Gallery ===');
        console.log(JSON.stringify(gallery, null, 2));

        const projects = await p.project.findMany({ take: 3, select: { id: true, name: true, image: true, slug: true } });
        console.log('\n=== Projects ===');
        console.log(JSON.stringify(projects, null, 2));

        const deployments = await p.deployment.findMany({ take: 3, select: { id: true, name: true, image: true, slug: true } });
        console.log('\n=== Deployments ===');
        console.log(JSON.stringify(deployments, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await p['$disconnect']();
    }
})();
