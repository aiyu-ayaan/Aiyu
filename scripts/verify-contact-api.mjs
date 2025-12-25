import fetch from 'node-fetch';

async function testContactAPI() {
    console.log('Testing Contact API...');
    try {
        const res = await fetch('http://localhost:3000/api/contact/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test User',
                email: 'test@example.com',
                message: 'This is a test message from verification script.'
            })
        });

        const data = await res.json();
        console.log('Status:', res.status);
        console.log('Response:', data);

        if (res.ok) {
            console.log('SUCCESS: API works.');
        } else {
            console.log('FAILURE: API returned error.');
        }
    } catch (e) {
        console.error('ERROR during fetch:', e);
    }
}

testContactAPI();
