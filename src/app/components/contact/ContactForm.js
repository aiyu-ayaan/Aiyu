'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function ContactForm() {
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
                    className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl p-4 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 transition-all"
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
                    className="w-full bg-gray-100 dark:bg-gray-800 border-none rounded-xl p-4 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 transition-all"
                />
            </div>
            <div className="flex-1">
                <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell me about your project..."
                    required
                    className="w-full h-full min-h-[120px] bg-gray-100 dark:bg-gray-800 border-none rounded-xl p-4 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 resize-none transition-all"
                />
            </div>
            <button
                type="submit"
                disabled={status === 'sending' || status === 'success'}
                className={`
                    w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2
                    ${status === 'success' ? 'bg-green-500' : 'bg-black dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200'}
                    ${status === 'sending' ? 'opacity-70 cursor-wait' : ''}
                `}
            >
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
