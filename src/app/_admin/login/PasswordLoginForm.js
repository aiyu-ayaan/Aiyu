"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

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
        <>
            {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-200 p-3 rounded mb-4 text-sm">
                    {error}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Username</label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none transition-colors"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 text-gray-300">Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 rounded bg-gray-700 border border-gray-600 focus:border-cyan-400 focus:outline-none transition-colors"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded transition-colors"
                >
                    Login
                </button>
            </form>
        </>
    );
}
