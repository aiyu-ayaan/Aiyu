'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Send } from 'lucide-react';
import { trackEvent } from '@/lib/track';

const inputStyle = {
  backgroundColor: 'var(--surface-tile)',
  borderColor: 'var(--hairline)',
  color: 'var(--text-primary)',
};

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [status, setStatus] = useState('idle'); // idle, sending, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('sending');
    setErrorMessage('');

    try {
      const res = await fetch('/api/contact/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        trackEvent({ type: 'contact_submit', path: '/contact-us' });
        setFormData({ name: '', email: '', message: '' });
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Failed to send message');
      }
    } catch (_error) {
      setStatus('error');
      setErrorMessage('Something went wrong. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label htmlFor="contact-name" className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Name
        </label>
        <input
          id="contact-name"
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Your Name"
          required
          className="w-full rounded-xl border p-3.5 text-sm transition-colors focus:outline-none"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Email
        </label>
        <input
          id="contact-email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="your@email.com"
          required
          className="w-full rounded-xl border p-3.5 text-sm transition-colors focus:outline-none"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor="contact-message" className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Tell me about your project..."
          required
          className="h-40 w-full resize-none rounded-xl border p-3.5 text-sm transition-colors focus:outline-none"
          style={inputStyle}
        />
      </div>

      <button
        type="submit"
        disabled={status === 'sending' || status === 'success'}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold text-white transition-transform disabled:cursor-not-allowed disabled:opacity-80"
        style={
          status === 'success'
            ? { borderColor: 'transparent', backgroundColor: 'var(--status-success)' }
            : {
                borderColor: 'transparent',
                background: 'linear-gradient(180deg, color-mix(in srgb, var(--apple-blue) 92%, white), var(--apple-blue))',
              }
        }
      >
        {status === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'success' && <CheckCircle className="h-4 w-4" />}
        {status === 'idle' && <Send className="h-4 w-4" />}
        {status === 'sending' ? 'Sending...' : status === 'success' ? 'Sent!' : 'Send Message'}
      </button>

      {status === 'error' && (
        <div className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'color-mix(in srgb, var(--status-error) 40%, var(--border-secondary))', color: 'var(--status-error)', backgroundColor: 'color-mix(in srgb, var(--status-error) 10%, transparent)' }}>
          <AlertCircle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}
    </form>
  );
}
