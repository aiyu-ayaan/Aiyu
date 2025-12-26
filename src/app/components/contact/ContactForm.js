'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ContactForm() {
    const { theme } = useTheme();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [status, setStatus] = useState('idle'); // idle, sending, success, error
    const [errorMessage, setErrorMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('sending');
        setErrorMessage('');

        try {
            const res = await fetch('/api/contact/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setFormData({ name: '', email: '', message: '' });
                // Reset success message after 3 seconds
                setTimeout(() => setStatus('idle'), 3000);
            } else {
                setStatus('error');
                setErrorMessage(data.error || 'Failed to send message');
            }
        } catch (error) {
            setStatus('error');
            setErrorMessage('Something went wrong. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 h-full">
            <div>
                <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Your Name"
                    required
                    className="w-full backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 hover:bg-opacity-20"
                    style={{
                        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        borderColor: theme === 'dark' ? 'var(--border-secondary)' : 'rgba(0, 0, 0, 0.1)',
                        color: 'var(--text-primary)',
                    }}
                />
            </div>
            <div>
                <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    required
                    className="w-full backdrop-blur-sm border rounded-xl p-4 transition-all duration-300 hover:bg-opacity-20"
                    style={{
                        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        borderColor: theme === 'dark' ? 'var(--border-secondary)' : 'rgba(0, 0, 0, 0.1)',
                        color: 'var(--text-primary)',
                    }}
                />
            </div>
            <div className="flex-1">
                <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell me about your project..."
                    required
                    className="w-full h-full min-h-[120px] backdrop-blur-sm border rounded-xl p-4 resize-none transition-all duration-300 hover:bg-opacity-20"
                    style={{
                        backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                        borderColor: theme === 'dark' ? 'var(--border-secondary)' : 'rgba(0, 0, 0, 0.1)',
                        color: 'var(--text-primary)',
                    }}
                />
            </div>
            <button
                type="submit"
                disabled={status === 'sending' || status === 'success'}
                className={`
                    w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-cyan-500/25 relative overflow-hidden group
                    ${status === 'success' ? 'bg-green-500' : ''}
                    ${status === 'sending' ? 'cursor-wait opacity-80' : ''}
                `}
                style={status === 'idle' || status === 'sending' ? {
                    background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))',
                } : {}}
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                {status === 'sending' && <Loader2 className="w-5 h-5 animate-spin" />}
                {status === 'success' && <CheckCircle className="w-5 h-5" />}
                {status === 'idle' && <Send className="w-5 h-5" />}
                {status === 'sending' ? 'Sending...' : status === 'success' ? 'Sent!' : 'Send Message'}
            </button>

            {status === 'error' && (
                <div className="text-red-500 text-sm flex items-center gap-2 mt-2">
                    <AlertCircle className="w-4 h-4" />
                    {errorMessage}
                </div>
            )}
        </form>
    );
}
