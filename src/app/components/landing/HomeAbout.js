"use client";
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { professionalSummary } from '../../data/aboutData';

const HomeAbout = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="bg-gray-900 text-white p-4 lg:p-8"
    >
      <div className="max-w-6xl mx-auto">


        <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="bg-gray-800 p-6 rounded-lg shadow-xl hover:shadow-2xl transition-shadow duration-300 border border-gray-700 hover:border-cyan-500"
          >
            <motion.h2 
              initial={{ opacity: 0, y: -20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-2xl font-bold mb-4 text-cyan-400"
            >
              Summary
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-gray-300 leading-relaxed"
            >
              {professionalSummary}
            </motion.p>
          </motion.div>
        </div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="text-center mt-8"
        >
          <Link href="/about-me" legacyBehavior>
            <a className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors duration-300 text-lg font-semibold">
              Show More →
            </a>
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default HomeAbout;