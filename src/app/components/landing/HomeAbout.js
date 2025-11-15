"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { professionalSummary } from '../../data/aboutData';

const HomeAbout = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="bg-gray-900 text-white p-4 lg:p-8 relative"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
          <motion.div
            className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl shadow-2xl border border-gray-700 hover:border-cyan-500 transition-all duration-300"
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <h2 className="text-3xl font-bold mb-6 text-cyan-400 flex items-center gap-3">
              <span className="text-orange-500">{"</>"}</span>
              Summary
            </h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              {professionalSummary}
            </p>
          </motion.div>
        </div>
        <div className="text-center mt-8">
          <Link href="/about-me" legacyBehavior>
            <motion.a 
              className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-semibold text-lg group"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Full Resume
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                →
              </motion.span>
            </motion.a>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default HomeAbout;