'use client';
import { MapPin, Activity, Download, Mail } from 'lucide-react';
import ContactForm from '@/app/components/contact/ContactForm';
import { motion } from 'framer-motion';

export default function ContactPageClient({ location, status, email, hasResume, resumeHref }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen py-20 px-4 md:px-8 bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300"
        >
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mb-12"
                >
                    <h1 className="text-4xl md:text-6xl font-bold mb-4 tracking-tight">Let's Talk.</h1>
                    <p className="text-xl text-[var(--text-secondary)] max-w-2xl">
                        Have a project in mind or just want to explore new possibilities?
                        I'm always open to discussing new ideas and opportunities.
                    </p>
                </motion.div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 grid-rows-[auto]">

                    {/* 1. Contact Form - Large Block */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="md:col-span-2 md:row-span-2 bg-gray-50 dark:bg-[var(--bg-secondary)] rounded-3xl p-6 md:p-8 border border-gray-200 dark:border-[var(--border-primary)] hover:border-purple-300 dark:hover:border-[var(--accent-purple)] transition-all shadow-sm group"
                    >
                        <div className="h-full flex flex-col">
                            <h2 className="text-2xl font-bold mb-6">Send a Message</h2>
                            <ContactForm />
                        </div>
                    </motion.div>

                    {/* 2. Status Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="md:col-span-1 bg-green-50 dark:bg-green-900/10 rounded-3xl p-6 flex flex-col justify-between border border-green-100 dark:border-green-800/30"
                    >
                        <Activity className="w-10 h-10 text-green-500 mb-4" />
                        <div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Current Status</p>
                            <p className="text-xl font-bold text-green-700 dark:text-green-300">{status}</p>
                        </div>
                    </motion.div>

                    {/* 3. Location Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="md:col-span-1 bg-blue-50 dark:bg-blue-900/10 rounded-3xl p-6 flex flex-col justify-between border border-blue-100 dark:border-blue-800/30"
                    >
                        <MapPin className="w-10 h-10 text-blue-500 mb-4" />
                        <div>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Based in</p>
                            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{location}</p>
                        </div>
                    </motion.div>

                    {/* 4. Email Me - Dynamic */}
                    {email && (
                        <motion.a
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                            href={`mailto:${email}`}
                            className="md:col-span-1 bg-purple-50 dark:bg-purple-900/10 rounded-3xl p-6 flex flex-col justify-between border border-purple-100 dark:border-purple-800/30 hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors cursor-pointer"
                        >
                            <Mail className="w-10 h-10 text-purple-600 dark:text-purple-500 mb-4" />
                            <div>
                                <p className="text-sm font-medium text-purple-700 dark:text-purple-500 mb-1">Email Me</p>
                                <p className="text-xl font-bold text-purple-800 dark:text-purple-400 truncate" title={email}>{email}</p>
                            </div>
                        </motion.a>
                    )}

                    {/* 5. Resume Download */}
                    {hasResume && (
                        <motion.a
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.7 }}
                            href={resumeHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="md:col-span-1 bg-yellow-50 dark:bg-yellow-900/10 rounded-3xl p-6 flex flex-col justify-between border border-yellow-100 dark:border-yellow-800/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-colors cursor-pointer"
                        >
                            <Download className="w-10 h-10 text-yellow-600 dark:text-yellow-500 mb-4" />
                            <div>
                                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-500 mb-1">Resume</p>
                                <p className="text-xl font-bold text-yellow-800 dark:text-yellow-400">Download CV</p>
                            </div>
                        </motion.a>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
