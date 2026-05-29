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
    Terminal,
    ShieldAlert,
    Lock,
    ChevronDown
} from 'lucide-react';

function cronToHuman(cronExpression) {
    if (!cronExpression) return '';
    const fields = cronExpression.trim().split(/\s+/);
    if (fields.length !== 5) return 'Invalid Cron Expression';

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
                    case 1:  return 'st';
                    case 2:  return 'nd';
                    case 3:  return 'rd';
                    default: return 'th';
                }
            };
            return `Monthly on the ${domNum}${suffix(domNum)} at ${formatTime(hour, min)}`;
        }
    }

    return `Custom Pattern (Min: ${min}, Hour: ${hour}, Day of Month: ${dom}, Month: ${month}, Day of Week: ${dow})`;
}

function formatPreviewValue(value) {
    if (value === null || value === undefined || value === '') return '(empty)';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
}

function hasDynamicTemplate(value) {
    if (Array.isArray(value)) {
        return value.some(item => hasDynamicTemplate(item));
    }
    if (value && typeof value === 'object') {
        return Object.values(value).some(item => hasDynamicTemplate(item));
    }
    return typeof value === 'string' && value.includes('$');
}

function resolveTemplateMode(savedType, value) {
    return savedType === 'expression' || hasDynamicTemplate(value) ? 'expression' : 'fixed';
}

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
    const [formWebhookUrlType, setFormWebhookUrlType] = useState('fixed'); // 'fixed' | 'expression'
    const [urlPreviewOutput, setUrlPreviewOutput] = useState('');
    const [formWebhookMethod, setFormWebhookMethod] = useState('POST');
    const [formWebhookHeaders, setFormWebhookHeaders] = useState([]); // Array of { key, value }
    const [formWebhookHeadersType, setFormWebhookHeadersType] = useState('fixed'); // 'fixed' | 'expression'
    const [headersPreviewOutput, setHeadersPreviewOutput] = useState('');
    const [headersPreviewRows, setHeadersPreviewRows] = useState([]);
    const [formWebhookBody, setFormWebhookBody] = useState('');
    const [formWebhookBodyType, setFormWebhookBodyType] = useState('fixed'); // 'fixed' | 'expression'
    const [formWebhookEnv, setFormWebhookEnv] = useState([]); // Array of { key, value }
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
    const [formRetryType, setFormRetryType] = useState('stable'); // 'stable' | 'exponential'
    const [formRetryCount, setFormRetryCount] = useState(3);
    const [formRetryDelay, setFormRetryDelay] = useState(60);

    // Visual Cron Builder States
    const [builderTab, setBuilderTab] = useState('simple'); // 'simple' | 'advanced'
    const [freqType, setFreqType] = useState('daily'); // 'minutes' | 'hourly' | 'daily' | 'weekly' | 'monthly'
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
        if (!cronStr) return { type: 'daily', minutes: '15', hour: '2', minute: '0', dow: '0', dom: '1', matchesSimple: true };
        const fields = cronStr.trim().split(/\s+/);
        if (fields.length !== 5) {
            return { type: 'daily', minutes: '15', hour: '2', minute: '0', dow: '0', dom: '1', matchesSimple: false };
        }

        const [min, hour, dom, month, dow] = fields;

        // 1. Every X minutes
        if (min.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
            const step = min.split('/')[1];
            return { type: 'minutes', minutes: step, hour: '2', minute: '0', dow: '0', dom: '1', matchesSimple: true };
        }

        // 2. Hourly
        if (hour === '*' && dom === '*' && month === '*' && dow === '*') {
            return { type: 'hourly', minutes: '15', hour: '2', minute: min, dow: '0', dom: '1', matchesSimple: true };
        }

        // 3. Daily
        if (dom === '*' && month === '*' && dow === '*') {
            if (!isNaN(hour) && !isNaN(min)) {
                return { type: 'daily', minutes: '15', hour, minute: min, dow: '0', dom: '1', matchesSimple: true };
            }
        }

        // 4. Weekly
        if (dom === '*' && month === '*') {
            if (!isNaN(dow) && !isNaN(hour) && !isNaN(min)) {
                return { type: 'weekly', minutes: '15', hour, minute: min, dow, dom: '1', matchesSimple: true };
            }
        }

        // 5. Monthly
        if (month === '*' && dow === '*') {
            if (!isNaN(dom) && !isNaN(hour) && !isNaN(min)) {
                return { type: 'monthly', minutes: '15', hour, minute: min, dow: '0', dom, matchesSimple: true };
            }
        }

        return { type: 'daily', minutes: '15', hour: '2', minute: '0', dow: '0', dom: '1', matchesSimple: false };
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

        const compiled = compileCronFromSimple(nextType, nextMinutes, nextHour, nextMinute, nextDow, nextDom);
        setFormSchedule(compiled);
    };

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

    const fetchNotificationStatus = async () => {
        try {
            const res = await fetch('/api/admin/notifications');
            const data = await res.json();
            if (data.success && data.data) {
                const config = data.data;
                const isLinked = config.enabled && (
                    (config.ntfy?.enabled && config.ntfy?.topic) ||
                    (config.telegram?.enabled && config.telegram?.botToken && config.telegram?.chatId) ||
                    (config.discord?.enabled && config.discord?.webhookUrl)
                );
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
                body: JSON.stringify({ env: globalEnvs.filter(ev => ev.key && ev.key.trim()) })
            });
            const data = await res.json();
            if (data.success) {
                setGlobalEnvs(data.data || []);
                showMessage('success', 'Global environment secrets updated successfully.');
                setShowGlobalEnvModal(false);
            } else {
                alert(data.error || 'Failed to save global environment secrets.');
            }
        } catch (error) {
            showMessage('error', 'Communication error while saving global secrets.');
        } finally {
            setGlobalEnvSubmitting(false);
        }
    };

    // Timezone settings states
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
                body: JSON.stringify({ timezone: newTimezone })
            });
            const data = await res.json();
            if (data.success) {
                setTimezone(data.timezone);
                showMessage('success', `Global scheduler timezone set to ${data.timezone}. Active job next run recalculated.`);
                fetchJobs(false);
            } else {
                showMessage('error', data.error || 'Failed to update timezone.');
            }
        } catch (error) {
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

        // Initialize builder states
        setBuilderTab('simple');
        setFreqType('daily');
        setFreqValHour('0');
        setFreqValMinute('0');

        // Initialize notification states
        setFormNotificationEnabled(false);
        setFormNotificationOn('always');

        // Initialize retry states
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
        setFormWebhookHeadersType(resolveTemplateMode(job.webhookHeadersType, job.webhookHeaders || []));
        setFormWebhookEnv(job.webhookEnv || []);
        setHeadersPreviewOutput('');
        setHeadersPreviewRows([]);
        setFormWebhookBody(job.webhookBody || '');
        setFormWebhookBodyType(resolveTemplateMode(job.webhookBodyType, job.webhookBody || ''));
        setPreviewOutput('');

        // Parse current schedule to set builder states
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

        // Initialize notification states
        setFormNotificationEnabled(job.notificationEnabled || false);
        setFormNotificationOn(job.notificationOn || 'always');

        // Initialize retry states
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
            webhookHeaders: formWebhookHeaders.filter(h => h.key && h.key.trim()),
            webhookHeadersType: resolveTemplateMode(formWebhookHeadersType, formWebhookHeaders),
            webhookBody: formWebhookBody,
            webhookBodyType: resolveTemplateMode(formWebhookBodyType, formWebhookBody),
            webhookEnv: formWebhookEnv.filter(e => e.key && e.key.trim()),
            notificationEnabled: formNotificationEnabled,
            notificationOn: formNotificationOn,
            retryEnabled: formRetryEnabled,
            retryType: formRetryType,
            retryCount: formRetryCount,
            retryDelay: formRetryDelay
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

    // Debounced automatic template compiler for dynamic variables preview (same as n8n)
    useEffect(() => {
        if (!showFormModal || formWebhookBodyType !== 'expression' || !formWebhookBody.trim() || formWebhookMethod !== 'POST') {
            setPreviewOutput('');
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setPreviewLoading(true);
            try {
                const res = await fetch('/api/admin/crons/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ template: formWebhookBody.trim() })
                });
                const data = await res.json();
                if (data.success) {
                    setPreviewOutput(data.data);
                } else {
                    setPreviewOutput(`Evaluation Error: ${data.error}`);
                }
            } catch (err) {
                setPreviewOutput('Failed to evaluate dynamic preview.');
            } finally {
                setPreviewLoading(false);
            }
        }, 600); // 600ms debounce

        return () => clearTimeout(delayDebounceFn);
    }, [formWebhookBody, formWebhookBodyType, formWebhookMethod, showFormModal]);

    const triggerPreviewUpdate = async () => {
        if (!formWebhookBody.trim()) return;
        setPreviewLoading(true);
        try {
            const res = await fetch('/api/admin/crons/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template: formWebhookBody.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setPreviewOutput(data.data);
            } else {
                setPreviewOutput(`Evaluation Error: ${data.error}`);
            }
        } catch (err) {
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

        const delayDebounceFn = setTimeout(async () => {
            setPreviewLoading(true);
            try {
                const res = await fetch('/api/admin/crons/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ template: formWebhookUrl.trim() })
                });
                const data = await res.json();
                if (data.success) {
                    setUrlPreviewOutput(data.data);
                } else {
                    setUrlPreviewOutput(`Evaluation Error: ${data.error}`);
                }
            } catch (err) {
                setUrlPreviewOutput('Failed to evaluate dynamic preview.');
            } finally {
                setPreviewLoading(false);
            }
        }, 600);

        return () => clearTimeout(delayDebounceFn);
    }, [formWebhookUrl, formWebhookUrlType, showFormModal]);

    const triggerUrlPreviewUpdate = async () => {
        if (!formWebhookUrl.trim()) return;
        setPreviewLoading(true);
        try {
            const res = await fetch('/api/admin/crons/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template: formWebhookUrl.trim() })
            });
            const data = await res.json();
            if (data.success) {
                setUrlPreviewOutput(data.data);
            } else {
                setUrlPreviewOutput(`Evaluation Error: ${data.error}`);
            }
        } catch (err) {
            setUrlPreviewOutput('Failed to evaluate dynamic preview.');
        } finally {
            setPreviewLoading(false);
        }
    };

    // Debounced automatic template compiler for custom headers preview
    useEffect(() => {
        if (!showFormModal || formWebhookHeadersType !== 'expression' || formWebhookHeaders.length === 0) {
            setHeadersPreviewOutput('');
            setHeadersPreviewRows([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setPreviewLoading(true);
            try {
                const headerRows = formWebhookHeaders.map((h, index) => ({
                    index: index + 1,
                    key: h.key || '',
                    value: h.value || ''
                }));

                const res = await fetch('/api/admin/crons/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ template: headerRows })
                });
                const data = await res.json();
                if (data.success) {
                    setHeadersPreviewRows(JSON.parse(data.data));
                    setHeadersPreviewOutput('');
                } else {
                    setHeadersPreviewRows([]);
                    setHeadersPreviewOutput(`Evaluation Error: ${data.error}`);
                }
            } catch (err) {
                setHeadersPreviewRows([]);
                setHeadersPreviewOutput('Failed to evaluate dynamic preview.');
            } finally {
                setPreviewLoading(false);
            }
        }, 600); // 600ms debounce

        return () => clearTimeout(delayDebounceFn);
    }, [formWebhookHeaders, formWebhookHeadersType, showFormModal]);

    const triggerHeadersPreviewUpdate = async () => {
        if (formWebhookHeaders.length === 0) return;
        setPreviewLoading(true);
        try {
            const headerRows = formWebhookHeaders.map((h, index) => ({
                index: index + 1,
                key: h.key || '',
                value: h.value || ''
            }));

            const res = await fetch('/api/admin/crons/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ template: headerRows })
            });
            const data = await res.json();
            if (data.success) {
                setHeadersPreviewRows(JSON.parse(data.data));
                setHeadersPreviewOutput('');
            } else {
                setHeadersPreviewRows([]);
                setHeadersPreviewOutput(`Evaluation Error: ${data.error}`);
            }
        } catch (err) {
            setHeadersPreviewRows([]);
            setHeadersPreviewOutput('Failed to evaluate dynamic preview.');
        } finally {
            setPreviewLoading(false);
        }
    };

    const systemJobs = jobs.filter(j => j.type === 'system');
    const userJobs = jobs.filter(j => j.type === 'user');
    const activeCount = jobs.filter(j => j.enabled).length;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen text-slate-200">
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
                    <div className="flex gap-3 flex-wrap">
                        {/* Timezone Configuration */}
                        <div className="relative inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/50 px-3.5 py-2 text-sm font-semibold text-slate-300 hover:border-cyan-500/20 transition-all focus-within:ring-1 focus-within:ring-cyan-500">
                            <Globe size={15} className="text-cyan-400 shrink-0" />
                            <select
                                value={timezone}
                                onChange={(e) => handleTimezoneChange(e.target.value)}
                                disabled={timezoneSaving}
                                className="bg-transparent text-xs font-mono font-bold text-slate-300 uppercase tracking-wider cursor-pointer pr-5 focus:outline-none disabled:opacity-50 appearance-none"
                            >
                                <option value="UTC" className="bg-slate-950 text-slate-300 py-1">UTC (GMT+00:00)</option>
                                <option value="Asia/Kolkata" className="bg-slate-950 text-slate-300 py-1">Kolkata (GMT+05:30)</option>
                                <option value="Asia/Singapore" className="bg-slate-950 text-slate-300 py-1">Singapore (GMT+08:00)</option>
                                <option value="Asia/Tokyo" className="bg-slate-950 text-slate-300 py-1">Tokyo (GMT+09:00)</option>
                                <option value="Asia/Dubai" className="bg-slate-950 text-slate-300 py-1">Dubai (GMT+04:00)</option>
                                <option value="Europe/London" className="bg-slate-950 text-slate-300 py-1">London (GMT+00:00)</option>
                                <option value="Europe/Paris" className="bg-slate-950 text-slate-300 py-1">Paris (GMT+01:00)</option>
                                <option value="Europe/Moscow" className="bg-slate-950 text-slate-300 py-1">Moscow (GMT+03:00)</option>
                                <option value="America/New_York" className="bg-slate-950 text-slate-300 py-1">New York (GMT-05:00)</option>
                                <option value="America/Chicago" className="bg-slate-950 text-slate-300 py-1">Chicago (GMT-06:00)</option>
                                <option value="America/Denver" className="bg-slate-950 text-slate-300 py-1">Denver (GMT-07:00)</option>
                                <option value="America/Los_Angeles" className="bg-slate-950 text-slate-300 py-1">Los Angeles (GMT-08:00)</option>
                                <option value="Australia/Sydney" className="bg-slate-950 text-slate-300 py-1">Sydney (GMT+10:00)</option>
                            </select>
                            <div className="absolute right-3 pointer-events-none text-slate-500">
                                {timezoneSaving ? (
                                    <RefreshCw size={12} className="animate-spin text-cyan-400" />
                                ) : (
                                    <ChevronDown size={12} />
                                )}
                            </div>
                        </div>

                        <Link
                            href="/admin/config/crons/logs"
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-4 py-2 text-sm font-semibold text-cyan-400 transition hover:border-cyan-500/30 hover:bg-cyan-500/10"
                        >
                            <Eye size={16} />
                            Logs
                        </Link>
                        <button
                            onClick={() => fetchJobs(false)}
                            disabled={refreshing}
                            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-400/40 hover:text-white disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                            Refresh Tasks
                        </button>
                        <button
                            onClick={openGlobalEnvModal}
                            className="inline-flex items-center gap-2 rounded-xl border border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/10 px-4 py-2 text-sm font-semibold text-pink-400 transition hover:border-pink-500/30"
                        >
                            <Lock size={16} />
                            Global Envs
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

                                        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs font-mono">
                                            <div>
                                                <span className="text-slate-500 block">Cron Interval</span>
                                                <div className="flex flex-col">
                                                    <span className="text-slate-300 font-bold">{job.schedule}</span>
                                                    <span className="text-[10px] text-cyan-400 font-sans mt-0.5 font-semibold leading-tight">{cronToHuman(job.schedule)}</span>
                                                </div>
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
                                            <div className="col-span-2 flex items-center gap-2 mt-0.5">
                                                <span className="text-slate-500">Retry Policy:</span>
                                                {job.retryEnabled ? (
                                                    <span className="text-slate-300 font-medium">
                                                        {job.retryType === 'stable' ? 'Stable' : 'Exponential'} ({job.retryCount}x retries, {job.retryDelay}s delay)
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 italic">Off</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-6 flex justify-end gap-2.5 border-t border-white/5 pt-4">
                                        <Link
                                            href={`/admin/config/crons/logs?cronId=${job._id}`}
                                            className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5"
                                        >
                                            <Eye size={12} />
                                            View Logs
                                        </Link>
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
                                                {job.webhookHeaders && job.webhookHeaders.length > 0 && (
                                                    <div className="flex items-start gap-2 pt-1 border-t border-white/5 mt-1 overflow-hidden">
                                                        <span className="text-slate-500 shrink-0">Headers:</span>
                                                        <span className="text-cyan-400 truncate flex-1 hover:text-cyan-300 text-left block" title={job.webhookHeaders.map(h => `${h.key}: ${h.value}`).join('\n')}>
                                                            {job.webhookHeaders.map(h => h.key).join(', ')}
                                                        </span>
                                                    </div>
                                                )}

                                                {job.webhookBody && (
                                                    <div className="flex items-start gap-2 pt-1 border-t border-white/5 mt-1 overflow-hidden">
                                                        <span className="text-slate-500 shrink-0">Payload:</span>
                                                        <span className="text-emerald-400 truncate flex-1 hover:text-emerald-300 text-left block font-mono text-[10px]" title={job.webhookBody}>
                                                            {job.webhookBody.length > 30 ? job.webhookBody.slice(0, 30) + '...' : job.webhookBody}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-5 grid grid-cols-2 gap-4 border-t border-white/5 pt-4 text-xs font-mono">
                                                <div>
                                                    <span className="text-slate-500 block">Cron Interval</span>
                                                    <div className="flex flex-col">
                                                        <span className="text-slate-300 font-bold">{job.schedule}</span>
                                                        <span className="text-[10px] text-pink-400 font-sans mt-0.5 font-semibold leading-tight">{cronToHuman(job.schedule)}</span>
                                                    </div>
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
                                                <div className="col-span-2 flex items-center gap-2 mt-0.5">
                                                    <span className="text-slate-500">Retry Policy:</span>
                                                    {job.retryEnabled ? (
                                                        <span className="text-slate-300 font-medium">
                                                            {job.retryType === 'stable' ? 'Stable' : 'Exponential'} ({job.retryCount}x retries, {job.retryDelay}s delay)
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-500 italic">Off</span>
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
                                                <Link
                                                    href={`/admin/config/crons/logs?cronId=${job._id}`}
                                                    className="px-3.5 py-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5"
                                                >
                                                    <Eye size={12} />
                                                    Logs
                                                </Link>
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

            {/* TASK REFERENCE & DYNAMIC VARIABLES HELP GUIDE */}
            <div className="mt-12 border border-white/10 bg-slate-900/40 rounded-3xl p-6 backdrop-blur-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-[60px] pointer-events-none" />
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
                        <Terminal size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Dynamic Variables & Webhook Documentation</h2>
                        <p className="text-xs text-slate-400">Configure templated webhooks to trigger remote services with live site data.</p>
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2 text-xs leading-relaxed text-slate-400">
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-slate-200 text-sm mb-1.5 uppercase tracking-wide">💡 Templating Engine Basics</h3>
                            <p>You can reference live site data and system properties using the prefix <code>$</code>. These placeholders will be evaluated dynamically at execution time and can be used in your <strong>Webhook URL</strong>, <strong>HTTP Headers</strong>, and <strong>Request Body</strong>.</p>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-200 text-sm mb-1.5 uppercase tracking-wide">⏱️ Time & Date Variables</h3>
                            <ul className="list-disc pl-4 space-y-1.5 font-mono text-[11px]">
                                <li><span className="text-cyan-400">$time</span> - Current ISO-8601 Timestamp</li>
                                <li><span className="text-cyan-400">$timestamp</span> - Same as $time</li>
                                <li><span className="text-cyan-400">$date</span> - Locale-specific current date</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-200 text-sm mb-1.5 uppercase tracking-wide">🔒 Secure Env Variables</h3>
                            <p className="mb-1">Access custom environment secrets defined in the task configuration. Secrets are stored securely with AES-256 encryption.</p>
                            <ul className="list-disc pl-4 space-y-1.5 font-mono text-[11px]">
                                <li><span className="text-cyan-400">$env.KEY_NAME</span> - Decrypted secret value at runtime</li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-200 text-sm mb-1.5 uppercase tracking-wide">🌐 Predefined System Variables</h3>
                            <ul className="list-disc pl-4 space-y-1.5 font-mono text-[11px]">
                                <li><span className="text-cyan-400">$site</span> - Base URL of the website</li>
                                <li><span className="text-cyan-400">$device</span> - Full device metadata object</li>
                                <li><span className="text-cyan-400">$device.platform</span> - OS Platform (e.g. linux, win32)</li>
                                <li><span className="text-cyan-400">$device.os</span> - Operating System details</li>
                            </ul>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <h3 className="font-bold text-slate-200 text-sm mb-1.5 uppercase tracking-wide">📁 Supported Site Data Models</h3>
                            <p>Query any collection dynamically. Use standard array index <code>[0]</code> or dot <code>.0</code> notation to retrieve nested child properties:</p>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] font-mono">
                                <div>• <span className="text-pink-400">$blogs</span> (or $blog)</div>
                                <div>• <span className="text-pink-400">$projects</span> (or $project)</div>
                                <div>• <span className="text-pink-400">$gallery</span></div>
                                <div>• <span className="text-pink-400">$config</span></div>
                                <div>• <span className="text-pink-400">$about</span></div>
                                <div>• <span className="text-pink-400">$ads</span></div>
                                <div>• <span className="text-pink-400">$socials</span> (or $social)</div>
                                <div>• <span className="text-pink-400">$theme</span> (or $themes)</div>
                                <div>• <span className="text-pink-400">$messages</span> (or $message)</div>
                                <div>• <span className="text-pink-400">$deployments</span></div>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-200 text-sm mb-1.5 uppercase tracking-wide">🔗 Real-World Example</h3>
                            <p className="mb-2">Send a POST dispatch payload with your site's most recent blog post title:</p>
                            <pre className="bg-slate-950 border border-white/5 p-3 rounded-xl font-mono text-[10px] text-emerald-400">
{`{
  "post_title": "$blogs[0].title",
  "publish_date": "$blogs.0.createdAt",
  "action_time": "$time"
}`}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>

            {/* CREATE / EDIT DIALOG MODAL */}
            {showFormModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4 shrink-0">
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

                        <form onSubmit={handleFormSubmit} className="flex flex-col flex-1 overflow-hidden space-y-4 text-left">
                            <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
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
                            <div className="space-y-4">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Task Schedule Configuration</label>
                                
                                {/* Builder Tabs */}
                                <div className="flex rounded-xl bg-slate-950 p-1 border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setBuilderTab('simple');
                                            const compiled = compileCronFromSimple(freqType, freqValMinutes, freqValHour, freqValMinute, freqValDow, freqValDom);
                                            setFormSchedule(compiled);
                                        }}
                                        className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all duration-200 ${builderTab === 'simple' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-md font-bold' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Simple Builder
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setBuilderTab('advanced')}
                                        className={`flex-1 text-center py-2 rounded-lg text-xs font-semibold font-mono tracking-wider transition-all duration-200 ${builderTab === 'advanced' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-md font-bold' : 'text-slate-400 hover:text-white'}`}
                                    >
                                        Advanced (Cron)
                                    </button>
                                </div>

                                {/* Simple Builder Mode */}
                                {builderTab === 'simple' && (
                                    <div className="space-y-4 bg-slate-950/20 border border-white/5 rounded-2xl p-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Execute Frequency</label>
                                            <select
                                                value={freqType}
                                                onChange={(e) => handleSimpleChange('type', e.target.value)}
                                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition"
                                            >
                                                <option value="minutes">Every X Minutes</option>
                                                <option value="hourly">Hourly (Once an Hour)</option>
                                                <option value="daily">Daily (Once a Day)</option>
                                                <option value="weekly">Weekly (Once a Week)</option>
                                                <option value="monthly">Monthly (Once a Month)</option>
                                            </select>
                                        </div>

                                        {/* Frequency details based on freqType */}
                                        {freqType === 'minutes' && (
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Minutes Interval</label>
                                                <select
                                                    value={freqValMinutes}
                                                    onChange={(e) => handleSimpleChange('minutes', e.target.value)}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition"
                                                >
                                                    <option value="1">Every 1 Minute</option>
                                                    <option value="5">Every 5 Minutes</option>
                                                    <option value="10">Every 10 Minutes</option>
                                                    <option value="15">Every 15 Minutes</option>
                                                    <option value="30">Every 30 Minutes</option>
                                                    <option value="45">Every 45 Minutes</option>
                                                </select>
                                            </div>
                                        )}

                                        {freqType === 'hourly' && (
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">At Minute of the Hour</label>
                                                <select
                                                    value={freqValMinute}
                                                    onChange={(e) => handleSimpleChange('minute', e.target.value)}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition font-mono"
                                                >
                                                    {Array.from({ length: 60 }, (_, i) => (
                                                        <option key={i} value={i}>Minute {i.toString().padStart(2, '0')}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {freqType === 'daily' && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Hour (24h)</label>
                                                    <select
                                                        value={freqValHour}
                                                        onChange={(e) => handleSimpleChange('hour', e.target.value)}
                                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition font-mono"
                                                    >
                                                        {Array.from({ length: 24 }, (_, i) => {
                                                            const ampm = i >= 12 ? 'PM' : 'AM';
                                                            const displayHour = i % 12 === 0 ? 12 : i % 12;
                                                            return (
                                                                <option key={i} value={i}>{i.toString().padStart(2, '0')} : 00 ({displayHour} {ampm})</option>
                                                            );
                                                        })}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Minute</label>
                                                    <select
                                                        value={freqValMinute}
                                                        onChange={(e) => handleSimpleChange('minute', e.target.value)}
                                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition font-mono"
                                                    >
                                                        {Array.from({ length: 60 }, (_, i) => (
                                                            <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        {freqType === 'weekly' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Day of Week</label>
                                                    <select
                                                        value={freqValDow}
                                                        onChange={(e) => handleSimpleChange('dow', e.target.value)}
                                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition"
                                                    >
                                                        <option value="0">Sunday</option>
                                                        <option value="1">Monday</option>
                                                        <option value="2">Tuesday</option>
                                                        <option value="3">Wednesday</option>
                                                        <option value="4">Thursday</option>
                                                        <option value="5">Friday</option>
                                                        <option value="6">Saturday</option>
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Hour (24h)</label>
                                                        <select
                                                            value={freqValHour}
                                                            onChange={(e) => handleSimpleChange('hour', e.target.value)}
                                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition font-mono"
                                                        >
                                                            {Array.from({ length: 24 }, (_, i) => {
                                                                const ampm = i >= 12 ? 'PM' : 'AM';
                                                                const displayHour = i % 12 === 0 ? 12 : i % 12;
                                                                return (
                                                                    <option key={i} value={i}>{i.toString().padStart(2, '0')} : 00 ({displayHour} {ampm})</option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Minute</label>
                                                        <select
                                                            value={freqValMinute}
                                                            onChange={(e) => handleSimpleChange('minute', e.target.value)}
                                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition font-mono"
                                                        >
                                                            {Array.from({ length: 60 }, (_, i) => (
                                                                <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {freqType === 'monthly' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Day of Month</label>
                                                    <select
                                                        value={freqValDom}
                                                        onChange={(e) => handleSimpleChange('dom', e.target.value)}
                                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition font-mono"
                                                    >
                                                        {Array.from({ length: 31 }, (_, i) => (
                                                            <option key={i + 1} value={i + 1}>Day {i + 1}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Hour (24h)</label>
                                                        <select
                                                            value={freqValHour}
                                                            onChange={(e) => handleSimpleChange('hour', e.target.value)}
                                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition font-mono"
                                                        >
                                                            {Array.from({ length: 24 }, (_, i) => {
                                                                const ampm = i >= 12 ? 'PM' : 'AM';
                                                                const displayHour = i % 12 === 0 ? 12 : i % 12;
                                                                return (
                                                                    <option key={i} value={i}>{i.toString().padStart(2, '0')} : 00 ({displayHour} {ampm})</option>
                                                                );
                                                            })}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Minute</label>
                                                        <select
                                                            value={freqValMinute}
                                                            onChange={(e) => handleSimpleChange('minute', e.target.value)}
                                                            className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 outline-none transition font-mono"
                                                        >
                                                            {Array.from({ length: 60 }, (_, i) => (
                                                                <option key={i} value={i}>{i.toString().padStart(2, '0')}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Advanced Cron Mode */}
                                {builderTab === 'advanced' && (
                                    <div className="space-y-4 bg-slate-950/20 border border-white/5 rounded-2xl p-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Cron Expression (5 Fields)</label>
                                            <input
                                                type="text"
                                                required
                                                value={formSchedule}
                                                onChange={(e) => setFormSchedule(e.target.value)}
                                                className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:border-cyan-500 font-mono outline-none transition"
                                                placeholder="* * * * *"
                                            />
                                        </div>
                                        {/* Presets */}
                                        <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 text-[11px] text-slate-500 font-mono space-y-1">
                                            <div className="text-slate-400 font-bold uppercase tracking-wider mb-1">Common Presets:</div>
                                            <div className="grid grid-cols-2 gap-2 mt-1">
                                                <button type="button" onClick={() => setFormSchedule('*/5 * * * *')} className="px-2.5 py-1 bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/20 text-cyan-400 hover:text-cyan-300 rounded text-left transition truncate">• Every 5 min</button>
                                                <button type="button" onClick={() => setFormSchedule('0 * * * *')} className="px-2.5 py-1 bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/20 text-cyan-400 hover:text-cyan-300 rounded text-left transition truncate">• Every hour</button>
                                                <button type="button" onClick={() => setFormSchedule('0 0 * * *')} className="px-2.5 py-1 bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/20 text-cyan-400 hover:text-cyan-300 rounded text-left transition truncate">• Daily at midnight</button>
                                                <button type="button" onClick={() => setFormSchedule('0 0 * * 0')} className="px-2.5 py-1 bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/20 text-cyan-400 hover:text-cyan-300 rounded text-left transition truncate">• Weekly on Sunday</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Realtime Human Explanation Banner */}
                                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 transition-all duration-300">
                                    <Clock size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                                    <div>
                                        <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold mb-0.5">Execution Summary</div>
                                        <div className="text-sm font-semibold text-white leading-relaxed">
                                            {cronToHuman(formSchedule)}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                                            Compiled Expression: <span className="text-cyan-400 font-bold">{formSchedule}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Webhook Settings (User defined only) */}
                            {(!editingJob || editingJob.type === 'user') && (
                                <div className="space-y-4 border-t border-white/5 pt-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Webhook URL</label>

                                            {/* Tabs Selector: Fixed vs Expression */}
                                            <div className="flex rounded-lg bg-slate-950 p-0.5 border border-white/5 shrink-0 select-none">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormWebhookUrlType('fixed')}
                                                    className={`px-3 py-1 rounded-md text-[10px] font-mono tracking-wider transition-all ${formWebhookUrlType === 'fixed' ? 'bg-white/10 text-white font-bold border border-white/10 shadow-sm' : 'text-slate-500 hover:text-slate-350'}`}
                                                >
                                                    Fixed
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormWebhookUrlType('expression')}
                                                    className={`px-3 py-1 rounded-md text-[10px] font-mono tracking-wider transition-all ${formWebhookUrlType === 'expression' ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 shadow-sm' : 'text-slate-500 hover:text-slate-355'}`}
                                                >
                                                    Expression
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type={formWebhookUrlType === 'expression' ? 'text' : 'url'}
                                            required
                                            value={formWebhookUrl}
                                            onChange={(e) => setFormWebhookUrl(e.target.value)}
                                            className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none transition ${formWebhookUrlType === 'expression' ? 'border-cyan-500/30 focus:border-cyan-500' : 'border-white/10 focus:border-slate-500'}`}
                                            placeholder={formWebhookUrlType === 'expression' ? 'https://example.com/api/$projects[0]._id' : 'https://example.com/api/tasks'}
                                        />
                                        {formWebhookUrlType === 'expression' && formWebhookUrl.trim() && (
                                            <div className="border border-cyan-500/10 bg-cyan-950/10 rounded-2xl p-4 mt-3 space-y-2">
                                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">⚡ URL Preview (Evaluated)</span>
                                                    <button
                                                        type="button"
                                                        onClick={triggerUrlPreviewUpdate}
                                                        disabled={previewLoading}
                                                        className="text-[9px] text-slate-500 hover:text-cyan-400 transition"
                                                    >
                                                        {previewLoading ? 'Compiling...' : 'Force Refresh'}
                                                    </button>
                                                </div>
                                                <pre className="bg-slate-950 border border-white/5 p-3 rounded-xl font-mono text-[10px] text-cyan-300 overflow-x-auto max-h-36 whitespace-pre-wrap select-all text-left font-semibold">
                                                    {urlPreviewOutput || 'Type variables in the webhook URL to see live dynamic evaluation preview...'}
                                                </pre>
                                            </div>
                                        )}
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

                                    {/* Custom Headers Section */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Custom HTTP Headers</label>
                                            
                                            <div className="flex items-center gap-3">
                                                {/* Tabs Selector: Fixed vs Expression */}
                                                <div className="flex rounded-lg bg-slate-950 p-0.5 border border-white/5 shrink-0 select-none">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormWebhookHeadersType('fixed')}
                                                        className={`px-3 py-1 rounded-md text-[10px] font-mono tracking-wider transition-all ${formWebhookHeadersType === 'fixed' ? 'bg-white/10 text-white font-bold border border-white/10 shadow-sm' : 'text-slate-500 hover:text-slate-350'}`}
                                                    >
                                                        Fixed
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormWebhookHeadersType('expression')}
                                                        className={`px-3 py-1 rounded-md text-[10px] font-mono tracking-wider transition-all ${formWebhookHeadersType === 'expression' ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 shadow-sm' : 'text-slate-500 hover:text-slate-355'}`}
                                                    >
                                                        Expression
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => setFormWebhookHeaders([...formWebhookHeaders, { key: '', value: '' }])}
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                                                >
                                                    <Plus size={12} /> Add Header
                                                </button>
                                            </div>
                                        </div>
                                        
                                        {formWebhookHeaders.length === 0 ? (
                                            <div className="text-[11px] text-slate-500 italic bg-slate-950/20 border border-white/5 rounded-xl p-3 text-center">
                                                No custom headers added. Requests will send default headers.
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                                {formWebhookHeaders.map((header, index) => (
                                                    <div key={index} className="flex gap-2 items-center">
                                                        <input
                                                            type="text"
                                                            placeholder="Header-Name"
                                                            value={header.key}
                                                            onChange={(e) => {
                                                                const newHeaders = [...formWebhookHeaders];
                                                                newHeaders[index].key = e.target.value;
                                                                setFormWebhookHeaders(newHeaders);
                                                            }}
                                                            className={`flex-1 bg-slate-950 border rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition ${formWebhookHeadersType === 'expression' ? 'border-cyan-500/20 focus:border-cyan-500' : 'border-white/10 focus:border-slate-500'}`}
                                                        />
                                                        <input
                                                            type="text"
                                                            placeholder="value"
                                                            value={header.value}
                                                            onChange={(e) => {
                                                                const newHeaders = [...formWebhookHeaders];
                                                                newHeaders[index].value = e.target.value;
                                                                setFormWebhookHeaders(newHeaders);
                                                            }}
                                                            className={`flex-1 bg-slate-950 border rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none transition ${formWebhookHeadersType === 'expression' ? 'border-cyan-500/20 focus:border-cyan-500' : 'border-white/10 focus:border-slate-500'}`}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setFormWebhookHeaders(formWebhookHeaders.filter((_, i) => i !== index));
                                                            }}
                                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                                                            title="Remove Header"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Dynamic Expression Demo Preview Tab for Headers */}
                                        {formWebhookHeadersType === 'expression' && formWebhookHeaders.length > 0 && (
                                            <div className="border border-cyan-500/10 bg-cyan-950/10 rounded-2xl p-4 mt-2 space-y-2">
                                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">⚡ Headers Preview (Evaluated)</span>
                                                    <button
                                                        type="button"
                                                        onClick={triggerHeadersPreviewUpdate}
                                                        disabled={previewLoading}
                                                        className="text-[9px] text-slate-500 hover:text-cyan-400 transition"
                                                    >
                                                        {previewLoading ? 'Compiling...' : 'Force Refresh'}
                                                    </button>
                                                </div>
                                                {headersPreviewOutput ? (
                                                    <pre className="bg-slate-950 border border-white/5 p-3 rounded-xl font-mono text-[10px] text-cyan-300 overflow-x-auto max-h-36 whitespace-pre-wrap select-all text-left font-semibold">
                                                        {headersPreviewOutput}
                                                    </pre>
                                                ) : (
                                                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                                                        {formWebhookHeaders.map((header, index) => {
                                                            const preview = headersPreviewRows[index] || { key: header.key || '', value: header.value || '' };
                                                            return (
                                                                <div key={`header-preview-${index}`} className="bg-slate-950 border border-white/5 rounded-xl p-3 space-y-2">
                                                                    <div className="flex items-center justify-between gap-3">
                                                                        <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Header {index + 1}</span>
                                                                        <span className="text-[9px] text-slate-600 font-mono truncate">{header.key || 'Header-Name'}</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] gap-2 font-mono text-[10px]">
                                                                        <div className="min-w-0">
                                                                            <span className="block text-slate-500 uppercase tracking-widest text-[8px] mb-1">Name</span>
                                                                            <code className="block text-cyan-300 truncate">{formatPreviewValue(preview.key)}</code>
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <span className="block text-slate-500 uppercase tracking-widest text-[8px] mb-1">Value</span>
                                                                            <code className="block text-cyan-300 truncate">{formatPreviewValue(preview.value)}</code>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {formWebhookMethod === 'POST' && (
                                        <div className="space-y-3 pt-2">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Custom HTTP Request Body</label>
                                                
                                                {/* Tabs Selector: Fixed vs Expression */}
                                                <div className="flex rounded-lg bg-slate-950 p-0.5 border border-white/5 shrink-0 select-none">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormWebhookBodyType('fixed')}
                                                        className={`px-3 py-1 rounded-md text-[10px] font-mono tracking-wider transition-all ${formWebhookBodyType === 'fixed' ? 'bg-white/10 text-white font-bold border border-white/10 shadow-sm' : 'text-slate-500 hover:text-slate-350'}`}
                                                    >
                                                        Fixed
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormWebhookBodyType('expression')}
                                                        className={`px-3 py-1 rounded-md text-[10px] font-mono tracking-wider transition-all ${formWebhookBodyType === 'expression' ? 'bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20 shadow-sm' : 'text-slate-500 hover:text-slate-355'}`}
                                                    >
                                                        Expression
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Textarea Input with code-like style */}
                                            <div className="relative">
                                                <textarea
                                                    value={formWebhookBody}
                                                    onChange={(e) => setFormWebhookBody(e.target.value)}
                                                    className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-xs font-mono text-slate-200 focus:outline-none transition min-h-[120px] ${formWebhookBodyType === 'expression' ? 'border-cyan-500/30 focus:border-cyan-500' : 'border-white/10 focus:border-slate-500'}`}
                                                    placeholder={formWebhookBodyType === 'expression' ? 'e.g. {"title": "$blogs[0].title", "run_time": "$time"}' : 'e.g. {"status": "active"}'}
                                                />
                                                {formWebhookBodyType === 'expression' && (
                                                    <div className="absolute right-3 bottom-3 inline-flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 rounded px-2 py-0.5 text-[9px] text-cyan-400 font-mono select-none">
                                                        Expression Mode
                                                    </div>
                                                )}
                                            </div>

                                            {/* Dynamic Expression Demo Preview Tab below (n8n style) */}
                                            {formWebhookBodyType === 'expression' && formWebhookBody.trim() && (
                                                <div className="border border-cyan-500/10 bg-cyan-950/10 rounded-2xl p-4 mt-2 space-y-2">
                                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest block">⚡ Expression Preview (Evaluated)</span>
                                                        <button
                                                            type="button"
                                                            onClick={triggerPreviewUpdate}
                                                            disabled={previewLoading}
                                                            className="text-[9px] text-slate-500 hover:text-cyan-400 transition"
                                                        >
                                                            {previewLoading ? 'Compiling...' : 'Force Refresh'}
                                                        </button>
                                                    </div>
                                                    <pre className="bg-slate-950 border border-white/5 p-3 rounded-xl font-mono text-[10px] text-cyan-300 overflow-x-auto max-h-36 whitespace-pre-wrap select-all text-left font-semibold">
                                                        {previewOutput || 'Type variables to see live dynamic evaluation preview...'}
                                                    </pre>
                                                </div>
                                            )}

                                            <span className="text-[10px] text-slate-500 leading-tight block">
                                                Supports dynamic variable injection. Use singular/plural forms like <code>$blogs</code>, <code>$projects</code>, or <code>$time</code>.
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}



                            {/* Notification Integrations Link Section */}
                            <div className="space-y-4 border-t border-white/5 pt-4">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Dispatch Notifications</label>
                                
                                {notificationConfigured ? (
                                    <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div className="space-y-0.5">
                                                <div className="text-xs font-bold text-white">Enable Task Notifications</div>
                                                <div className="text-[10px] text-slate-400">Send alerts to configured Discord, Telegram, or ntfy topics.</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setFormNotificationEnabled(!formNotificationEnabled)}
                                                className="text-slate-400 hover:text-white transition shrink-0"
                                            >
                                                {formNotificationEnabled ? (
                                                    <ToggleRight className="w-9 h-9 text-emerald-400" />
                                                ) : (
                                                    <ToggleLeft className="w-9 h-9 text-slate-600" />
                                                )}
                                            </button>
                                        </div>

                                        {formNotificationEnabled && (
                                            <div className="space-y-2 border-t border-white/5 pt-3">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Alert Trigger Event</label>
                                                <select
                                                    value={formNotificationOn}
                                                    onChange={(e) => setFormNotificationOn(e.target.value)}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:border-cyan-500 outline-none transition"
                                                >
                                                    <option value="always">Always (Notify on Success or Failure)</option>
                                                    <option value="success">On Success Only</option>
                                                    <option value="failure">On Failure Only</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-4">
                                        <div className="flex items-start gap-3">
                                            <ShieldAlert size={16} className="text-amber-400 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <h4 className="text-xs font-bold text-amber-400">Gateway Not Configured</h4>
                                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                                    Telegram, Discord, and ntfy push integrations are currently disabled. Configure your gateway to enable live task alerts.
                                                </p>
                                                <Link
                                                    href="/admin/config/notification"
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold mt-1"
                                                >
                                                    Configure Notification Channels →
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Retry Mechanism */}
                            <div className="space-y-4 border-t border-white/5 pt-4">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Retry Mechanism</label>
                                
                                <div className="bg-slate-950/20 border border-white/5 rounded-2xl p-4 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="space-y-0.5">
                                            <div className="text-xs font-bold text-white">Enable Task Retries</div>
                                            <div className="text-[10px] text-slate-400">Automatically retry the task if it fails or returns a non-ok status. Off by default.</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormRetryEnabled(!formRetryEnabled)}
                                            className="text-slate-400 hover:text-white transition shrink-0"
                                        >
                                            {formRetryEnabled ? (
                                                <ToggleRight className="w-9 h-9 text-emerald-400" />
                                            ) : (
                                                <ToggleLeft className="w-9 h-9 text-slate-600" />
                                            )}
                                        </button>
                                    </div>

                                    {formRetryEnabled && (
                                        <div className="space-y-4 border-t border-white/5 pt-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Retry Backoff Policy</label>
                                                <select
                                                    value={formRetryType}
                                                    onChange={(e) => setFormRetryType(e.target.value)}
                                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:border-cyan-500 outline-none transition"
                                                >
                                                    <option value="stable">Stable Backoff (Equal delay between attempts)</option>
                                                    <option value="exponential">Exponential Backoff (Delay doubles after each failure)</option>
                                                </select>
                                                <p className="text-[9px] text-slate-500 mt-1 font-mono leading-tight">
                                                    {formRetryType === 'stable' 
                                                        ? `Stable: Task will retry every ${formRetryDelay}s.` 
                                                        : `Exponential: Retry delay doubles each time (e.g. ${formRetryDelay}s, ${formRetryDelay * 2}s, ${formRetryDelay * 4}s...).`
                                                    }
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Max Retries</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="10"
                                                        value={formRetryCount}
                                                        onChange={(e) => setFormRetryCount(parseInt(e.target.value, 10) || 3)}
                                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 focus:border-cyan-500 outline-none transition"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Base Delay (seconds)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="3600"
                                                        value={formRetryDelay}
                                                        onChange={(e) => setFormRetryDelay(parseInt(e.target.value, 10) || 60)}
                                                        className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-xs text-slate-200 focus:border-cyan-500 outline-none transition"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-4 shrink-0">
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

            {/* GLOBAL ENV DIALOG MODAL */}
            {showGlobalEnvModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4 shrink-0">
                            <div className="flex items-center gap-2">
                                <Lock size={18} className="text-pink-400" />
                                <h3 className="text-lg font-bold text-white">
                                    Manage Global Environment Secrets
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowGlobalEnvModal(false)}
                                className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleGlobalEnvSubmit} className="flex flex-col flex-1 overflow-hidden space-y-4 text-left">
                            <div className="flex-1 overflow-y-auto pr-1 space-y-4 custom-scrollbar">
                                <p className="text-xs text-slate-400 leading-relaxed select-none">
                                    Configure global environment keys. Values are saved securely with AES-256 encryption. Reference these variables in any cron webhook's URL, headers, or body using <code>$env.VARIABLE_NAME</code>.
                                </p>

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Environment Variables</label>
                                        <button
                                            type="button"
                                            onClick={() => setGlobalEnvs([...globalEnvs, { key: '', value: '' }])}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
                                        >
                                            <Plus size={12} /> Add Variable
                                        </button>
                                    </div>
                                    
                                    {globalEnvs.length === 0 ? (
                                        <div className="text-[11px] text-slate-500 italic bg-slate-950/20 border border-white/5 rounded-xl p-3 text-center">
                                            No global environment variables configured.
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                            {globalEnvs.map((env, index) => (
                                                <div key={index} className="flex gap-2 items-center">
                                                    <input
                                                        type="text"
                                                        placeholder="VARIABLE_NAME"
                                                        value={env.key}
                                                        onChange={(e) => {
                                                            const newEnv = [...globalEnvs];
                                                            newEnv[index].key = e.target.value;
                                                            setGlobalEnvs(newEnv);
                                                        }}
                                                        className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 outline-none transition font-mono"
                                                    />
                                                    <input
                                                        type="password"
                                                        placeholder="Value"
                                                        value={env.value}
                                                        onChange={(e) => {
                                                            const newEnv = [...globalEnvs];
                                                            newEnv[index].value = e.target.value;
                                                            setGlobalEnvs(newEnv);
                                                        }}
                                                        className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-cyan-500 outline-none transition"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setGlobalEnvs(globalEnvs.filter((_, i) => i !== index));
                                                        }}
                                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition"
                                                        title="Remove Env Variable"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 border-t border-white/5 pt-4 mt-4 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setShowGlobalEnvModal(false)}
                                    disabled={globalEnvSubmitting}
                                    className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={globalEnvSubmitting}
                                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition disabled:opacity-50"
                                >
                                    {globalEnvSubmitting ? 'Saving changes...' : 'Save Global Secrets'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
