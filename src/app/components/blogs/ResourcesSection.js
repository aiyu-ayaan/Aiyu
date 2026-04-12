"use client";

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import LinkPreview from './LinkPreview';

const ResourcesSection = memo(function ResourcesSection({ links = [] }) {
  // Memoize links to prevent unnecessary re-renders
  const memoizedLinks = useMemo(() => {
    return Array.isArray(links) ? links : [];
  }, [links]);

  if (!memoizedLinks || memoizedLinks.length === 0) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.2 }}
      className="mt-8 rounded-2xl border p-5 sm:p-6"
      style={{
        borderColor: 'color-mix(in srgb, var(--border-secondary) 74%, transparent)',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--bg-surface) 94%, transparent), color-mix(in srgb, var(--bg-secondary) 94%, transparent))',
        contentVisibility: 'auto',
        containIntrinsicSize: '1px 540px',
      }}
    >
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="mb-5 text-2xl font-bold"
        style={{ color: 'var(--text-primary)' }}
      >
        Resources & Links
      </motion.h2>
      
      <div className="grid grid-cols-1 gap-4">
        {memoizedLinks.map((link, index) => (
          <motion.div
            key={link}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.3,
              delay: 0.3 + index * 0.05,
              ease: 'easeOut',
            }}
            style={{ contain: 'layout style paint' }}
          >
            <LinkPreview url={link} />
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
});

export default ResourcesSection;
