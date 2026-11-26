'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    FaArrowsRotate,
    FaEye,
    FaLock,
    FaPen,
    FaPlay,
    FaPlus,
    FaSpinner,
    FaTrashCan,
    FaXmark,
} from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, EmptyState, Field, Loading, PageHeader, Panel, Stat } from '@/app/components/admin/ui';
import '@/app/styles/admin-system.css';

// Blurb shown on each system task card, keyed by its `action`.
const SYSTEM_TASK_DESCRIPTIONS = {
    clean_unreferenced:
        'Audits all files in the uploads folder, finds files not referenced by any database collections, and purges them to reclaim storage.',
    migrate_webp:
        'Scans public uploads directory for legacy files (.png, .jpg), optimizes them to WebP, replaces all references, and purges originals.',
    uptime_check:
        'Pings every configured endpoint, records response status and latency for the uptime dashboard, and reports a failure when any endpoint is down.',
    prune_sessions:
        'Deletes expired and inactive admin sessions once they pass the retention window, keeping the session store small.',
    gdrive_backup:
        'Exports the full database and uploads it to the connected Google Drive account as a timestamped zip archive.',
    gdrive_purge:
        'Removes Google Drive backup archives older than the configured retention window so the Drive folder does not grow without bound.',
    github_project_sync:
        'Refreshes every project linked to a GitHub repository (stars, forks, last push, status, README). Repos with no changes since the last run cost one API call and no write; fields you edited by hand stay pinned.',
    archive_snapshot:
        'Submits the site base URL ($site) to the Internet Archive Save Page Now API, preserving a public snapshot. Requires IA_ACCESS_KEY and IA_SECRET_KEY in the environment.',
};

const TIMEZONES = [
    { value: 'UTC', label: 'UTC (GMT+00:00)' },
    { value: 'Asia/Kolkata', label: 'Kolkata (GMT+05:30)' },
    { value: 'Asia/Singapore', label: 'Singapore (GMT+08:00)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (GMT+09:00)' },
    { value: 'Asia/Dubai', label: 'Dubai (GMT+04:00)' },
    { value: 'Europe/London', label: 'London (GMT+00:00)' },
    { value: 'Europe/Paris', label: 'Paris (GMT+01:00)' },
    { value: 'Europe/Moscow', label: 'Moscow (GMT+03:00)' },
    { value: 'America/New_York', label: 'New York (GMT-05:00)' },
    { value: 'America/Chicago', label: 'Chicago (GMT-06:00)' },
    { value: 'America/Denver', label: 'Denver (GMT-07:00)' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (GMT-08:00)' },
    { value: 'Australia/Sydney', label: 'Sydney (GMT+10:00)' },
];

function cronToHuman(cronExpression) {
    if (!cronExpression) return '';
    const fields = cronExpression.trim().split(/\s+/);
    if (fields.length !== 5) return 'Invalid cron expression';

    const [min, hour, dom, month, dow] = fields;

    const formatTime = (h, m) => {
        const hh = parseInt(h, 10);
        const mm = parseInt(m, 10);
        const ampm = hh >= 12 ? 'PM' : 'AM';
        const displayHour = hh % 12 === 0 ? 12 : hh % 12;
        const displayMin = mm.toString().padStart(2, '0');
        return `${displayHour}:${displayMin} ${ampm}`;
    };

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    if (min.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
        const step = min.split('/')[1];
        return `Every ${step} minutes`;
    }

    if (min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
        return 'Every minute';
    }

    if (hour === '*' && dom === '*' && month === '*' && dow === '*') {
        if (min === '0') return 'Every hour on the hour';
        return `Every hour at minute ${min}`;
    }

    if (dom === '*' && month === '*' && dow === '*') {
        if (!isNaN(hour) && !isNaN(min)) {
            return `Daily at ${formatTime(hour, min)}`;
        }
    }

    if (dom === '*' && month === '*') {
        if (!isNaN(dow) && !isNaN(hour) && !isNaN(min)) {
            const dayNum = parseInt(dow, 10);
            const day = dayNames[dayNum] || 'Sunday';
            return `Weekly on ${day} at ${formatTime(hour, min)}`;
        }
    }

    if (month === '*' && dow === '*') {
        if (!isNaN(dom) && !isNaN(hour) && !isNaN(min)) {
            const domNum = parseInt(dom, 10);
            const suffix = (d) => {
                if (d > 3 && d < 21) return 'th';
                switch (d % 10) {
                    case 1:
                        return 'st';
                    case 2:
                        return 'nd';
                    case 3:
                        return 'rd';
                    default:
                        return 'th';
                }
            };
            return `Monthly on the ${domNum}${suffix(domNum)} at ${formatTime(hour, min)}`;
        }
    }

    return `Custom pattern (min: ${min}, hour: ${hour}, day: ${dom}, month: ${month}, weekday: ${dow})`;
}

function formatPreviewValue(value) {
    if (value === null || value === undefined || value === '') return '(empty)';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function hasDynamicTemplate(value) {
    if (Array.isArray(value)) {
        return value.some((item) => hasDynamicTemplate(item));
    }
    if (value && typeof value === 'object') {
        return Object.values(value).some((item) => hasDynamicTemplate(item));
    }
    return typeof value === 'string' && value.includes('$');
}

function resolveTemplateMode(savedType, value) {
    return savedType === 'expression' || hasDynamicTemplate(value) ? 'expression' : 'fixed';
}

export default function CronJobsPage() {
    const { confirm } = useAdminFeedback();
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState(null);

    // Form Modal State
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingJob, setEditingJob] = useState(null);
    const [formName, setFormName] = useState('');
    const [formSchedule, setFormSchedule] = useState('0 0 * * *');
    const [formWebhookUrl, setFormWebhookUrl] = useState('');
    const [formWebhookUrlType, setFormWebhookUrlType] = useState('fixed');
    const [urlPreviewOutput, setUrlPreviewOutput] = useState('');
    const [formWebhookMethod, setFormWebhookMethod] = useState('POST');
    const [formWebhookHeaders, setFormWebhookHeaders] = useState([]);
    const [formWebhookHeadersType, setFormWebhookHeadersType] = useState('fixed');
    const [headersPreviewOutput, setHeadersPreviewOutput] = useState('');
    const [headersPreviewRows, setHeadersPreviewRows] = useState([]);
    const [formWebhookBody, setFormWebhookBody] = useState('');
    const [formWebhookBodyType, setFormWebhookBodyType] = useState('fixed');
    const [formWebhookEnv, setFormWebhookEnv] = useState([]);
    const [previewOutput, setPreviewOutput] = useState('');
    const [previewLoading, setPreviewLoading] = useState(false);
    const [formSubmitting, setFormSubmitting] = useState(false);

    // Global Env Modal State
    const [globalEnvs, setGlobalEnvs] = useState([]);
    const [showGlobalEnvModal, setShowGlobalEnvModal] = useState(false);
    const [globalEnvSubmitting, setGlobalEnvSubmitting] = useState(false);

    // Notification Link States
    const [notificationConfigured, setNotificationConfigured] = useState(false);
    const [formNotificationEnabled, setFormNotificationEnabled] = useState(false);
    const [formNotificationOn, setFormNotificationOn] = useState('always');

    // Retry Mechanism States
    const [formRetryEnabled, setFormRetryEnabled] = useState(false);
    const [formRetryType, setFormRetryType] = useState('stable');
    const [formRetryCount, setFormRetryCount] = useState(3);
    const [formRetryDelay, setFormRetryDelay] = useState(60);

    // Visual Cron Builder States
    const [builderTab, setBuilderTab] = useState('simple');
    const [freqType, setFreqType] = useState('daily');
    const [freqValMinutes, setFreqValMinutes] = useState('15');
    const [freqValHour, setFreqValHour] = useState('2');
    const [freqValMinute, setFreqValMinute] = useState('0');
    const [freqValDow, setFreqValDow] = useState('0');
    const [freqValDom, setFreqValDom] = useState('1');

    const compileCronFromSimple = (type, valMin, hour, minute, dow, dom) => {
        switch (type) {
            case 'minutes':
                return `*/${valMin} * * * *`;
            case 'hourly':
                return `${minute} * * * *`;
            case 'daily':
                return `${minute} ${hour} * * *`;
            case 'weekly':
                return `${minute} ${hour} * * ${dow}`;
            case 'monthly':
                return `${minute} ${hour} ${dom} * *`;
            default:
                return '0 0 * * *';
        }
    };

    const parseCronToSimple = (cronStr) => {
        if (!cronStr)
            return {
                type: 'daily',
                minutes: '15',
                hour: '2',
                minute: '0',
                dow: '0',
                dom: '1',
                matchesSimple: true,
            };
        const fields = cronStr.trim().split(/\s+/);
        if (fields.length !== 5) {
            return {
                type: 'daily',
                minutes: '15',
                hour: '2',
                minute: '0',
                dow: '0',
                dom: '1',
                matchesSimple: false,
            };
        }

        const [min, hour, dom, month, dow] = fields;

        if (min.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
            const step = min.split('/')[1];
            return {
                type: 'minutes',
                minutes: step,
                hour: '2',
                minute: '0',
                dow: '0',
                dom: '1',
                matchesSimple: true,
            };
        }

        if (hour === '*' && dom === '*' && month === '*' && dow === '*') {
            return {
                type: 'hourly',
                minutes: '15',
                hour: '2',
                minute: min,
                dow: '0',
                dom: '1',
                matchesSimple: true,
            };
        }

        if (dom === '*' && month === '*' && dow === '*') {
            if (!isNaN(hour) && !isNaN(min)) {
                return {
                    type: 'daily',
                    minutes: '15',
                    hour,
                    minute: min,
                    dow: '0',
                    dom: '1',
                    matchesSimple: true,
                };
            }
        }

        if (dom === '*' && month === '*') {
            if (!isNaN(dow) && !isNaN(hour) && !isNaN(min)) {
                return {
                    type: 'weekly',
                    minutes: '15',
                    hour,
                    minute: min,
                    dow,
                    dom: '1',
                    matchesSimple: true,
                };
            }
        }

        if (month === '*' && dow === '*') {
            if (!isNaN(dom) && !isNaN(hour) && !isNaN(min)) {
                return {
                    type: 'monthly',
                    minutes: '15',
                    hour,
                    minute: min,
                    dow: '0',
                    dom,
                    matchesSimple: true,
                };
            }
        }

        return {
            type: 'daily',
            minutes: '15',
            hour: '2',
            minute: '0',
            dow: '0',
            dom: '1',
            matchesSimple: false,
        };
    };

    const handleSimpleChange = (field, value) => {
        let nextType = freqType;
        let nextMinutes = freqValMinutes;
        let nextHour = freqValHour;
        let nextMinute = freqValMinute;
        let nextDow = freqValDow;
        let nextDom = freqValDom;

        if (field === 'type') {
            nextType = value;
            setFreqType(value);
        } else if (field === 'minutes') {
            nextMinutes = value;
            setFreqValMinutes(value);
        } else if (field === 'hour') {
            nextHour = value;
            setFreqValHour(value);
        } else if (field === 'minute') {
            nextMinute = value;
            setFreqValMinute(value);
        } else if (field === 'dow') {
            nextDow = value;
            setFreqValDow(value);
        } else if (field === 'dom') {
            nextDom = value;
            setFreqValDom(value);
        }

        const compiled = compileCronFromSimple(
            nextType,
            nextMinutes,
            nextHour,
            nextMinute,
            nextDow,
            nextDom
        );
        setFormSchedule(compiled);
    };

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
        } catch {
            showMessage('error', 'Network error. Failed to retrieve scheduler state.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const fetchNotificationStatus = async () => {
        try {
            const res = await fetch('/api/admin/notifications');
            const data = await res.json();
            if (data.success && data.data) {
                const config = data.data;
                const isLinked =
                    config.enabled &&
                    ((config.ntfy?.enabled && config.ntfy?.topic) ||
                        (config.telegram?.enabled &&
                            config.telegram?.botToken &&
                            config.telegram?.chatId) ||
                        (config.discord?.enabled && config.discord?.webhookUrl));
                setNotificationConfigured(isLinked);
            }
        } catch (err) {
            console.error('Failed to retrieve notification status:', err);
        }
    };

    const fetchGlobalEnvs = async () => {
        try {
            const res = await fetch('/api/admin/crons/env');
            const data = await res.json();
            if (data.success) {
                setGlobalEnvs(data.data || []);
            }
        } catch (error) {
            console.error('Failed to retrieve global environment variables:', error);
        }
    };

    const openGlobalEnvModal = () => {
        fetchGlobalEnvs();
        setShowGlobalEnvModal(true);
    };

    const handleGlobalEnvSubmit = async (e) => {
        e.preventDefault();
        setGlobalEnvSubmitting(true);
        try {
            const res = await fetch('/api/admin/crons/env', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ env: globalEnvs.filter((ev) => ev.key && ev.key.trim()) }),
            });
            const data = await res.json();
            if (data.success) {
                setGlobalEnvs(data.data || []);
                showMessage('success', 'Global environment secrets updated.');
                setShowGlobalEnvModal(false);
            } else {
                showMessage('error', data.error || 'Failed to save global environment secrets.');
            }
        } catch {
            showMessage('error', 'Communication error while saving global secrets.');
        } finally {
            setGlobalEnvSubmitting(false);
        }
    };

    const [timezone, setTimezone] = useState('UTC');
    const [timezoneSaving, setTimezoneSaving] = useState(false);

    const fetchTimezone = async () => {
        try {
            const res = await fetch('/api/admin/crons/timezone');
            const data = await res.json();
            if (data.success && data.timezone) {
                setTimezone(data.timezone);
            }
        } catch (error) {
            console.error('Failed to fetch timezone:', error);
        }
    };

    const handleTimezoneChange = async (newTimezone) => {
        setTimezoneSaving(true);
        try {
            const res = await fetch('/api/admin/crons/timezone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ timezone: newTimezone }),
            });
            const data = await res.json();
            if (data.success) {
                setTimezone(data.timezone);
                showMessage(
                    'success',
                    `Scheduler timezone set to ${data.timezone}. Active job next runs recalculated.`
                );
                fetchJobs(false);
            } else {
                showMessage('error', data.error || 'Failed to update timezone.');
            }
        } catch {
            showMessage('error', 'Connection error. Timezone update failed.');
        } finally {
            setTimezoneSaving(false);
        }
    };

    useEffect(() => {
        fetchJobs(true);
        fetchNotificationStatus();
        fetchGlobalEnvs();
        fetchTimezone();
    }, []);

    const handleToggle = async (job) => {
        try {
            const res = await fetch(`/api/admin/crons/${job._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !job.enabled }),
            });
            const data = await res.json();
            if (data.success) {
                setJobs(jobs.map((j) => (j._id === job._id ? data.data : j)));
                showMessage('success', `${job.name} status updated.`);
            } else {
                showMessage('error', data.error || 'Failed to toggle cron task.');
            }
        } catch {
            showMessage('error', 'Connection error. Status change failed.');
        }
    };

    const handleRunNow = async (job) => {
        setRunningJobId(job._id);
        showMessage('info', `Running ${job.name}…`);
        try {
            const res = await fetch(`/api/admin/crons/${job._id}/run`, {
                method: 'POST',
            });
            const data = await res.json();
            if (data.success) {
                setJobs(jobs.map((j) => (j._id === job._id ? data.data : j)));
                showMessage('success', `${job.name} executed.`);
            } else {
                showMessage('error', data.error || 'Manual trigger failed.');
            }
        } catch {
            showMessage('error', 'Execution trigger hit a connection error.');
        } finally {
            setRunningJobId(null);
        }
    };

    const handleDelete = async (job) => {
        if (
            !(await confirm({
                title: 'Delete custom task?',
                message: `Are you sure you want to permanently delete custom task: ${job.name}?`,
                confirmText: 'Delete',
                danger: true,
            }))
        )
            return;

        try {
            const res = await fetch(`/api/admin/crons/${job._id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                setJobs(jobs.filter((j) => j._id !== job._id));
                showMessage('success', 'Custom cron task deleted.');
            } else {
                showMessage('error', data.error || 'Deletion failed.');
            }
        } catch {
            showMessage('error', 'Connection error. Task deletion aborted.');
        }
    };

    const openCreateModal = () => {
        setEditingJob(null);
        setFormName('');
        setFormSchedule('0 0 * * *');
        setFormWebhookUrl('https://');
        setFormWebhookUrlType('fixed');
        setUrlPreviewOutput('');
        setFormWebhookMethod('POST');
        setFormWebhookHeaders([]);
        setFormWebhookHeadersType('fixed');
        setFormWebhookEnv([]);
        setHeadersPreviewOutput('');
        setHeadersPreviewRows([]);
        setFormWebhookBody('');
        setFormWebhookBodyType('fixed');
        setPreviewOutput('');

        setBuilderTab('simple');
        setFreqType('daily');
        setFreqValHour('0');
        setFreqValMinute('0');

        setFormNotificationEnabled(false);
        setFormNotificationOn('always');

        setFormRetryEnabled(false);
        setFormRetryType('stable');
        setFormRetryCount(3);
        setFormRetryDelay(60);

        setShowFormModal(true);
    };

    const openEditModal = (job) => {
        setEditingJob(job);
        setFormName(job.name);
        setFormSchedule(job.schedule);
        setFormWebhookUrl(job.webhookUrl || 'https://');
        setFormWebhookUrlType(resolveTemplateMode(job.webhookUrlType, job.webhookUrl));
        setUrlPreviewOutput('');
        setFormWebhookMethod(job.webhookMethod || 'POST');
        setFormWebhookHeaders(job.webhookHeaders || []);
        setFormWebhookHeadersType(
            resolveTemplateMode(job.webhookHeadersType, job.webhookHeaders || [])
        );
        setFormWebhookEnv(job.webhookEnv || []);
        setHeadersPreviewOutput('');
        setHeadersPreviewRows([]);
        setFormWebhookBody(job.webhookBody || '');
        setFormWebhookBodyType(resolveTemplateMode(job.webhookBodyType, job.webhookBody || ''));
        setPreviewOutput('');

        const parsed = parseCronToSimple(job.schedule);
        setFreqType(parsed.type);
        setFreqValMinutes(parsed.minutes);
        setFreqValHour(parsed.hour);
        setFreqValMinute(parsed.minute);
        setFreqValDow(parsed.dow);
        setFreqValDom(parsed.dom);

        if (parsed.matchesSimple) {
            setBuilderTab('simple');
        } else {
            setBuilderTab('advanced');
        }

        setFormNotificationEnabled(job.notificationEnabled || false);
        setFormNotificationOn(job.notificationOn || 'always');

        setFormRetryEnabled(job.retryEnabled || false);
        setFormRetryType(job.retryType || 'stable');
        setFormRetryCount(job.retryCount ?? 3);
        setFormRetryDelay(job.retryDelay ?? 60);

        setShowFormModal(true);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setFormSubmitting(true);

        const payload = {
            name: formName,
            schedule: formSchedule,
            webhookUrl: formWebhookUrl,
            webhookUrlType: resolveTemplateMode(formWebhookUrlType, formWebhookUrl),
            webhookMethod: formWebhookMethod,
            webhookHeaders: formWebhookHeaders.filter((h) => h.key && h.key.trim()),
            webhookHeadersType: resolveTemplateMode(formWebhookHeadersType, formWebhookHeaders),
            webhookBody: formWebhookBody,
            webhookBodyType: resolveTemplateMode(formWebhookBodyType, formWebhookBody),
            webhookEnv: formWebhookEnv.filter((ev) => ev.key && ev.key.trim()),
            notificationEnabled: formNotificationEnabled,
            notificationOn: formNotificationOn,
            retryEnabled: formRetryEnabled,
            retryType: formRetryType,
            retryCount: formRetryCount,
            retryDelay: formRetryDelay,
        };

        const url = editingJob ? `/api/admin/crons/${editingJob._id}` : '/api/admin/crons';
        const method = editingJob ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();

            if (data.success) {
                showMessage(
                    'success',
                    editingJob ? 'Task schedule updated.' : 'Custom webhook task created.'
                );
                setShowFormModal(false);
                fetchJobs(false);
            } else {
                showMessage('error', data.error || 'Submission failed.');
            }
        } catch {
            showMessage('error', 'Submit failed due to a communication issue.');
        } finally {
            setFormSubmitting(false);
        }
    };

    // Debounced automatic template compiler for dynamic variables preview
    useEffect(() => {
        if (
            !showFormModal ||
            formWebhookBodyType !== 'expression' ||
            !formWebhookBody.trim() ||
            formWebhookMethod !== 'POST'
        ) {
            setPreviewOutput('');
            return;
        }

        const controller = new AbortController();
        const delayDebounceFn = setTimeout(async () => {
            setPreviewLoading(true);
            try {
                const res = await fetch('/api/admin/crons/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ template: formWebhookBody.trim() }),
                    signal: controller.signal,
                });
                const data = await res.json();
                if (data.success) {
                    setPreviewOutput(data.data);
                } else {
                    setPreviewOutput(`Evaluation error: ${data.error}`);
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                setPreviewOutput('Failed to evaluate dynamic preview.');
            } finally {
                if (!controller.signal.aborted) setPreviewLoading(false);
            }
        }, 600);

        return () => {
            clearTimeout(delayDebounceFn);
            controller.abort();
        };
    }, [formWebhookBody, formWebhookBodyType, formWebhookMethod, showFormModal]);

    const triggerPreviewUpdate = async () => {
        if (!formWebhookBody.trim()) return;
        setPreviewLoading(true);
        try {
            const res = await fetch('/api/admin/crons/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template: formWebhookBody.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                setPreviewOutput(data.data);
            } else {
                setPreviewOutput(`Evaluation error: ${data.error}`);
            }
        } catch {
            setPreviewOutput('Failed to evaluate dynamic preview.');
        } finally {
            setPreviewLoading(false);
        }
    };

    // Debounced automatic template compiler for webhook URL preview
    useEffect(() => {
        if (!showFormModal || formWebhookUrlType !== 'expression' || !formWebhookUrl.trim()) {
            setUrlPreviewOutput('');
            return;
        }

        const controller = new AbortController();
        const delayDebounceFn = setTimeout(async () => {
            setPreviewLoading(true);
            try {
                const res = await fetch('/api/admin/crons/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ template: formWebhookUrl.trim() }),
                    signal: controller.signal,
                });
                const data = await res.json();
                if (data.success) {
                    setUrlPreviewOutput(data.data);
                } else {
                    setUrlPreviewOutput(`Evaluation error: ${data.error}`);
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                setUrlPreviewOutput('Failed to evaluate dynamic preview.');
            } finally {
                if (!controller.signal.aborted) setPreviewLoading(false);
            }
        }, 600);

        return () => {
            clearTimeout(delayDebounceFn);
            controller.abort();
        };
    }, [formWebhookUrl, formWebhookUrlType, showFormModal]);

    const triggerUrlPreviewUpdate = async () => {
        if (!formWebhookUrl.trim()) return;
        setPreviewLoading(true);
        try {
            const res = await fetch('/api/admin/crons/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template: formWebhookUrl.trim() }),
            });
            const data = await res.json();
            if (data.success) {
                setUrlPreviewOutput(data.data);
            } else {
                setUrlPreviewOutput(`Evaluation error: ${data.error}`);
            }
        } catch {
            setUrlPreviewOutput('Failed to evaluate dynamic preview.');
        } finally {
            setPreviewLoading(false);
        }
    };

    // Debounced automatic template compiler for custom headers preview
    useEffect(() => {
        if (
            !showFormModal ||
            formWebhookHeadersType !== 'expression' ||
            formWebhookHeaders.length === 0
        ) {
            setHeadersPreviewOutput('');
            setHeadersPreviewRows([]);
            return;
        }

        const controller = new AbortController();
        const delayDebounceFn = setTimeout(async () => {
            setPreviewLoading(true);
            try {
                const headerRows = formWebhookHeaders.map((h, index) => ({
                    index: index + 1,
                    key: h.key || '',
                    value: h.value || '',
                }));

                const res = await fetch('/api/admin/crons/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ template: headerRows }),
                    signal: controller.signal,
                });
                const data = await res.json();
                if (data.success) {
                    setHeadersPreviewRows(JSON.parse(data.data));
                    setHeadersPreviewOutput('');
                } else {
                    setHeadersPreviewRows([]);
                    setHeadersPreviewOutput(`Evaluation error: ${data.error}`);
                }
            } catch (err) {
                if (err.name === 'AbortError') return;
                setHeadersPreviewRows([]);
                setHeadersPreviewOutput('Failed to evaluate dynamic preview.');
            } finally {
                if (!controller.signal.aborted) setPreviewLoading(false);
            }
        }, 600);

        return () => {
            clearTimeout(delayDebounceFn);
            controller.abort();
        };
    }, [formWebhookHeaders, formWebhookHeadersType, showFormModal]);

    const triggerHeadersPreviewUpdate = async () => {
        if (formWebhookHeaders.length === 0) return;
        setPreviewLoading(true);
        try {
            const headerRows = formWebhookHeaders.map((h, index) => ({
                index: index + 1,
                key: h.key || '',
                value: h.value || '',
            }));

            const res = await fetch('/api/admin/crons/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template: headerRows }),
            });
            const data = await res.json();
            if (data.success) {
                setHeadersPreviewRows(JSON.parse(data.data));
                setHeadersPreviewOutput('');
            } else {
                setHeadersPreviewRows([]);
                setHeadersPreviewOutput(`Evaluation error: ${data.error}`);
            }
        } catch {
            setHeadersPreviewRows([]);
            setHeadersPreviewOutput('Failed to evaluate dynamic preview.');
        } finally {
            setPreviewLoading(false);
        }
    };

    const systemJobs = jobs.filter((j) => j.type === 'system');
    const userJobs = jobs.filter((j) => j.type === 'user');
    const activeCount = jobs.filter((j) => j.enabled).length;

    return (
        <div className="adm-page">
            <PageHeader
                command="crontab -l"
                title="Task scheduler"
                description="Configure background maintenance tasks, clean legacy data, and schedule outgoing webhooks."
                actions={
                    <>
                        <div className="flex items-center gap-2">
                            <label htmlFor="scheduler-timezone" className="sr-only">
                                Scheduler timezone
                            </label>
                            <select
                                id="scheduler-timezone"
                                value={timezone}
                                onChange={(e) => handleTimezoneChange(e.target.value)}
                                disabled={timezoneSaving}
                                className="adm-input w-auto font-mono"
                            >
                                {TIMEZONES.map((tz) => (
                                    <option key={tz.value} value={tz.value}>
                                        {tz.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <Link href="/admin/config/crons/logs" className="adm-btn">
                            <FaEye aria-hidden="true" /> Execution logs
                        </Link>
                        <button
                            type="button"
                            onClick={() => fetchJobs(false)}
                            disabled={refreshing}
                            className="adm-btn"
                        >
                            <FaArrowsRotate
                                aria-hidden="true"
                                className={refreshing ? 'animate-spin' : ''}
                            />
                            Refresh
                        </button>
                        <button type="button" onClick={openGlobalEnvModal} className="adm-btn">
                            <FaLock aria-hidden="true" /> Global secrets
                        </button>
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="adm-btn adm-btn-primary"
                        >
                            <FaPlus aria-hidden="true" /> Create task
                        </button>
                    </>
                }
            />

            {message && (
                <div
                    role="alert"
                    className={`adm-notice ${
                        message.type === 'error'
                            ? 'adm-notice-error'
                            : message.type === 'success'
                            ? 'adm-notice-ok'
                            : 'adm-notice-info'
                    }`}
                >
                    {message.text}
                </div>
            )}

            <div className="adm-stats">
                <Stat
                    label="Active tasks"
                    value={`${activeCount} / ${jobs.length}`}
                    hint="Currently enabled in scheduler"
                />
                <Stat label="Engine state" value="60s loop" hint={`Timezone: ${timezone}`} />
                <Stat
                    label="Custom webhooks"
                    value={userJobs.length}
                    hint={`${globalEnvs.length} global secrets stored`}
                />
            </div>

            {loading ? (
                <section className="adm-panel">
                    <Loading label="Loading scheduler catalog" rows={6} />
                </section>
            ) : (
                <div className="adm-stack">
                    {/* System defined tasks */}
                    <div className="adm-stack">
                        <div className="flex items-center justify-between">
                            <h2 className="adm-panel-title">System-defined tasks</h2>
                            <Badge>{systemJobs.length} tasks</Badge>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            {systemJobs.map((job) => (
                                <Panel
                                    key={job._id}
                                    title={job.name}
                                    actions={
                                        <div className="flex items-center gap-2">
                                            <Badge tone="info">System</Badge>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={job.enabled}
                                                aria-label={`Enable ${job.name}`}
                                                onClick={() => handleToggle(job)}
                                                className="adm-switch"
                                            />
                                        </div>
                                    }
                                >
                                    <div className="flex h-full flex-col justify-between gap-4">
                                        <div className="space-y-4">
                                            <p className="adm-help">
                                                {SYSTEM_TASK_DESCRIPTIONS[job.action] ||
                                                    'Scheduled system maintenance task.'}
                                            </p>

                                            <dl className="adm-facts border-t border-[var(--hairline)] pt-3">
                                                <div>
                                                    <dt>Cron interval</dt>
                                                    <dd className="font-mono font-semibold text-[var(--text-bright)]">
                                                        {job.schedule}
                                                    </dd>
                                                    <dd className="adm-help">
                                                        {cronToHuman(job.schedule)}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Next run</dt>
                                                    <dd className="adm-num">
                                                        {job.nextRun
                                                            ? new Date(job.nextRun).toLocaleString()
                                                            : 'Disabled'}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Last status</dt>
                                                    <dd className="flex flex-wrap items-center gap-1.5">
                                                        {job.lastRun ? (
                                                            <>
                                                                <Badge
                                                                    tone={
                                                                        job.lastRunStatus === 'success'
                                                                            ? 'ok'
                                                                            : 'error'
                                                                    }
                                                                >
                                                                    {job.lastRunStatus === 'success'
                                                                        ? 'Success'
                                                                        : 'Failure'}
                                                                </Badge>
                                                                <span className="adm-help adm-num">
                                                                    {new Date(
                                                                        job.lastRun
                                                                    ).toLocaleString()}
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <span className="adm-help">
                                                                Never executed
                                                            </span>
                                                        )}
                                                    </dd>
                                                </div>
                                                <div>
                                                    <dt>Retry policy</dt>
                                                    <dd>
                                                        {job.retryEnabled
                                                            ? `${
                                                                  job.retryType === 'stable'
                                                                      ? 'Stable'
                                                                      : 'Exponential'
                                                              } (${job.retryCount}x, ${
                                                                  job.retryDelay
                                                              }s)`
                                                            : 'Off'}
                                                    </dd>
                                                </div>
                                            </dl>
                                        </div>

                                        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--hairline)] pt-3">
                                            <Link
                                                href={`/admin/config/crons/logs?cronId=${job._id}`}
                                                className="adm-btn"
                                            >
                                                <FaEye aria-hidden="true" /> Logs
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => openEditModal(job)}
                                                className="adm-btn"
                                            >
                                                <FaPen aria-hidden="true" /> Edit schedule
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRunNow(job)}
                                                disabled={runningJobId === job._id}
                                                className="adm-btn adm-btn-primary"
                                            >
                                                {runningJobId === job._id ? (
                                                    <FaSpinner
                                                        aria-hidden="true"
                                                        className="animate-spin"
                                                    />
                                                ) : (
                                                    <FaPlay aria-hidden="true" />
                                                )}
                                                Run now
                                            </button>
                                        </div>
                                    </div>
                                </Panel>
                            ))}
                        </div>
                    </div>

                    {/* User defined webhooks */}
                    <div className="adm-stack">
                        <div className="flex items-center justify-between">
                            <h2 className="adm-panel-title">User-defined webhooks</h2>
                            <Badge>{userJobs.length} tasks</Badge>
                        </div>

                        {userJobs.length === 0 ? (
                            <section className="adm-panel">
                                <EmptyState
                                    title="No custom tasks registered"
                                    description="Register a webhook task to trigger an HTTP request on a recurring schedule."
                                    action={
                                        <button
                                            type="button"
                                            onClick={openCreateModal}
                                            className="adm-btn adm-btn-primary"
                                        >
                                            <FaPlus aria-hidden="true" /> Create webhook task
                                        </button>
                                    }
                                />
                            </section>
                        ) : (
                            <div className="grid gap-6 lg:grid-cols-2">
                                {userJobs.map((job) => (
                                    <Panel
                                        key={job._id}
                                        title={job.name}
                                        actions={
                                            <div className="flex items-center gap-2">
                                                <Badge>{job.webhookMethod || 'POST'}</Badge>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={job.enabled}
                                                    aria-label={`Enable ${job.name}`}
                                                    onClick={() => handleToggle(job)}
                                                    className="adm-switch"
                                                />
                                            </div>
                                        }
                                    >
                                        <div className="flex h-full flex-col justify-between gap-4">
                                            <div className="space-y-4">
                                                <div className="rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-3 font-mono text-xs space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[var(--adm-hint)] shrink-0">
                                                            Target URL:
                                                        </span>
                                                        <span
                                                            className="truncate text-[var(--text-bright)]"
                                                            title={job.webhookUrl}
                                                        >
                                                            {job.webhookUrl}
                                                        </span>
                                                    </div>
                                                    {job.webhookHeaders &&
                                                        job.webhookHeaders.length > 0 && (
                                                            <div className="flex items-center gap-2 border-t border-[var(--hairline)] pt-1.5">
                                                                <span className="text-[var(--adm-hint)] shrink-0">
                                                                    Headers:
                                                                </span>
                                                                <span
                                                                    className="truncate text-[var(--text-secondary)]"
                                                                    title={job.webhookHeaders
                                                                        .map(
                                                                            (h) =>
                                                                                `${h.key}: ${h.value}`
                                                                        )
                                                                        .join('\n')}
                                                                >
                                                                    {job.webhookHeaders
                                                                        .map((h) => h.key)
                                                                        .join(', ')}
                                                                </span>
                                                            </div>
                                                        )}
                                                    {job.webhookBody && (
                                                        <div className="flex items-center gap-2 border-t border-[var(--hairline)] pt-1.5">
                                                            <span className="text-[var(--adm-hint)] shrink-0">
                                                                Payload:
                                                            </span>
                                                            <span
                                                                className="truncate text-[var(--text-secondary)]"
                                                                title={job.webhookBody}
                                                            >
                                                                {job.webhookBody}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <dl className="adm-facts border-t border-[var(--hairline)] pt-3">
                                                    <div>
                                                        <dt>Cron interval</dt>
                                                        <dd className="font-mono font-semibold text-[var(--text-bright)]">
                                                            {job.schedule}
                                                        </dd>
                                                        <dd className="adm-help">
                                                            {cronToHuman(job.schedule)}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt>Next run</dt>
                                                        <dd className="adm-num">
                                                            {job.nextRun
                                                                ? new Date(
                                                                      job.nextRun
                                                                  ).toLocaleString()
                                                                : 'Disabled'}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt>Last status</dt>
                                                        <dd className="flex flex-wrap items-center gap-1.5">
                                                            {job.lastRun ? (
                                                                <>
                                                                    <Badge
                                                                        tone={
                                                                            job.lastRunStatus ===
                                                                            'success'
                                                                                ? 'ok'
                                                                                : 'error'
                                                                        }
                                                                    >
                                                                        {job.lastRunStatus ===
                                                                        'success'
                                                                            ? 'Success'
                                                                            : 'Failure'}
                                                                    </Badge>
                                                                    <span className="adm-help adm-num">
                                                                        {new Date(
                                                                            job.lastRun
                                                                        ).toLocaleString()}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="adm-help">
                                                                    Never executed
                                                                </span>
                                                            )}
                                                        </dd>
                                                    </div>
                                                    <div>
                                                        <dt>Retry policy</dt>
                                                        <dd>
                                                            {job.retryEnabled
                                                                ? `${
                                                                      job.retryType === 'stable'
                                                                          ? 'Stable'
                                                                          : 'Exponential'
                                                                  } (${job.retryCount}x, ${
                                                                      job.retryDelay
                                                                  }s)`
                                                                : 'Off'}
                                                        </dd>
                                                    </div>
                                                </dl>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--hairline)] pt-3">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(job)}
                                                    aria-label={`Delete ${job.name}`}
                                                    className="adm-icon-btn"
                                                >
                                                    <FaTrashCan aria-hidden="true" />
                                                </button>

                                                <div className="flex flex-wrap gap-2">
                                                    <Link
                                                        href={`/admin/config/crons/logs?cronId=${job._id}`}
                                                        className="adm-btn"
                                                    >
                                                        <FaEye aria-hidden="true" /> Logs
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditModal(job)}
                                                        className="adm-btn"
                                                    >
                                                        <FaPen aria-hidden="true" /> Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRunNow(job)}
                                                        disabled={runningJobId === job._id}
                                                        className="adm-btn adm-btn-primary"
                                                    >
                                                        {runningJobId === job._id ? (
                                                            <FaSpinner
                                                                aria-hidden="true"
                                                                className="animate-spin"
                                                            />
                                                        ) : (
                                                            <FaPlay aria-hidden="true" />
                                                        )}
                                                        Run now
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </Panel>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Dynamic variables documentation */}
                    <Panel title="Dynamic variables and webhook templating">
                        <div className="grid gap-6 md:grid-cols-2 text-sm text-[var(--text-secondary)]">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-[var(--text-bright)] mb-1">
                                        Templating basics
                                    </h3>
                                    <p className="adm-help">
                                        Reference live site data and system properties with the{' '}
                                        <code className="adm-code">$</code> prefix. Placeholders are
                                        evaluated at execution time in the webhook URL, HTTP headers,
                                        and request body.
                                    </p>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--text-bright)] mb-1">
                                        Time, system, and secret variables
                                    </h3>
                                    <ul className="space-y-1.5 font-mono text-xs">
                                        <li>
                                            <code className="adm-code">$time</code> /{' '}
                                            <code className="adm-code">$timestamp</code> — Current
                                            ISO-8601 timestamp
                                        </li>
                                        <li>
                                            <code className="adm-code">$date</code> — Locale current
                                            date
                                        </li>
                                        <li>
                                            <code className="adm-code">$env.KEY_NAME</code> —
                                            Decrypted global or task secret
                                        </li>
                                        <li>
                                            <code className="adm-code">$site</code> — Base URL of
                                            the website
                                        </li>
                                        <li>
                                            <code className="adm-code">$device.platform</code> /{' '}
                                            <code className="adm-code">$device.os</code> — Host OS
                                            metadata
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-[var(--text-bright)] mb-1">
                                        Supported site collections
                                    </h3>
                                    <p className="adm-help mb-2">
                                        Use array index <code className="adm-code">[0]</code> or dot{' '}
                                        <code className="adm-code">.0</code> notation to read fields:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {[
                                            '$blogs',
                                            '$projects',
                                            '$gallery',
                                            '$config',
                                            '$about',
                                            '$ads',
                                            '$socials',
                                            '$themes',
                                            '$messages',
                                            '$deployments',
                                        ].map((v) => (
                                            <code key={v} className="adm-code">
                                                {v}
                                            </code>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-[var(--text-bright)] mb-1">
                                        Example payload
                                    </h3>
                                    <pre className="adm-code">{`{
  "post_title": "$blogs[0].title",
  "publish_date": "$blogs.0.createdAt",
  "action_time": "$time"
}`}</pre>
                                </div>
                            </div>
                        </div>
                    </Panel>
                </div>
            )}

            {/* Create / Edit Task Modal */}
            {showFormModal && (
                <div
                    className="adm-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="cron-form-modal-title"
                >
                    <div className="adm-dialog adm-dialog-framed max-w-2xl">
                        <div className="adm-dialog-head">
                            <h3 id="cron-form-modal-title" className="adm-panel-title">
                                {editingJob
                                    ? `Edit task: ${editingJob.name}`
                                    : 'Create custom webhook task'}
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowFormModal(false)}
                                aria-label="Close modal"
                                className="adm-icon-btn"
                            >
                                <FaXmark aria-hidden="true" />
                            </button>
                        </div>

                        <form onSubmit={handleFormSubmit} className="flex min-h-0 flex-1 flex-col">
                            <div className="adm-dialog-body space-y-5">
                                {(!editingJob || editingJob.type === 'user') ? (
                                    <Field label="Task name">
                                        <input
                                            type="text"
                                            required
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            className="adm-input"
                                            placeholder="Daily analytics report"
                                        />
                                    </Field>
                                ) : (
                                    <div className="adm-field">
                                        <span className="adm-label">Task name</span>
                                        <div className="adm-input flex items-center bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                                            {formName} (System task)
                                        </div>
                                    </div>
                                )}

                                {/* Schedule Builder */}
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <span className="adm-label">Task schedule</span>
                                        <div role="group" aria-label="Schedule builder mode" className="flex gap-1">
                                            <button
                                                type="button"
                                                aria-pressed={builderTab === 'simple'}
                                                onClick={() => {
                                                    setBuilderTab('simple');
                                                    const compiled = compileCronFromSimple(
                                                        freqType,
                                                        freqValMinutes,
                                                        freqValHour,
                                                        freqValMinute,
                                                        freqValDow,
                                                        freqValDom
                                                    );
                                                    setFormSchedule(compiled);
                                                }}
                                                className="adm-tab"
                                            >
                                                Simple builder
                                            </button>
                                            <button
                                                type="button"
                                                aria-pressed={builderTab === 'advanced'}
                                                onClick={() => setBuilderTab('advanced')}
                                                className="adm-tab"
                                            >
                                                Cron expression
                                            </button>
                                        </div>
                                    </div>

                                    {builderTab === 'simple' ? (
                                        <div className="space-y-4 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-4">
                                            <Field label="Frequency">
                                                <select
                                                    value={freqType}
                                                    onChange={(e) =>
                                                        handleSimpleChange('type', e.target.value)
                                                    }
                                                    className="adm-input"
                                                >
                                                    <option value="minutes">Every N minutes</option>
                                                    <option value="hourly">Hourly</option>
                                                    <option value="daily">Daily</option>
                                                    <option value="weekly">Weekly</option>
                                                    <option value="monthly">Monthly</option>
                                                </select>
                                            </Field>

                                            {freqType === 'minutes' && (
                                                <Field label="Minutes interval">
                                                    <select
                                                        value={freqValMinutes}
                                                        onChange={(e) =>
                                                            handleSimpleChange(
                                                                'minutes',
                                                                e.target.value
                                                            )
                                                        }
                                                        className="adm-input"
                                                    >
                                                        <option value="1">Every 1 minute</option>
                                                        <option value="5">Every 5 minutes</option>
                                                        <option value="10">Every 10 minutes</option>
                                                        <option value="15">Every 15 minutes</option>
                                                        <option value="30">Every 30 minutes</option>
                                                        <option value="45">Every 45 minutes</option>
                                                    </select>
                                                </Field>
                                            )}

                                            {freqType === 'hourly' && (
                                                <Field label="Minute of the hour">
                                                    <select
                                                        value={freqValMinute}
                                                        onChange={(e) =>
                                                            handleSimpleChange(
                                                                'minute',
                                                                e.target.value
                                                            )
                                                        }
                                                        className="adm-input font-mono"
                                                    >
                                                        {Array.from({ length: 60 }, (_, i) => (
                                                            <option key={i} value={i}>
                                                                Minute{' '}
                                                                {i.toString().padStart(2, '0')}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </Field>
                                            )}

                                            {freqType === 'daily' && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <Field label="Hour (24h)">
                                                        <select
                                                            value={freqValHour}
                                                            onChange={(e) =>
                                                                handleSimpleChange(
                                                                    'hour',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="adm-input font-mono"
                                                        >
                                                            {Array.from({ length: 24 }, (_, i) => {
                                                                const ampm = i >= 12 ? 'PM' : 'AM';
                                                                const displayHour =
                                                                    i % 12 === 0 ? 12 : i % 12;
                                                                return (
                                                                    <option key={i} value={i}>
                                                                        {i
                                                                            .toString()
                                                                            .padStart(2, '0')}
                                                                        :00 ({displayHour} {ampm})
                                                                    </option>
                                                                );
                                                            })}
                                                        </select>
                                                    </Field>
                                                    <Field label="Minute">
                                                        <select
                                                            value={freqValMinute}
                                                            onChange={(e) =>
                                                                handleSimpleChange(
                                                                    'minute',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="adm-input font-mono"
                                                        >
                                                            {Array.from({ length: 60 }, (_, i) => (
                                                                <option key={i} value={i}>
                                                                    {i.toString().padStart(2, '0')}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </Field>
                                                </div>
                                            )}

                                            {freqType === 'weekly' && (
                                                <div className="space-y-4">
                                                    <Field label="Day of week">
                                                        <select
                                                            value={freqValDow}
                                                            onChange={(e) =>
                                                                handleSimpleChange(
                                                                    'dow',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="adm-input"
                                                        >
                                                            <option value="0">Sunday</option>
                                                            <option value="1">Monday</option>
                                                            <option value="2">Tuesday</option>
                                                            <option value="3">Wednesday</option>
                                                            <option value="4">Thursday</option>
                                                            <option value="5">Friday</option>
                                                            <option value="6">Saturday</option>
                                                        </select>
                                                    </Field>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Field label="Hour (24h)">
                                                            <select
                                                                value={freqValHour}
                                                                onChange={(e) =>
                                                                    handleSimpleChange(
                                                                        'hour',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="adm-input font-mono"
                                                            >
                                                                {Array.from(
                                                                    { length: 24 },
                                                                    (_, i) => {
                                                                        const ampm =
                                                                            i >= 12 ? 'PM' : 'AM';
                                                                        const displayHour =
                                                                            i % 12 === 0
                                                                                ? 12
                                                                                : i % 12;
                                                                        return (
                                                                            <option
                                                                                key={i}
                                                                                value={i}
                                                                            >
                                                                                {i
                                                                                    .toString()
                                                                                    .padStart(
                                                                                        2,
                                                                                        '0'
                                                                                    )}
                                                                                :00 ({displayHour}{' '}
                                                                                {ampm})
                                                                            </option>
                                                                        );
                                                                    }
                                                                )}
                                                            </select>
                                                        </Field>
                                                        <Field label="Minute">
                                                            <select
                                                                value={freqValMinute}
                                                                onChange={(e) =>
                                                                    handleSimpleChange(
                                                                        'minute',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="adm-input font-mono"
                                                            >
                                                                {Array.from(
                                                                    { length: 60 },
                                                                    (_, i) => (
                                                                        <option key={i} value={i}>
                                                                            {i
                                                                                .toString()
                                                                                .padStart(2, '0')}
                                                                        </option>
                                                                    )
                                                                )}
                                                            </select>
                                                        </Field>
                                                    </div>
                                                </div>
                                            )}

                                            {freqType === 'monthly' && (
                                                <div className="space-y-4">
                                                    <Field label="Day of month">
                                                        <select
                                                            value={freqValDom}
                                                            onChange={(e) =>
                                                                handleSimpleChange(
                                                                    'dom',
                                                                    e.target.value
                                                                )
                                                            }
                                                            className="adm-input font-mono"
                                                        >
                                                            {Array.from({ length: 31 }, (_, i) => (
                                                                <option key={i + 1} value={i + 1}>
                                                                    Day {i + 1}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </Field>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <Field label="Hour (24h)">
                                                            <select
                                                                value={freqValHour}
                                                                onChange={(e) =>
                                                                    handleSimpleChange(
                                                                        'hour',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="adm-input font-mono"
                                                            >
                                                                {Array.from(
                                                                    { length: 24 },
                                                                    (_, i) => {
                                                                        const ampm =
                                                                            i >= 12 ? 'PM' : 'AM';
                                                                        const displayHour =
                                                                            i % 12 === 0
                                                                                ? 12
                                                                                : i % 12;
                                                                        return (
                                                                            <option
                                                                                key={i}
                                                                                value={i}
                                                                            >
                                                                                {i
                                                                                    .toString()
                                                                                    .padStart(
                                                                                        2,
                                                                                        '0'
                                                                                    )}
                                                                                :00 ({displayHour}{' '}
                                                                                {ampm})
                                                                            </option>
                                                                        );
                                                                    }
                                                                )}
                                                            </select>
                                                        </Field>
                                                        <Field label="Minute">
                                                            <select
                                                                value={freqValMinute}
                                                                onChange={(e) =>
                                                                    handleSimpleChange(
                                                                        'minute',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                className="adm-input font-mono"
                                                            >
                                                                {Array.from(
                                                                    { length: 60 },
                                                                    (_, i) => (
                                                                        <option key={i} value={i}>
                                                                            {i
                                                                                .toString()
                                                                                .padStart(2, '0')}
                                                                        </option>
                                                                    )
                                                                )}
                                                            </select>
                                                        </Field>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-3 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-4">
                                            <Field label="Cron expression (5 fields)">
                                                <input
                                                    type="text"
                                                    required
                                                    value={formSchedule}
                                                    onChange={(e) => setFormSchedule(e.target.value)}
                                                    className="adm-input font-mono"
                                                    placeholder="* * * * *"
                                                />
                                            </Field>
                                            <div className="flex flex-wrap gap-1.5">
                                                {[
                                                    ['*/5 * * * *', 'Every 5 min'],
                                                    ['0 * * * *', 'Every hour'],
                                                    ['0 0 * * *', 'Daily at midnight'],
                                                    ['0 0 * * 0', 'Weekly on Sunday'],
                                                ].map(([expr, label]) => (
                                                    <button
                                                        key={expr}
                                                        type="button"
                                                        onClick={() => setFormSchedule(expr)}
                                                        className="adm-btn"
                                                    >
                                                        {label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="adm-notice adm-notice-ok flex flex-wrap items-center justify-between gap-2">
                                        <span>{cronToHuman(formSchedule)}</span>
                                        <code className="adm-code">{formSchedule}</code>
                                    </div>
                                </div>

                                {/* Webhook settings (user jobs only) */}
                                {(!editingJob || editingJob.type === 'user') && (
                                    <div className="space-y-4 border-t border-[var(--hairline)] pt-4">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <label
                                                    htmlFor="cron-webhook-url"
                                                    className="adm-label"
                                                >
                                                    Webhook URL
                                                </label>
                                                <div
                                                    role="group"
                                                    aria-label="Webhook URL mode"
                                                    className="flex gap-1"
                                                >
                                                    <button
                                                        type="button"
                                                        aria-pressed={
                                                            formWebhookUrlType === 'fixed'
                                                        }
                                                        onClick={() =>
                                                            setFormWebhookUrlType('fixed')
                                                        }
                                                        className="adm-tab"
                                                    >
                                                        Fixed
                                                    </button>
                                                    <button
                                                        type="button"
                                                        aria-pressed={
                                                            formWebhookUrlType === 'expression'
                                                        }
                                                        onClick={() =>
                                                            setFormWebhookUrlType('expression')
                                                        }
                                                        className="adm-tab"
                                                    >
                                                        Expression
                                                    </button>
                                                </div>
                                            </div>
                                            <input
                                                id="cron-webhook-url"
                                                type={
                                                    formWebhookUrlType === 'expression'
                                                        ? 'text'
                                                        : 'url'
                                                }
                                                required
                                                value={formWebhookUrl}
                                                onChange={(e) => setFormWebhookUrl(e.target.value)}
                                                className="adm-input font-mono"
                                                placeholder={
                                                    formWebhookUrlType === 'expression'
                                                        ? 'https://example.com/api/$projects[0]._id'
                                                        : 'https://example.com/api/tasks'
                                                }
                                            />
                                            {formWebhookUrlType === 'expression' &&
                                                formWebhookUrl.trim() && (
                                                    <div className="space-y-2 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="adm-help font-semibold text-[var(--text-bright)]">
                                                                URL preview (evaluated)
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={triggerUrlPreviewUpdate}
                                                                disabled={previewLoading}
                                                                className="adm-btn adm-btn-quiet"
                                                            >
                                                                {previewLoading
                                                                    ? 'Compiling…'
                                                                    : 'Refresh preview'}
                                                            </button>
                                                        </div>
                                                        <pre className="adm-code max-h-36 whitespace-pre-wrap text-xs">
                                                            {urlPreviewOutput ||
                                                                'Type variables in the webhook URL to see a live evaluation preview…'}
                                                        </pre>
                                                    </div>
                                                )}
                                        </div>

                                        <Field label="HTTP method">
                                            <select
                                                value={formWebhookMethod}
                                                onChange={(e) =>
                                                    setFormWebhookMethod(e.target.value)
                                                }
                                                className="adm-input"
                                            >
                                                <option value="POST">
                                                    POST (Sends trigger metadata or body)
                                                </option>
                                                <option value="GET">GET (Ping request)</option>
                                            </select>
                                        </Field>

                                        {/* Custom Headers */}
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <span className="adm-label">
                                                    Custom HTTP headers
                                                </span>
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        role="group"
                                                        aria-label="Headers mode"
                                                        className="flex gap-1"
                                                    >
                                                        <button
                                                            type="button"
                                                            aria-pressed={
                                                                formWebhookHeadersType === 'fixed'
                                                            }
                                                            onClick={() =>
                                                                setFormWebhookHeadersType('fixed')
                                                            }
                                                            className="adm-tab"
                                                        >
                                                            Fixed
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-pressed={
                                                                formWebhookHeadersType ===
                                                                'expression'
                                                            }
                                                            onClick={() =>
                                                                setFormWebhookHeadersType(
                                                                    'expression'
                                                                )
                                                            }
                                                            className="adm-tab"
                                                        >
                                                            Expression
                                                        </button>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setFormWebhookHeaders([
                                                                { key: '', value: '' },
                                                                ...formWebhookHeaders,
                                                            ])
                                                        }
                                                        className="adm-btn"
                                                    >
                                                        <FaPlus aria-hidden="true" /> Add header
                                                    </button>
                                                </div>
                                            </div>

                                            {formWebhookHeaders.length === 0 ? (
                                                <p className="adm-help">
                                                    No custom headers added. Requests send default
                                                    headers.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {formWebhookHeaders.map((header, index) => (
                                                        <div
                                                            key={index}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <input
                                                                type="text"
                                                                aria-label={`Header ${
                                                                    index + 1
                                                                } name`}
                                                                placeholder="Header-Name"
                                                                value={header.key}
                                                                onChange={(e) => {
                                                                    const newHeaders = [
                                                                        ...formWebhookHeaders,
                                                                    ];
                                                                    newHeaders[index].key =
                                                                        e.target.value;
                                                                    setFormWebhookHeaders(
                                                                        newHeaders
                                                                    );
                                                                }}
                                                                className="adm-input flex-1 font-mono"
                                                            />
                                                            <input
                                                                type="text"
                                                                aria-label={`Header ${
                                                                    index + 1
                                                                } value`}
                                                                placeholder="Value"
                                                                value={header.value}
                                                                onChange={(e) => {
                                                                    const newHeaders = [
                                                                        ...formWebhookHeaders,
                                                                    ];
                                                                    newHeaders[index].value =
                                                                        e.target.value;
                                                                    setFormWebhookHeaders(
                                                                        newHeaders
                                                                    );
                                                                }}
                                                                className="adm-input flex-1 font-mono"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setFormWebhookHeaders(
                                                                        formWebhookHeaders.filter(
                                                                            (_, i) => i !== index
                                                                        )
                                                                    )
                                                                }
                                                                aria-label={`Remove header ${
                                                                    index + 1
                                                                }`}
                                                                className="adm-icon-btn"
                                                            >
                                                                <FaTrashCan aria-hidden="true" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {formWebhookHeadersType === 'expression' &&
                                                formWebhookHeaders.length > 0 && (
                                                    <div className="space-y-2 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="adm-help font-semibold text-[var(--text-bright)]">
                                                                Headers preview (evaluated)
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    triggerHeadersPreviewUpdate
                                                                }
                                                                disabled={previewLoading}
                                                                className="adm-btn adm-btn-quiet"
                                                            >
                                                                {previewLoading
                                                                    ? 'Compiling…'
                                                                    : 'Refresh preview'}
                                                            </button>
                                                        </div>
                                                        {headersPreviewOutput ? (
                                                            <pre className="adm-code max-h-36 whitespace-pre-wrap text-xs">
                                                                {headersPreviewOutput}
                                                            </pre>
                                                        ) : (
                                                            <ul className="adm-list">
                                                                {formWebhookHeaders.map(
                                                                    (header, index) => {
                                                                        const preview =
                                                                            headersPreviewRows[
                                                                                index
                                                                            ] || {
                                                                                key:
                                                                                    header.key ||
                                                                                    '',
                                                                                value:
                                                                                    header.value ||
                                                                                    '',
                                                                            };
                                                                        return (
                                                                            <li
                                                                                key={`header-preview-${index}`}
                                                                                className="py-2 font-mono text-xs"
                                                                            >
                                                                                <span className="font-semibold text-[var(--text-bright)]">
                                                                                    {formatPreviewValue(
                                                                                        preview.key
                                                                                    )}
                                                                                </span>
                                                                                :{' '}
                                                                                <span className="text-[var(--text-secondary)]">
                                                                                    {formatPreviewValue(
                                                                                        preview.value
                                                                                    )}
                                                                                </span>
                                                                            </li>
                                                                        );
                                                                    }
                                                                )}
                                                            </ul>
                                                        )}
                                                    </div>
                                                )}
                                        </div>

                                        {/* Request Body */}
                                        {formWebhookMethod === 'POST' && (
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <label
                                                        htmlFor="cron-webhook-body"
                                                        className="adm-label"
                                                    >
                                                        Custom HTTP request body
                                                    </label>
                                                    <div
                                                        role="group"
                                                        aria-label="Request body mode"
                                                        className="flex gap-1"
                                                    >
                                                        <button
                                                            type="button"
                                                            aria-pressed={
                                                                formWebhookBodyType === 'fixed'
                                                            }
                                                            onClick={() =>
                                                                setFormWebhookBodyType('fixed')
                                                            }
                                                            className="adm-tab"
                                                        >
                                                            Fixed
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-pressed={
                                                                formWebhookBodyType === 'expression'
                                                            }
                                                            onClick={() =>
                                                                setFormWebhookBodyType('expression')
                                                            }
                                                            className="adm-tab"
                                                        >
                                                            Expression
                                                        </button>
                                                    </div>
                                                </div>

                                                <textarea
                                                    id="cron-webhook-body"
                                                    value={formWebhookBody}
                                                    onChange={(e) =>
                                                        setFormWebhookBody(e.target.value)
                                                    }
                                                    className="adm-input font-mono"
                                                    placeholder={
                                                        formWebhookBodyType === 'expression'
                                                            ? '{"title": "$blogs[0].title", "run_time": "$time"}'
                                                            : '{"status": "active"}'
                                                    }
                                                />

                                                {formWebhookBodyType === 'expression' &&
                                                    formWebhookBody.trim() && (
                                                        <div className="space-y-2 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-3">
                                                            <div className="flex items-center justify-between">
                                                                <span className="adm-help font-semibold text-[var(--text-bright)]">
                                                                    Body preview (evaluated)
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={triggerPreviewUpdate}
                                                                    disabled={previewLoading}
                                                                    className="adm-btn adm-btn-quiet"
                                                                >
                                                                    {previewLoading
                                                                        ? 'Compiling…'
                                                                        : 'Refresh preview'}
                                                                </button>
                                                            </div>
                                                            <pre className="adm-code max-h-36 whitespace-pre-wrap text-xs">
                                                                {previewOutput ||
                                                                    'Type variables to see a live evaluation preview…'}
                                                            </pre>
                                                        </div>
                                                    )}

                                                <p className="adm-help">
                                                    Supports dynamic variables like{' '}
                                                    <code className="adm-code">$blogs</code>,{' '}
                                                    <code className="adm-code">$projects</code>, or{' '}
                                                    <code className="adm-code">$time</code>.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Notifications */}
                                <div className="space-y-3 border-t border-[var(--hairline)] pt-4">
                                    <span className="adm-label">Task notifications</span>
                                    {notificationConfigured ? (
                                        <div className="space-y-4 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <div>
                                                    <p className="font-semibold text-sm text-[var(--text-bright)]">
                                                        Send task alerts
                                                    </p>
                                                    <p className="adm-help">
                                                        Dispatch alerts to configured Discord,
                                                        Telegram, or ntfy channels.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={formNotificationEnabled}
                                                    aria-label="Enable task notifications"
                                                    onClick={() =>
                                                        setFormNotificationEnabled(
                                                            !formNotificationEnabled
                                                        )
                                                    }
                                                    className="adm-switch"
                                                />
                                            </div>

                                            {formNotificationEnabled && (
                                                <Field label="Alert trigger">
                                                    <select
                                                        value={formNotificationOn}
                                                        onChange={(e) =>
                                                            setFormNotificationOn(e.target.value)
                                                        }
                                                        className="adm-input"
                                                    >
                                                        <option value="always">
                                                            Always (on success or failure)
                                                        </option>
                                                        <option value="success">
                                                            On success only
                                                        </option>
                                                        <option value="failure">
                                                            On failure only
                                                        </option>
                                                    </select>
                                                </Field>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="adm-notice adm-notice-warn">
                                            <p className="font-semibold text-[var(--text-bright)]">
                                                Notification gateway not configured
                                            </p>
                                            <p className="mt-1">
                                                Telegram, Discord, and ntfy push channels are
                                                currently disabled.{' '}
                                                <Link
                                                    href="/admin/config/notification"
                                                    target="_blank"
                                                    className="adm-link underline"
                                                >
                                                    Configure notification channels
                                                </Link>
                                                .
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Retry mechanism */}
                                <div className="space-y-3 border-t border-[var(--hairline)] pt-4">
                                    <span className="adm-label">Retry policy</span>
                                    <div className="space-y-4 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="font-semibold text-sm text-[var(--text-bright)]">
                                                    Enable automatic retries
                                                </p>
                                                <p className="adm-help">
                                                    Retry the task if it fails or returns a non-2xx
                                                    status.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={formRetryEnabled}
                                                aria-label="Enable automatic retries"
                                                onClick={() =>
                                                    setFormRetryEnabled(!formRetryEnabled)
                                                }
                                                className="adm-switch"
                                            />
                                        </div>

                                        {formRetryEnabled && (
                                            <div className="space-y-4 border-t border-[var(--hairline)] pt-3">
                                                <Field
                                                    label="Backoff policy"
                                                    help={
                                                        formRetryType === 'stable'
                                                            ? `Retries every ${formRetryDelay}s.`
                                                            : `Delay doubles each attempt (${formRetryDelay}s, ${
                                                                  formRetryDelay * 2
                                                              }s, ${formRetryDelay * 4}s…).`
                                                    }
                                                >
                                                    <select
                                                        value={formRetryType}
                                                        onChange={(e) =>
                                                            setFormRetryType(e.target.value)
                                                        }
                                                        className="adm-input"
                                                    >
                                                        <option value="stable">
                                                            Stable backoff (equal delay)
                                                        </option>
                                                        <option value="exponential">
                                                            Exponential backoff (doubles after each
                                                            failure)
                                                        </option>
                                                    </select>
                                                </Field>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <Field label="Max retries">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="10"
                                                            value={formRetryCount}
                                                            onChange={(e) =>
                                                                setFormRetryCount(
                                                                    parseInt(e.target.value, 10) ||
                                                                        3
                                                                )
                                                            }
                                                            className="adm-input adm-num"
                                                        />
                                                    </Field>
                                                    <Field label="Base delay (seconds)">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            max="3600"
                                                            value={formRetryDelay}
                                                            onChange={(e) =>
                                                                setFormRetryDelay(
                                                                    parseInt(e.target.value, 10) ||
                                                                        60
                                                                )
                                                            }
                                                            className="adm-input adm-num"
                                                        />
                                                    </Field>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="adm-dialog-foot">
                                <button
                                    type="button"
                                    onClick={() => setShowFormModal(false)}
                                    disabled={formSubmitting}
                                    className="adm-btn"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={formSubmitting}
                                    className="adm-btn adm-btn-primary"
                                >
                                    {formSubmitting && (
                                        <FaSpinner aria-hidden="true" className="animate-spin" />
                                    )}
                                    {formSubmitting ? 'Saving' : 'Save task schedule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Global Env Modal */}
            {showGlobalEnvModal && (
                <div
                    className="adm-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="global-env-modal-title"
                >
                    <div className="adm-dialog adm-dialog-framed max-w-lg">
                        <div className="adm-dialog-head">
                            <h3 id="global-env-modal-title" className="adm-panel-title">
                                Global environment secrets
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowGlobalEnvModal(false)}
                                aria-label="Close modal"
                                className="adm-icon-btn"
                            >
                                <FaXmark aria-hidden="true" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleGlobalEnvSubmit}
                            className="flex min-h-0 flex-1 flex-col"
                        >
                            <div className="adm-dialog-body space-y-4">
                                <p className="adm-help">
                                    Values are stored encrypted with AES-256. Reference them in any
                                    webhook URL, header, or body as{' '}
                                    <code className="adm-code">$env.VARIABLE_NAME</code>.
                                </p>

                                <div className="flex items-center justify-between">
                                    <span className="adm-label">Environment variables</span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setGlobalEnvs([{ key: '', value: '' }, ...globalEnvs])
                                        }
                                        className="adm-btn"
                                    >
                                        <FaPlus aria-hidden="true" /> Add variable
                                    </button>
                                </div>

                                {globalEnvs.length === 0 ? (
                                    <EmptyState
                                        title="No global variables configured"
                                        description="Add a key-value pair above to reference secrets across webhook tasks."
                                    />
                                ) : (
                                    <div className="space-y-2">
                                        {globalEnvs.map((env, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    aria-label={`Environment variable ${
                                                        index + 1
                                                    } name`}
                                                    placeholder="VARIABLE_NAME"
                                                    value={env.key}
                                                    onChange={(e) => {
                                                        const newEnv = [...globalEnvs];
                                                        newEnv[index].key = e.target.value;
                                                        setGlobalEnvs(newEnv);
                                                    }}
                                                    className="adm-input flex-1 font-mono"
                                                />
                                                <input
                                                    type="password"
                                                    aria-label={`Environment variable ${
                                                        index + 1
                                                    } value`}
                                                    placeholder="Value"
                                                    value={env.value}
                                                    onChange={(e) => {
                                                        const newEnv = [...globalEnvs];
                                                        newEnv[index].value = e.target.value;
                                                        setGlobalEnvs(newEnv);
                                                    }}
                                                    className="adm-input flex-1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setGlobalEnvs(
                                                            globalEnvs.filter((_, i) => i !== index)
                                                        )
                                                    }
                                                    aria-label={`Remove variable ${index + 1}`}
                                                    className="adm-icon-btn"
                                                >
                                                    <FaTrashCan aria-hidden="true" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="adm-dialog-foot">
                                <button
                                    type="button"
                                    onClick={() => setShowGlobalEnvModal(false)}
                                    disabled={globalEnvSubmitting}
                                    className="adm-btn"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={globalEnvSubmitting}
                                    className="adm-btn adm-btn-primary"
                                >
                                    {globalEnvSubmitting && (
                                        <FaSpinner aria-hidden="true" className="animate-spin" />
                                    )}
                                    {globalEnvSubmitting ? 'Saving' : 'Save global secrets'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
