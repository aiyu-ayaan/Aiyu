
const fs = require('fs');
const path = require('path');
const { FormData } = require('formdata-node');
const { fileFromPath } = require('formdata-node/file-from-path');

async function testEditorAndUpload() {
    const baseUrl = 'http://localhost:3000/api';

    // 1. Test Image Upload
    console.log('Testing Image Upload...');
    const formData = new FormData();
    const buffer = Buffer.from('fake image data');
    const blob = new Blob([buffer], { type: 'image/png' });
    formData.append('file', blob, 'test_image.png');

    try {
        const uploadRes = await fetch(`${baseUrl}/upload`, {
            method: 'POST',
            body: formData
        });
        const uploadData = await uploadRes.json();
        console.log('Upload Result:', uploadData);

        if (!uploadData.success) {
            console.error('Upload failed');
            process.exit(1);
        }

        const imageUrl = uploadData.url;

        // 2. Create Blog with Rich Text
        console.log('Creating Rich Text Blog...');
        const newBlog = {
            title: 'Rich Text Test',
            content: '<h1>Hello World</h1><p>This is <strong>bold</strong> and <em>italic</em>.</p><img src="' + imageUrl + '" />',
            date: 'December 12, 2025',
            tags: ['RichText', 'Test'],
            image: imageUrl
        };

        const createRes = await fetch(`${baseUrl}/blogs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newBlog)
        });
        const createData = await createRes.json();
        console.log('Blog Create Result:', createData);

        if (createData.success) {
            console.log('Blog ID:', createData.data._id);
            console.log('Verification Successful!');
        } else {
            console.error('Blog creation failed');
            process.exit(1);
        }

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

testEditorAndUpload();
