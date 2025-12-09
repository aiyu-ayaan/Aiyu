
async function verifyMarkdown() {
    const baseUrl = 'http://localhost:3000/api/blogs';

    // Create markdown blog
    const markdownBlog = {
        title: 'Markdown Test',
        content: '# Hello Markdown\n\nThis is a **bold** statement.\n\n```js\nconsole.log("Hello World");\n```',
        date: 'December 12, 2025',
        tags: ['Markdown', 'Verification'],
        image: ''
    };

    console.log('Creating Markdown Blog...');
    try {
        const createRes = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(markdownBlog)
        });
        const createData = await createRes.json();

        if (createData.success && createData.data._id) {
            console.log('Created Markdown Blog:', createData.data._id);
            console.log('Verification Success!');
        } else {
            console.error('Creation failed', createData);
        }

    } catch (error) {
        console.error('Error:', error);
    }
}

verifyMarkdown();
