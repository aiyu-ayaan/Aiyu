
async function testBlogFlow() {
    const baseUrl = 'http://localhost:3000/api/blogs';

    // 1. Create a Blog
    console.log('Creating blog...');
    const newBlog = {
        title: 'API Verification Blog',
        content: 'This blog was created via API verification script.',
        date: 'December 12, 2025',
        tags: ['Verification', 'API'],
        image: 'https://placehold.co/600x400'
    };

    const createRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBlog)
    });

    const createData = await createRes.json();
    console.log('Create Response:', createData);

    if (!createData.success) {
        console.error('Failed to create blog');
        process.exit(1);
    }

    const blogId = createData.data._id;
    console.log('Blog created with ID:', blogId);

    // 2. Fetch All Blogs
    console.log('Fetching all blogs...');
    const listRes = await fetch(baseUrl);
    const listData = await listRes.json();
    const exists = listData.data.some(b => b._id === blogId);
    console.log('Blog exists in list:', exists);

    if (!exists) {
        console.error('Blog not found in list');
        process.exit(1);
    }

    // 3. Fetch Single Blog
    console.log('Fetching single blog...');
    const detailRes = await fetch(`${baseUrl}/${blogId}`);
    const detailData = await detailRes.json();
    console.log('Detail Match:', detailData.data.title === newBlog.title);

    console.log('Verification Successful! Blog ID:', blogId);
}

testBlogFlow();
