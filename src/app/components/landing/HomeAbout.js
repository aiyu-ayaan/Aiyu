"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { professionalSummary } from '../../data/aboutData';
import ScrollReveal from '../shared/ScrollReveal';

const HomeAbout = () => {
  return (
    <div className="bg-gray-900 text-white p-4 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <ScrollReveal direction="up" delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
            <motion.div
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.3 }}
              className="glass-card glass-card-hover p-6 rounded-lg shadow-medium"
            >
              <h2 className="text-2xl font-bold mb-4 text-cyan-400 neon-glow">Summary</h2>
              <p className="text-gray-300 leading-relaxed">
                {professionalSummary}
              </p>
            </motion.div>
          </div>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={0.3}>
          <div className="text-center mt-8">
            <Link href="/about-me" legacyBehavior>
              <motion.a 
                className="inline-block text-cyan-400 hover:text-cyan-300 font-semibold px-6 py-3 border-2 border-cyan-400 rounded-lg hover:bg-cyan-400 hover:text-gray-900 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Show More →
              </motion.a>
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default HomeAbout;