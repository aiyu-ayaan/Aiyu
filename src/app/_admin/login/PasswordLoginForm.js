"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Field } from '@/app/components/admin/ui';

export default function PasswordLoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                router.push('/admin');
            } else {
                const data = await response.json();
                setError(data.error || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred');
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {error && (
                <div role="alert" className="adm-notice adm-notice-error">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <Field label="Username">
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="adm-input"
                        required
                    />
                </Field>
                <Field label="Password">
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="adm-input"
                        required
                    />
                </Field>
                <button type="submit" className="adm-btn adm-btn-primary w-full min-h-11">
                    Log in
                </button>
            </form>
        </div>
    );
}
