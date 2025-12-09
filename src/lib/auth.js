import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const secretKey = process.env.JWT_SECRET || 'your-secret-key';
const key = new TextEncoder().encode(secretKey);

export async function encrypt(payload) {
    return await new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(key);
}

export async function decrypt(input) {
    try {
        const { payload } = await jwtVerify(input, key, {
            algorithms: ['HS256'],
        });
        return payload;
    } catch (error) {
        return null;
    }
}

export async function login(formData) {
    const user = { email: formData.get('email'), name: 'Admin' };

    // Verify credentials
    const username = formData.get('username');
    const password = formData.get('password');

    if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ) {
        // Create the session
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const session = await encrypt({ user, expires });

        // Save the session in a cookie
        cookies().set('session', session, { expires, httpOnly: true });
        return true;
    }

    return false;
}

export async function logout() {
    // Destroy the session
    cookies().set('session', '', { expires: new Date(0) });
}

export async function getSession() {
    const session = cookies().get('session')?.value;
    if (!session) return null;
    return await decrypt(session);
}
