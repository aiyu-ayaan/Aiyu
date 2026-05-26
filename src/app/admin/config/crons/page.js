'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    Clock,
    Plus,
    Play,
    Eye,
    Edit2,
    Trash2,
    CheckCircle2,
    XCircle,
    Activity,
    Info,
    RefreshCw,
    AlertTriangle,
    X,
    Check,
    ToggleLeft,
    ToggleRight,
    Globe,
    Terminal
} from 'lucide-react';

export default function CronJobsPage() {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState(null);

    // Form Modal State
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingJob, setEditingJob] = useState(null); // null for create
    const [formName, setFormName] = useState('');
    const [formSchedule, setFormSchedule] = useState('0 0 * * *');
    const [formWebhookUrl, setFormWebhookUrl] = useState('');
    const [formWebhookMethod, setFormWebhookMethod] = useState('POST');
    const [formSubmitting, setFormSubmitting] = useState(false);

    // Logs Modal State
    const [selectedJobForLogs, setSelectedJobForLogs] = useState(null);
    const [showLogsModal, setShowLogsModal] = useState(false);

    // Manual run loading state
    const [runningJobId, setRunningJobId] = useState(null);

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const fetchJobs = async (showLoader = false) => {
        if (showLoader) setLoading(true);
        else setRefreshing(true);
        try {
            const res = await fetch('/api/admin/crons');
            const data = await res.json();
            if (data.success) {
                setJobs(data.data || []);
            } else {
                showMessage('error', data.error || 'Failed to fetch cron tasks.');
            }
        } catch (error) {
            showMessage('error', 'Network error. Failed to retrieve scheduler state.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchJobs(true);
    }, []);

    const handleToggle = async (job) => {
        try {
            const res = await fetch(`/api/admin/crons/${job._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !job.enabled })
            });
            const data = await res.json();
            if (data.success) {
                setJobs(jobs.map(j => j._id === job._id ? data.data : j));
                showMessage('success', `${job.name} scheduler status updated.`);
            } else {
                showMessage('error', data.error || 'Failed to toggle cron task.');
            }
        } catch (error) {
            showMessage('error', 'Connection error. Status change failed.');
        }
    };

    const handleRunNow = async (job) => {
        setRunningJobId(job._id);
        showMessage('info', `Manual execution triggered for: ${job.name}...`);
        try {
            const res = await fetch(`/api/admin/crons/${job._id}/run`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                setJobs(jobs.map(j => j._id === job._id ? data.data : j));
                showMessage('success', `${job.name} executed successfully.`);
                // If logs are open for this job, refresh them!
                if (selectedJobForLogs && selectedJobForLogs._id === job._id) {
                    setSelectedJobForLogs(data.data);
                }
            } else {
                showMessage('error', data.error || 'Manual trigger failed.');
            }
        } catch (error) {
            showMessage('error', 'Execution trigger hit a connection error.');
        } finally {
            setRunningJobId(null);
        }
    };

    const handleDelete = async (job) => {
        if (!confirm(`Are you sure you want to permanently delete custom task: ${job.name}?`)) return;

        try {
            const res = await fetch(`/api/admin/crons/${job._id}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setJobs(jobs.filter(j => j._id !== job._id));
                showMessage('success', 'Custom cron task deleted.');
            } else {
                showMessage('error', data.error || 'Deletion failed.');
            }
        } catch (error) {
            showMessage('error', 'Connection error. Task deletion aborted.');
        }
    };

    const openCreateModal = () => {
        setEditingJob(null);
        setFormName('');
        setFormSchedule('0 0 * * *');
        setFormWebhookUrl('https://');
        setFormWebhookMethod('POST');
        setShowFormModal(true);
    };

    const openEditModal = (job) => {
        setEditingJob(job);
        setFormName(job.name);
        setFormSchedule(job.schedule);
        setFormWebhookUrl(job.webhookUrl || 'https://');
        setFormWebhookMethod(job.webhookMethod || 'POST');
        setShowFormModal(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormSubmitting(true);

        const payload = {
            name: formName,
            schedule: formSchedule,
            webhookUrl: formWebhookUrl,
            webhookMethod: formWebhookMethod
        };

        const url = editingJob ? `/api/admin/crons/${editingJob._id}` : '/api/admin/crons';
        const method = editingJob ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (data.success) {
                showMessage('success', editingJob ? 'Task schedule updated.' : 'Custom webhook task created successfully.');
                setShowFormModal(false);
                fetchJobs(false);
            } else {
                alert(data.error || 'Submission failed.');
            }
        } catch (error) {
            showMessage('error', 'Submit failed due to a communication issue.');
        } finally {
            setFormSubmitting(false);
        }
    };

    const systemJobs = jobs.filter(j => j.type === 'system');
    const userJobs = jobs.filter(j => j.type === 'user');
    const activeCount = jobs.filter(j => j.enabled).length;

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen text-slate-200">
            {/* Header */}
            <div className="mb-12">
                <Link href="/admin" className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 transition-colors mb-4 text-sm font-mono opacity-60 hover:opacity-100">
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex items-start md:items-center justify-between flex-col md:flex-row gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-400">
                            <Clock className="w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1 tracking-tight">System Task Scheduler</h1>
                            <p className="text-slate-400">Configure background cron protocols, clean legacy data, and orchestrate webhooks.</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => fetchJobs(false)}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-white disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            Refresh Tasks
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition shadow-lg shadow-emerald-950/20 hover:shadow-emerald-950/40"
                        >
                            <Plus size={16} />
                            Create Task
                        </button>
                    </div>
                </div>
            </div>

            {/* Notification Banner */}
            {message && (
                <div className={`mb-8 rounded-2xl border px-4 py-3 text-sm flex items-center gap-2 ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' : message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300'}`}>
                    <Info size={16} className="shrink-0" />
                    <span>{message.text}</span>
                </div>
            )}

            {/* Status Statistics */}
            <div className="grid gap-6 md:grid-cols-3 mb-10">
                <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl">
                    <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-white/5 p-3 text-emerald-400">
                        <CheckCircle2 size={18} />
                    </div>
                    <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400">Active Tasks</h3>
                    <p className="mt-2 text-2xl font-bold text-emerald-300">{activeCount} / {jobs.length} enabled</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl">
                    <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-white/5 p-3 text-cyan-400">
                        <Activity size={18} />
                    </div>
                    <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400">Engine State</h3>
                    <p className="mt-2 text-2xl font-bold text-cyan-300">Ticking (60s loop)</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 backdrop-blur-xl">
                    <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-white/5 p-3 text-pink-400">
                        <Clock size={18} />
                    </div>
                    <h3 className="text-xs font-mono uppercase tracking-widest text-slate-400">Webhooks Registered</h3>
                    <p className="mt-2 text-2xl font-bold text-pink-300">{userJobs.length} custom integrations</p>
                </div>
            </div>

            {loading ? (
                <div className="flex min-h-[30vh] items-center justify-center">
                    <div className="text-sm font-mono uppercase tracking-[0.24em] text-cyan-300 flex items-center gap-3">
                        <RefreshCw className="animate-spin" size={18} /> Loading scheduler catalog...
                    </div>
                </div>
            ) : (
                <div className="space-y-12">
                    {/* System Defined Column */}
                    <section>
                        <h2 className="text-sm font-mono text-cyan-400 mb-6 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-cyan-500 rounded-full" />
                            System Defined Tasks
                            <span className="text-xs text-slate-500 font-normal">({systemJobs.length} tasks)</span>
                        </h2>

                        <div className="grid gap-6 lg:grid-cols-2">
                            {systemJobs.map((job) => (
                                <div key={job._id} className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 p-6 flex flex-col justify-between backdrop-blur-md group hover:border-cyan-500/20 transition">
                                    {/* Glass gradient */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-[60px] pointer-events-none" />

                                    <div>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition">{job.name}</h3>
                                                <span className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 uppercase tracking-wide">
                                                    SYSTEM_TASK
                                                </span>
                                            </div>

                                            {/* Toggle Switch */}
                                            <button
                                                onClick={() => handleToggle(job)}
                                                className={`text-slate-400 hover:text-white transition-all transform duration-300 shrink-0`}
                                                title={job.enabled ? 'Click to disable' : 'Click to enable'}
                                            >
                                                {job.enabled ? (
                                                    <ToggleRight className="w-9 h-9 text-emerald-400" />
                                                ) : (
                                                    <ToggleLeft className="w-9 h-9 text-slate-600" />
                                                )}
                                            </button>
                                        </div>

                                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                                            {job.action === 'clean_unreferenced'
                                                ? 'Audits all files in the uploads folder, finds files not referenced by any database collections, and purges them to reclaim storage.'
                                                : 'Scans public uploads directory for legacy files (.png, .jpg), optimizes them to WebP, replaces all references, and purges originals.'}
                                        </p>

                                        {/* Status Meta */}
                                        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs font-mono">
                                            <div>
                                                <span className="text-slate-500 block">Cron Interval</span>
                                                <span className="text-slate-300">{job.schedule}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block">Next Run</span>
                                                <span className="text-cyan-300 truncate block" title={job.nextRun ? new Date(job.nextRun).toLocaleString() : 'Disabled'}>
                                                    {job.nextRun ? new Date(job.nextRun).toLocaleString() : 'Disabled'}
                                                </span>
                                            </div>
                                            <div className="col-span-2 flex items-center gap-2 mt-1">
                                                <span className="text-slate-500">Last Status:</span>
                                                {job.lastRun ? (
                                                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider ${job.lastRunStatus === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {job.lastRunStatus === 'success' ? (
                                                            <>
                                                                <CheckCircle2 size={12} /> Success
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle size={12} /> Failure
                                                            </>
                                                        )}
                                                        <span className="text-slate-500 text-[9px] font-normal normal-case font-mono">
                                                            ({new Date(job.lastRun).toLocaleString()})
                                                        </span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 italic">Never executed</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-6 flex justify-end gap-2.5 border-t border-white/5 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedJobForLogs(job);
                                                setShowLogsModal(true);
                                            }}
                                            disabled={!job.lastRun}
                                            className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <Eye size={12} />
                                            View Logs
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => openEditModal(job)}
                                            className="px-3.5 py-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-400 hover:text-cyan-300 transition-all text-xs font-semibold flex items-center gap-1.5"
                                        >
                                            <Edit2 size={12} />
                                            Interval
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRunNow(job)}
                                            disabled={runningJobId === job._id}
                                            className="px-4 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                                        >
                                            {runningJobId === job._id ? (
                                                <RefreshCw size={12} className="animate-spin" />
                                            ) : (
                                                <Play size={12} className="fill-current" />
                                            )}
                                            Run_Now
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* User Defined Column */}
                    <section>
                        <h2 className="text-sm font-mono text-cyan-400 mb-6 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-pink-500 rounded-full" />
                            User Defined Webhooks
                            <span className="text-xs text-slate-500 font-normal">({userJobs.length} tasks)</span>
                        </h2>

                        {userJobs.length === 0 ? (
                            <div className="rounded-3xl border border-white/5 bg-slate-900/10 p-12 text-center backdrop-blur-md">
                                <div className="mx-auto mb-4 inline-flex rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-500">
                                    <Globe size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">No custom tasks registered</h3>
                                <p className="text-slate-400 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                                    Register your own task hooks. When they fire on schedule, the system will trigger an HTTP request to your specified endpoint.
                                </p>
                                <button
                                    onClick={openCreateModal}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition"
                                >
                                    Register Webhook Task
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-6 lg:grid-cols-2">
                                {userJobs.map((job) => (
                                    <div key={job._id} className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 p-6 flex flex-col justify-between backdrop-blur-md group hover:border-pink-500/20 transition">
                                        {/* Glass gradient */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/5 rounded-full blur-[60px] pointer-events-none" />

                                        <div>
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h3 className="text-lg font-bold text-white group-hover:text-pink-300 transition">{job.name}</h3>
                                                    <span className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-pink-500/10 border border-pink-500/20 text-pink-300 uppercase tracking-wide">
                                                        WEBHOOK_TASK
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={() => handleToggle(job)}
                                                    className="text-slate-400 hover:text-white transition shrink-0"
                                                    title={job.enabled ? 'Click to disable' : 'Click to enable'}
                                                >
                                                    {job.enabled ? (
                                                        <ToggleRight className="w-9 h-9 text-emerald-400" />
                                                    ) : (
                                                        <ToggleLeft className="w-9 h-9 text-slate-600" />
                                                    )}
                                                </button>
                                            </div>

                                            <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3.5 text-xs text-slate-400 font-mono space-y-1 mt-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-500">Method:</span>
                                                    <span className="font-bold text-pink-400">{job.webhookMethod || 'POST'}</span>
                                                </div>
                                                <div className="flex items-start gap-2 overflow-hidden">
                                                    <span className="text-slate-500 shrink-0">Target URL:</span>
                                                    <span className="text-slate-300 truncate flex-1 hover:text-white" title={job.webhookUrl}>
                                                        {job.webhookUrl}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status Meta */}
                                            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs font-mono">
                                                <div>
                                                    <span className="text-slate-500 block">Cron Interval</span>
                                                    <span className="text-slate-300">{job.schedule}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block">Next Run</span>
                                                    <span className="text-pink-300 truncate block" title={job.nextRun ? new Date(job.nextRun).toLocaleString() : 'Disabled'}>
                                                        {job.nextRun ? new Date(job.nextRun).toLocaleString() : 'Disabled'}
                                                    </span>
                                                </div>
                                                <div className="col-span-2 flex items-center gap-2 mt-1">
                                                    <span className="text-slate-500">Last Status:</span>
                                                    {job.lastRun ? (
                                                        <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider ${job.lastRunStatus === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                            {job.lastRunStatus === 'success' ? (
                                                                <>
                                                                    <CheckCircle2 size={12} /> Success
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <XCircle size={12} /> Failure
                                                                </>
                                                            )}
                                                            <span className="text-slate-500 text-[9px] font-normal normal-case font-mono">
                                                                ({new Date(job.lastRun).toLocaleString()})
                                                            </span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 italic">Never executed</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="mt-6 flex justify-between items-center border-t border-white/5 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(job)}
                                                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                                title="Delete Custom Task"
                                            >
                                                <Trash2 size={15} />
                                            </button>

                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedJobForLogs(job);
                                                        setShowLogsModal(true);
                                                    }}
                                                    disabled={!job.lastRun}
                                                    className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 disabled:opacity-30"
                                                >
                                                    <Eye size={12} />
                                                    Logs
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(job)}
                                                    className="px-3.5 py-1.5 rounded-lg border border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10 text-pink-400 hover:text-pink-300 transition-all text-xs font-semibold flex items-center gap-1.5"
                                                >
                                                    <Edit2 size={12} />
                                                    Edit
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRunNow(job)}
                                                    disabled={runningJobId === job._id}
                                                    className="px-4 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                                                >
                                                    {runningJobId === job._id ? (
                                                        <RefreshCw size={12} className="animate-spin" />
                                                    ) : (
                                                        <Play size={12} className="fill-current" />
                                                    )}
                                                    Trigger
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {/* CREATE / EDIT DIALOG MODAL */}
            {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                            <h3 className="text-xl font-bold text-white">
                                {editingJob ? `Modify Task: ${editingJob.name}` : 'Register Custom Webhook Task'}
                            </h3>
                            <button
                                onClick={() => setShowFormModal(false)}
                                className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
                            {/* Name (User defined only) */}
                            {(!editingJob || editingJob.type === 'user') ? (
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Task Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formName}
                                        onChange={(e) => setFormName(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition"
                                        placeholder="e.g. Daily Analytics Report"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Task Name</label>
                                    <div className="bg-slate-950/50 border border-white/5 rounded-xl px-4 py-2.5 text-sm text-slate-400 font-semibold select-none">
                                        {formName} (System Job)
                                    </div>
                                </div>
                            )}

                            {/* Schedule expression */}
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Cron Expression (5 Fields)</label>
                                <input
                                    type="text"
                                    required
                                    value={formSchedule}
                                    onChange={(e) => setFormSchedule(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 font-mono outline-none transition"
                                    placeholder="* * * * *"
                                />
                                {/* Helpers */}
                                <div className="mt-2 p-3 bg-slate-950/40 rounded-xl border border-white/5 text-[11px] text-slate-500 font-mono space-y-1">
                                    <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Common Presets:</div>
                                    <div>• Every 5 minutes: <button type="button" onClick={() => setFormSchedule('*/5 * * * *')} className="text-cyan-400 hover:underline">*/5 * * * *</button></div>
                                    <div>• Every hour: <button type="button" onClick={() => setFormSchedule('0 * * * *')} className="text-cyan-400 hover:underline">0 * * * *</button></div>
                                    <div>• Daily at midnight: <button type="button" onClick={() => setFormSchedule('0 0 * * *')} className="text-cyan-400 hover:underline">0 0 * * *</button></div>
                                    <div>• Weekly on Sunday: <button type="button" onClick={() => setFormSchedule('0 0 * * 0')} className="text-cyan-400 hover:underline">0 0 * * 0</button></div>
                                </div>
                            </div>

                            {/* Webhook Settings (User defined only) */}
                            {(!editingJob || editingJob.type === 'user') && (
                                <div className="space-y-4 border-t border-white/5 pt-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Webhook URL</label>
                                        <input
                                            type="url"
                                            required
                                            value={formWebhookUrl}
                                            onChange={(e) => setFormWebhookUrl(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition"
                                            placeholder="https://example.com/api/tasks"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">HTTP Method</label>
                                        <select
                                            value={formWebhookMethod}
                                            onChange={(e) => setFormWebhookMethod(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition"
                                        >
                                            <option value="POST">POST (Recommended - Sends Trigger Metadata)</option>
                                            <option value="GET">GET (Simple Ping Request)</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowFormModal(false)}
                                    disabled={formSubmitting}
                                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formSubmitting}
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
                                >
                                    {formSubmitting ? 'Saving changes...' : 'Save Task Schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* LOGS DETAILS DIALOG MODAL */}
            {showLogsModal && selectedJobForLogs && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4 shrink-0">
                            <div className="flex items-center gap-2">
                                <Terminal size={18} className="text-cyan-400" />
                                <h3 className="text-lg font-bold text-white">
                                    Execution Log: {selectedJobForLogs.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setShowLogsModal(false);
                                    setSelectedJobForLogs(null);
                                }}
                                className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Meta info block */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/40 border border-white/5 rounded-2xl p-4 text-xs font-mono mb-4 shrink-0">
                            <div>
                                <span className="text-slate-500 block">Trigger Method</span>
                                <span className="text-slate-300 font-bold uppercase">{selectedJobForLogs.action === 'webhook' ? 'Webhook (HTTP)' : 'System Native'}</span>
                            </div>
                            <div>
                                <span className="text-slate-500 block">Last Run Status</span>
                                <span className={`font-bold uppercase tracking-wider ${selectedJobForLogs.lastRunStatus === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {selectedJobForLogs.lastRunStatus || 'Unknown'}
                                </span>
                            </div>
                            <div className="col-span-2">
                                <span className="text-slate-500 block">Execution Timestamp</span>
                                <span className="text-slate-300">
                                    {selectedJobForLogs.lastRun ? new Date(selectedJobForLogs.lastRun).toLocaleString() : 'Never'}
                                </span>
                            </div>
                        </div>

                        {/* Log Text Box */}
                        <div className="flex-1 overflow-y-auto min-h-0 rounded-2xl border border-white/10 bg-slate-950/90 p-4 font-mono text-xs text-cyan-300 select-all custom-scrollbar leading-relaxed whitespace-pre-wrap text-left">
                            {selectedJobForLogs.lastRunLog || 'No log records found for this task yet.'}
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-4 shrink-0">
                            <button
                                type="button"
                                onClick={() => handleRunNow(selectedJobForLogs)}
                                disabled={runningJobId === selectedJobForLogs._id}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {runningJobId === selectedJobForLogs._id ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                    <Play size={12} className="fill-current" />
                                )}
                                Run Now
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowLogsModal(false);
                                    setSelectedJobForLogs(null);
                                }}
                                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:text-white"
                            >
                                Close Logs
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
