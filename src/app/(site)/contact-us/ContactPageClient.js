'use client';

import { Activity, Clock3, Download, Mail, MapPin, Sparkles } from 'lucide-react';
import ContactForm from '@/app/components/contact/ContactForm';
import { motion } from 'framer-motion';
import RouteBetaBadge from '../../components/shared/RouteBetaBadge';

const cardStyle = {
  borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
  background:
    'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 93%, transparent), color-mix(in srgb, var(--bg-secondary) 93%, transparent))',
};

export default function ContactPageClient({ location, status, email, hasResume, resumeHref }) {
  const quickStats = [
    {
      key: 'status',
      label: 'Current Status',
      value: status,
      icon: Activity,
      accent: 'var(--status-success)',
    },
    {
      key: 'location',
      label: 'Based In',
      value: location,
      icon: MapPin,
      accent: 'var(--accent-cyan)',
    },
    {
      key: 'response',
      label: 'Typical Reply',
      value: 'Within 24 hours',
      icon: Clock3,
      accent: 'var(--accent-purple)',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative min-h-screen overflow-hidden p-4 lg:p-8"
      style={{ color: 'var(--text-primary)' }}
    >
      <div
        className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-cyan) 32%, transparent), transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -right-20 top-1/4 h-64 w-64 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--accent-purple) 28%, transparent), transparent 70%)' }}
      />

      <div className="relative mx-auto w-full max-w-[95%] lg:max-w-[80%]">
        <section
          className="rounded-3xl border p-6 sm:p-8"
          style={{
            ...cardStyle,
            boxShadow: '0 16px 36px var(--shadow-sm)',
          }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.2em]"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-cyan) 44%, var(--border-secondary))',
                color: 'var(--accent-cyan)',
              }}
            >
              <Sparkles size={12} />
              Contact Command Center
            </p>
            <RouteBetaBadge />
          </div>

          <h1
            className="mb-3 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent sm:text-5xl lg:text-6xl"
            style={{
              backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple), var(--accent-pink))',
            }}
          >
            Let&apos;s Talk
          </h1>

          <p className="max-w-3xl text-base sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            Have an idea, collaboration, or product challenge? Share the context and goals, and I&apos;ll reply with
            a focused plan.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {quickStats.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.key}
                  className="rounded-xl border p-3"
                  style={{
                    borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                    backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                  }}
                >
                  <div
                    className="mb-2 inline-flex rounded-lg p-2"
                    style={{ backgroundColor: `color-mix(in srgb, ${item.accent} 14%, transparent)` }}
                  >
                    <Icon size={14} style={{ color: item.accent }} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
                  <p className="text-base font-semibold sm:text-lg">{item.value}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div
            className="rounded-2xl border p-5 lg:col-span-2"
            style={{
              ...cardStyle,
              boxShadow: '0 12px 28px var(--shadow-sm)',
            }}
          >
            <h2 className="mb-2 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Send A Message
            </h2>
            <p className="mb-5 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              Include your goals, timeline, and platform requirements for a faster response.
            </p>
            <ContactForm />
          </div>

          <div className="space-y-4">
            {email && (
              <motion.a
                href={`mailto:${email}`}
                whileHover={{ y: -3 }}
                className="block rounded-2xl border p-4 transition-colors"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                }}
              >
                <div className="mb-2 inline-flex rounded-lg p-2" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-purple) 14%, transparent)' }}>
                  <Mail size={16} style={{ color: 'var(--accent-purple)' }} />
                </div>
                <p className="text-xs uppercase tracking-[0.15em]" style={{ color: 'var(--text-tertiary)' }}>
                  Direct Email
                </p>
                <p className="mt-1 truncate text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {email}
                </p>
              </motion.a>
            )}

            {hasResume && (
              <motion.a
                href={resumeHref}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ y: -3 }}
                className="block rounded-2xl border p-4 transition-colors"
                style={{
                  borderColor: 'color-mix(in srgb, var(--border-secondary) 72%, transparent)',
                  backgroundColor: 'color-mix(in srgb, var(--bg-elevated) 82%, transparent)',
                }}
              >
                <div className="mb-2 inline-flex rounded-lg p-2" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-orange) 14%, transparent)' }}>
                  <Download size={16} style={{ color: 'var(--accent-orange)' }} />
                </div>
                <p className="text-xs uppercase tracking-[0.15em]" style={{ color: 'var(--text-tertiary)' }}>
                  Resume
                </p>
                <p className="mt-1 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  Open Latest CV
                </p>
              </motion.a>
            )}

          </div>
        </section>
      </div>
    </motion.div>
  );
}
