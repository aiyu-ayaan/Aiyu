import { NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(request) {
    try {
        const formData = await request.formData();
        const success = await login(formData);

        if (success) {
            return NextResponse.json({ success: true }, { status: 200 });
        } else {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
