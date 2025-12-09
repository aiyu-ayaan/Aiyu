
async function cleanupBlog() {
    const baseUrl = 'http://localhost:3000/api/blogs';

    // Fetch all to find our test blog
    const listRes = await fetch(baseUrl);
    const listData = await listRes.json();
    const testBlog = listData.data.find(b => b.title === 'Rich Text Test');

    if (testBlog) {
        console.log('Deleting test blog:', testBlog._id);
        const deleteRes = await fetch(`${baseUrl}/${testBlog._id}`, {
            method: 'DELETE'
        });
        const deleteData = await deleteRes.json();
        console.log('Delete Response:', deleteData);
    } else {
        console.log('Test blog not found to delete.');
    }
}

cleanupBlog();
