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
      className="bg-gray-900 text-white p-4 lg:p-8"
    >
      <div className="max-w-6xl mx-auto">


        <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="bg-gray-900 p-6 rounded-lg"
          >
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">Summary</h2>
            <p className="text-gray-300">
              {professionalSummary}
            </p>
          </motion.div>
        </div>
        <div className="text-center mt-8">
          <Link href="/about-me" legacyBehavior>
            <a className="text-cyan-400 hover:underline">Show More</a>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

export default HomeAbout;