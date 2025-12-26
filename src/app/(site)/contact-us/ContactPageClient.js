'use client';
import { MapPin, Activity, Download, Mail } from 'lucide-react';
import ContactForm from '@/app/components/contact/ContactForm';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';

export default function ContactPageClient({ location, status, email, hasResume, resumeHref }) {
    const { theme } = useTheme();
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="min-h-screen py-20 px-4 md:px-8 bg-transparent text-[var(--text-primary)] transition-colors duration-300"
        >
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mb-12"
                >
                    <h1
                        className="text-4xl md:text-6xl font-bold mb-4 tracking-tight bg-gradient-to-r bg-clip-text text-transparent"
                        style={{
                            backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))'
                        }}
                    >
                        Let&apos;s Talk.
                    </h1>
                    <p className="text-xl text-[var(--text-secondary)] max-w-2xl">
                        Have a project in mind or just want to explore new possibilities?
                        I&apos;m always open to discussing new ideas and opportunities.
                    </p>
                </motion.div>

                {/* Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 grid-rows-[auto]">

                    {/* 1. Contact Form - Large Block */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="md:col-span-2 md:row-span-2 rounded-3xl p-6 md:p-8 border transition-all shadow-sm group backdrop-blur-md"

                        style={{
                            backgroundColor: theme === 'dark' ? 'rgba(20, 20, 30, 0.4)' : 'rgba(255, 255, 255, 0.6)',
                            borderColor: theme === 'dark' ? 'var(--border-secondary)' : 'rgba(255, 255, 255, 0.8)',
                            boxShadow: theme === 'dark' ? '0 8px 32px 0 rgba(0, 0, 0, 0.37)' : '0 8px 32px 0 rgba(31, 38, 135, 0.15)'
                        }}
                    >
                        <div className="h-full flex flex-col">
                            <h2
                                className="text-2xl font-bold mb-6 bg-gradient-to-r bg-clip-text text-transparent w-fit"
                                style={{
                                    backgroundImage: 'linear-gradient(to right, var(--accent-cyan), var(--accent-purple))'
                                }}
                            >
                                Send a Message
                            </h2>
                            <ContactForm />
                        </div>
                    </motion.div>

                    {/* 2. Status Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.5, delay: 0.4 }}
                        className="md:col-span-1 rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300 backdrop-blur-sm shadow-sm hover:shadow-green-500/20 group"
                        style={{
                            background: theme === 'dark'
                                ? 'linear-gradient(145deg, rgba(20, 80, 40, 0.2), rgba(10, 40, 20, 0.4))'
                                : 'linear-gradient(145deg, rgba(220, 252, 231, 0.6), rgba(240, 253, 244, 0.8))',
                            borderColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.4)',
                        }}
                    >
                        <div className="p-3 bg-green-500/10 rounded-2xl w-fit mb-4 group-hover:bg-green-500/20 transition-colors">
                            <Activity className="w-8 h-8 text-green-500 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-green-500/80 mb-2 uppercase tracking-wider">Current Status</p>
                            <p className="text-lg font-bold text-green-500">{status}</p>
                        </div>
                    </motion.div>

                    {/* 3. Location Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="md:col-span-1 rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300 backdrop-blur-sm shadow-sm hover:shadow-blue-500/20 group"
                        style={{
                            background: theme === 'dark'
                                ? 'linear-gradient(145deg, rgba(30, 64, 175, 0.2), rgba(15, 30, 90, 0.4))'
                                : 'linear-gradient(145deg, rgba(219, 234, 254, 0.6), rgba(239, 246, 255, 0.8))',
                            borderColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.4)',
                        }}
                    >
                        <div className="p-3 bg-blue-500/10 rounded-2xl w-fit mb-4 group-hover:bg-blue-500/20 transition-colors">
                            <MapPin className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-blue-500/80 mb-2 uppercase tracking-wider">Based in</p>
                            <p className="text-lg font-bold text-blue-500">{location}</p>
                        </div>
                    </motion.div>

                    {/* 4. Email Me - Dynamic */}
                    {email && (
                        <motion.a
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.5, delay: 0.6 }}
                            href={`mailto:${email}`}
                            className="md:col-span-1 rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300 backdrop-blur-sm shadow-sm hover:shadow-purple-500/20 group cursor-pointer"
                            style={{
                                background: theme === 'dark'
                                    ? 'linear-gradient(145deg, rgba(107, 33, 168, 0.2), rgba(50, 15, 80, 0.4))'
                                    : 'linear-gradient(145deg, rgba(243, 232, 255, 0.6), rgba(250, 245, 255, 0.8))',
                                borderColor: theme === 'dark' ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.4)',
                            }}
                        >
                            <div className="p-3 bg-purple-500/10 rounded-2xl w-fit mb-4 group-hover:bg-purple-500/20 transition-colors">
                                <Mail className="w-8 h-8 text-purple-500 group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-purple-500/80 mb-2 uppercase tracking-wider">Email Me</p>
                                <p className="text-lg font-bold text-purple-500 truncate" title={email}>{email}</p>
                            </div>
                        </motion.a>
                    )}

                    {/* 5. Resume Download */}
                    {hasResume && (
                        <motion.a
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.5, delay: 0.7 }}
                            href={resumeHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="md:col-span-1 rounded-3xl p-6 flex flex-col justify-between border transition-all duration-300 backdrop-blur-sm shadow-sm hover:shadow-yellow-500/20 group cursor-pointer"
                            style={{
                                background: theme === 'dark'
                                    ? 'linear-gradient(145deg, rgba(161, 98, 7, 0.2), rgba(80, 50, 5, 0.4))'
                                    : 'linear-gradient(145deg, rgba(254, 249, 195, 0.6), rgba(255, 253, 230, 0.8))',
                                borderColor: theme === 'dark' ? 'rgba(234, 179, 8, 0.3)' : 'rgba(234, 179, 8, 0.4)',
                            }}
                        >
                            <div className="p-3 bg-yellow-500/10 rounded-2xl w-fit mb-4 group-hover:bg-yellow-500/20 transition-colors">
                                <Download className="w-8 h-8 text-yellow-500 group-hover:scale-110 transition-transform duration-300" />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-yellow-500/80 mb-2 uppercase tracking-wider">Resume</p>
                                <p className="text-lg font-bold text-yellow-500">Download CV</p>
                            </div>
                        </motion.a>
                    )}
                </div>
            </div>
        </motion.div >
    );
}
