'use client';

import { useEffect, useState } from 'react';
import {
    FaArrowDown,
    FaArrowsRotate,
    FaArrowUp,
    FaFloppyDisk,
    FaGripVertical,
    FaLock,
    FaPlus,
    FaSpinner,
    FaTrashCan,
} from 'react-icons/fa6';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { Badge, EmptyState, Field, Loading, PageHeader, Panel, Stat } from '@/app/components/admin/ui';
import { MeterBar } from '@/app/_admin/health/shared';
import '@/app/styles/admin-insights.css';
import '@/app/styles/admin-system.css';

const AI_TABS = [
    { key: 'config', label: 'Config' },
    { key: 'generate', label: 'Generate' },
    { key: 'logs', label: 'Logs' },
    { key: 'models', label: 'Models' },
];

const PROVIDER_TYPES = [
    { id: 'google', name: 'Google Gemini', defaultModel: 'gemini-2.0-flash-lite' },
    { id: 'openai', name: 'OpenAI GPT', defaultModel: 'gpt-4o-mini' },
    { id: 'groq', name: 'Groq', defaultModel: 'llama-3.3-70b-versatile' },
    { id: 'openrouter', name: 'OpenRouter', defaultModel: 'meta-llama/llama-3-8b-instruct:free' },
    { id: 'anthropic', name: 'Anthropic Claude', defaultModel: 'claude-3-5-sonnet-20241022' },
    { id: 'cohere', name: 'Cohere', defaultModel: 'command-r-plus' },
    { id: 'perplexity', name: 'Perplexity', defaultModel: 'sonar-reasoning' },
    { id: 'replicate', name: 'Replicate', defaultModel: 'meta/llama-3.1-405b-instruct' },
    { id: 'together', name: 'Together AI', defaultModel: 'meta-llama/Llama-3-70b-chat-hf' },
    { id: 'mistral', name: 'Mistral AI', defaultModel: 'mistral-large-latest' },
    { id: 'deepseek', name: 'DeepSeek', defaultModel: 'deepseek-chat' },
    { id: 'fireworks', name: 'Fireworks AI', defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct' },
    { id: 'xai', name: 'xAI Grok', defaultModel: 'grok-2-latest' },
    { id: 'stabilityai', name: 'Stability AI', defaultModel: 'stable-diffusion-v1-6' },
    { id: 'aws', name: 'AWS Bedrock', defaultModel: 'anthropic.claude-3-5-sonnet-20241022-v2:0' },
    { id: 'azure', name: 'Azure OpenAI', defaultModel: 'gpt-4o' },
];

const COMMON_MODELS = {
    google: [
        { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite [Free]', isFree: true },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash [Free]', isFree: true },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', isFree: false },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', isFree: false },
    ],
    openai: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', isFree: false },
        { id: 'gpt-4o', name: 'GPT-4o', isFree: false },
        { id: 'o1-mini', name: 'o1 Mini', isFree: false },
    ],
    groq: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70b Versatile [Free]', isFree: true },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8b Instant [Free]', isFree: true },
        { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90b Vision [Free]', isFree: true },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7b [Free]', isFree: true },
    ],
    openrouter: [
        { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8b [Free]', isFree: true },
        { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash [Free]', isFree: true },
        { id: 'openrouter/auto', name: 'Auto Router', isFree: false },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', isFree: false },
    ],
    anthropic: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet v2', isFree: false },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', isFree: false },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', isFree: false },
    ],
    cohere: [
        { id: 'command-r-plus', name: 'Command R+', isFree: false },
        { id: 'command-r', name: 'Command R', isFree: false },
    ],
    perplexity: [
        { id: 'sonar-reasoning', name: 'Sonar Reasoning', isFree: false },
        { id: 'sonar', name: 'Sonar', isFree: false },
    ],
    replicate: [{ id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405b Instruct', isFree: false }],
    together: [
        { id: 'meta-llama/Llama-3-70b-chat-hf', name: 'Llama 3 70b Chat', isFree: false },
        { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B Instruct', isFree: false },
    ],
    mistral: [
        { id: 'mistral-large-latest', name: 'Mistral Large', isFree: false },
        { id: 'mistral-small-latest', name: 'Mistral Small', isFree: false },
        { id: 'codestral-latest', name: 'Codestral', isFree: false },
    ],
    deepseek: [
        { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)', isFree: false },
        { id: 'deepseek-coder', name: 'DeepSeek Coder', isFree: false },
    ],
    fireworks: [
        {
            id: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
            name: 'Llama 3.1 70b Instruct',
            isFree: false,
        },
    ],
    xai: [
        { id: 'grok-2-latest', name: 'Grok 2', isFree: false },
        { id: 'grok-beta', name: 'Grok Beta', isFree: false },
    ],
    stabilityai: [{ id: 'stable-diffusion-v1-6', name: 'Stable Diffusion 1.6', isFree: false }],
    aws: [
        {
            id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
            name: 'Claude 3.5 Sonnet (Bedrock)',
            isFree: false,
        },
    ],
    azure: [{ id: 'gpt-4o', name: 'GPT-4o (Azure)', isFree: false }],
};

export default function AiConfigPage() {
    const { confirm, toast } = useAdminFeedback();
    const [activeTab, setActiveTab] = useState('config');
    const [config, setConfig] = useState({
        enabled: false,
        systemInstruction: '',
        gatewayUrl: '',
        hasGatewayApiKey: false,
        providers: [],
        models: [],
        textPriority: [],
        imagePriority: [],
    });

    const [gatewayApiKey, setGatewayApiKey] = useState('');
    const [showGatewayKeyInput, setShowGatewayKeyInput] = useState(true);
    const [validatingProvider, setValidatingProvider] = useState(false);

    // Form states
    const [providerForm, setProviderForm] = useState({
        type: 'google',
        name: '',
        autoName: true,
        apiKey: '',
    });
    const [modelForm, setModelForm] = useState({
        providerId: '',
        modelId: 'gemini-2.0-flash-lite',
        customModelId: '',
        name: '',
        isFree: true,
    });

    // Remote model choices from APIs
    const [remoteModels, setRemoteModels] = useState({});
    const [loadingRemoteModels, setLoadingRemoteModels] = useState({});

    // Telemetry logs
    const [telemetryLogs, setTelemetryLogs] = useState([]);
    const [telemetryStats, setTelemetryStats] = useState(null);
    const [overallTotalTokens, setOverallTotalTokens] = useState(0);
    const [loadingTelemetry, setLoadingTelemetry] = useState(true);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Drag and Drop State
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [draggedType, setDraggedType] = useState(null); // 'text' or 'image'

    useEffect(() => {
        fetchConfig();
        fetchTelemetry();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await fetch('/api/admin/ai/config');
            const data = await res.json();
            if (data.success && data.data) {
                setConfig({
                    enabled: data.data.enabled || false,
                    systemInstruction: data.data.systemInstruction || '',
                    gatewayUrl: data.data.gatewayUrl || '',
                    hasGatewayApiKey: data.data.hasGatewayApiKey || false,
                    providers: Array.isArray(data.data.providers) ? data.data.providers : [],
                    models: Array.isArray(data.data.models) ? data.data.models : [],
                    textPriority: Array.isArray(data.data.textPriority) ? data.data.textPriority : [],
                    imagePriority: Array.isArray(data.data.imagePriority) ? data.data.imagePriority : [],
                });
                setShowGatewayKeyInput(!data.data.hasGatewayApiKey);

                const savedProviders = data.data.providers || [];
                savedProviders.forEach((p) => {
                    if (p.hasKey) {
                        fetchRemoteModels(p);
                    }
                });

                if (savedProviders.length > 0) {
                    setModelForm((prev) => ({
                        ...prev,
                        providerId: savedProviders[0].id,
                        modelId: COMMON_MODELS[savedProviders[0].type]?.[0]?.id || '',
                    }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch AI config:', error);
            showNotification(false, 'Failed to load configuration');
        } finally {
            setLoading(false);
        }
    };

    const fetchRemoteModels = async (provider) => {
        const id = typeof provider === 'object' ? provider.id : provider;
        setLoadingRemoteModels((prev) => ({ ...prev, [id]: true }));
        try {
            let res;
            if (
                typeof provider === 'object' &&
                provider.apiKey &&
                provider.apiKey !== '•••• •••• •••• ••••'
            ) {
                res = await fetch('/api/admin/ai/models', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: provider.type, apiKey: provider.apiKey }),
                });
            } else {
                res = await fetch(`/api/admin/ai/models?providerId=${id}`);
            }
            const data = await res.json();
            if (data.success) {
                setRemoteModels((prev) => ({ ...prev, [id]: data.data || [] }));
            }
        } catch (error) {
            console.error(`Failed to fetch models for provider ${id}:`, error);
        } finally {
            setLoadingRemoteModels((prev) => ({ ...prev, [id]: false }));
        }
    };

    const fetchTelemetry = async () => {
        setLoadingTelemetry(true);
        try {
            const res = await fetch('/api/admin/ai/logs');
            const data = await res.json();
            if (data.success) {
                setTelemetryLogs(data.data.logs || []);
                setTelemetryStats(data.data.stats || null);
                setOverallTotalTokens(data.data.overallTotalTokens || 0);
            }
        } catch (error) {
            console.error('Failed to fetch AI telemetry:', error);
        } finally {
            setLoadingTelemetry(false);
        }
    };

    const showNotification = (success, message) => {
        if (success) toast.success(message);
        else toast.error(message);
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                enabled: config.enabled,
                systemInstruction: config.systemInstruction,
                gatewayUrl: config.gatewayUrl,
                gatewayApiKey: showGatewayKeyInput ? gatewayApiKey : '•••• •••• •••• ••••',
                providers: config.providers.map((p) => ({
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    apiKey: p.apiKey || '•••• •••• •••• ••••',
                })),
                models: config.models,
                textPriority: config.textPriority,
                imagePriority: config.imagePriority,
            };

            const res = await fetch('/api/admin/ai/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (data.success) {
                setConfig({
                    enabled: data.data.enabled || false,
                    systemInstruction: data.data.systemInstruction || '',
                    gatewayUrl: data.data.gatewayUrl || '',
                    hasGatewayApiKey: data.data.hasGatewayApiKey || false,
                    providers: Array.isArray(data.data.providers) ? data.data.providers : [],
                    models: Array.isArray(data.data.models) ? data.data.models : [],
                    textPriority: Array.isArray(data.data.textPriority) ? data.data.textPriority : [],
                    imagePriority: Array.isArray(data.data.imagePriority) ? data.data.imagePriority : [],
                });
                setGatewayApiKey('');
                setShowGatewayKeyInput(!data.data.hasGatewayApiKey);
                showNotification(true, 'AI configuration saved');
                fetchTelemetry();
            } else {
                showNotification(false, `Failed to save: ${data.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Save error:', error);
            showNotification(false, 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const addProvider = async () => {
        if (!providerForm.apiKey || !providerForm.apiKey.trim()) {
            showNotification(false, 'API key is required to add a provider.');
            return;
        }

        setValidatingProvider(true);
        try {
            const res = await fetch('/api/admin/ai/validate-provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: providerForm.type, apiKey: providerForm.apiKey }),
            });
            const data = await res.json();
            if (!data.success) {
                showNotification(
                    false,
                    `API key validation failed: ${data.error || 'Invalid API key'}`
                );
                return;
            }
        } catch (error) {
            console.error('Validation error:', error);
            showNotification(false, `API key validation error: ${error.message}`);
            return;
        } finally {
            setValidatingProvider(false);
        }

        const newId = 'provider_' + Math.random().toString(36).substring(2, 9);
        const name = providerForm.autoName ? '' : providerForm.name;

        const newProvider = {
            id: newId,
            name: name,
            type: providerForm.type,
            apiKey: providerForm.apiKey,
            hasKey: true,
        };

        setConfig((prev) => ({
            ...prev,
            providers: [...prev.providers, newProvider],
        }));

        fetchRemoteModels(newProvider);

        if (!modelForm.providerId) {
            setModelForm((prev) => ({ ...prev, providerId: newId }));
        }

        setProviderForm({
            type: 'google',
            name: '',
            autoName: true,
            apiKey: '',
        });

        showNotification(true, 'Provider validated and added. Save changes to persist.');
    };

    const deleteProvider = async (id) => {
        const linkedModels = config.models.filter((m) => m.providerId === id);
        if (linkedModels.length > 0) {
            if (
                !(await confirm({
                    title: 'Delete provider and linked models?',
                    message: `Deleting this provider will also delete the following models linked to it:\n${linkedModels
                        .map((m) => ` - ${m.name}`)
                        .join('\n')}`,
                    confirmText: 'Delete',
                    danger: true,
                }))
            ) {
                return;
            }
        }

        setConfig((prev) => {
            const nextProviders = prev.providers.filter((p) => p.id !== id);
            const nextModels = prev.models.filter((m) => m.providerId !== id);
            const nextModelsIds = nextModels.map((m) => m.id);
            const nextTextPriority = prev.textPriority.filter((mid) => nextModelsIds.includes(mid));
            const nextImagePriority = prev.imagePriority.filter((mid) => nextModelsIds.includes(mid));

            return {
                ...prev,
                providers: nextProviders,
                models: nextModels,
                textPriority: nextTextPriority,
                imagePriority: nextImagePriority,
            };
        });
    };

    const addModel = () => {
        if (!modelForm.providerId) {
            showNotification(false, 'Configure and select an AI provider first.');
            return;
        }

        const provider = config.providers.find((p) => p.id === modelForm.providerId);
        if (!provider) return;

        const isCustom = modelForm.modelId === 'custom';
        const modelIdValue = isCustom ? modelForm.customModelId : modelForm.modelId;

        if (!modelIdValue || !modelIdValue.trim()) {
            showNotification(false, 'Model ID is required.');
            return;
        }

        const newId = 'model_' + Math.random().toString(36).substring(2, 9);

        let isFreeVal = modelForm.isFree;
        if (!isCustom) {
            const matchedCommon = COMMON_MODELS[provider.type]?.find(
                (m) => m.id === modelForm.modelId
            );
            if (matchedCommon) isFreeVal = matchedCommon.isFree;
            const matchedRemote = remoteModels[provider.id]?.find((m) => m.id === modelForm.modelId);
            if (matchedRemote) isFreeVal = matchedRemote.isFree;
        }

        const label =
            modelForm.name.trim() || `${provider.name || provider.type.toUpperCase()} ${modelIdValue}`;

        const newModel = {
            id: newId,
            name: label,
            modelId: modelIdValue.trim(),
            providerId: provider.id,
            isFree: isFreeVal,
        };

        setConfig((prev) => ({
            ...prev,
            models: [...prev.models, newModel],
            textPriority: [...prev.textPriority, newId],
        }));

        setModelForm((prev) => ({
            ...prev,
            customModelId: '',
            name: '',
        }));

        showNotification(true, 'Model added locally. Save changes to commit.');
    };

    const deleteModel = (id) => {
        setConfig((prev) => ({
            ...prev,
            models: prev.models.filter((m) => m.id !== id),
            textPriority: prev.textPriority.filter((mid) => mid !== id),
            imagePriority: prev.imagePriority.filter((mid) => mid !== id),
        }));
    };

    const handleDragStart = (e, index, type) => {
        setDraggedIndex(index);
        setDraggedType(type);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, index, type) => {
        e.preventDefault();
        if (draggedIndex === null || draggedType !== type || draggedIndex === index) return;

        const priorityKey = type === 'text' ? 'textPriority' : 'imagePriority';
        const list = [...config[priorityKey]];
        const draggedItem = list[draggedIndex];
        list.splice(draggedIndex, 1);
        list.splice(index, 0, draggedItem);

        setConfig((prev) => ({ ...prev, [priorityKey]: list }));
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDraggedType(null);
    };

    const moveItem = (index, direction, type) => {
        const priorityKey = type === 'text' ? 'textPriority' : 'imagePriority';
        const list = [...config[priorityKey]];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= list.length) return;

        const temp = list[index];
        list[index] = list[targetIndex];
        list[targetIndex] = temp;

        setConfig((prev) => ({ ...prev, [priorityKey]: list }));
    };

    const togglePriority = (modelId, targetType) => {
        const listKey = targetType === 'text' ? 'textPriority' : 'imagePriority';
        const inList = config[listKey].includes(modelId);

        setConfig((prev) => {
            const nextList = inList
                ? prev[listKey].filter((id) => id !== modelId)
                : [...prev[listKey], modelId];
            return { ...prev, [listKey]: nextList };
        });
    };

    if (loading) {
        return (
            <div className="adm-page">
                <PageHeader
                    command="ai --config"
                    title="AI providers and models"
                    description="Configure multi-provider AI model routing, failover priority, and system instructions."
                />
                <section className="adm-panel">
                    <Loading label="Loading AI configuration" rows={6} />
                </section>
            </div>
        );
    }

    const activeProviderStats = PROVIDER_TYPES.filter((p) => telemetryStats?.[p.id]?.total > 0);

    return (
        <div className="adm-page">
            <PageHeader
                command="ai --config"
                title="AI providers and models"
                description="Configure multi-provider AI model routing, failover priority, and system instructions."
                actions={
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="adm-btn adm-btn-primary"
                    >
                        {saving ? (
                            <FaSpinner aria-hidden="true" className="animate-spin" />
                        ) : (
                            <FaFloppyDisk aria-hidden="true" />
                        )}
                        {saving ? 'Saving' : 'Save changes'}
                    </button>
                }
            />

            <div role="tablist" aria-label="AI configuration sections" className="adm-tabs">
                {AI_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        id={`ai-tab-${tab.key}`}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        aria-controls="ai-tabpanel"
                        onClick={() => setActiveTab(tab.key)}
                        className="adm-tab"
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="adm-split">
                <div className="adm-stack">
                    <div
                        id="ai-tabpanel"
                        role="tabpanel"
                        aria-labelledby={`ai-tab-${activeTab}`}
                        tabIndex={0}
                        className="adm-stack"
                    >
                    {activeTab === 'config' && (
                        <div className="adm-stack">
                    {/* Gateway and status */}
                    <Panel
                        title="Gateway settings"
                        actions={
                            <div className="flex items-center gap-2">
                                <Badge tone={config.enabled ? 'ok' : 'warn'}>
                                    {config.enabled ? 'Online' : 'Offline'}
                                </Badge>
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={config.enabled}
                                    aria-label="Enable AI features globally"
                                    onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                                    className="adm-switch"
                                />
                            </div>
                        }
                    >
                        <div className="space-y-4">
                            <p className="adm-help">
                                Enable or disable generative AI features across the site. Optionally route
                                requests through a Vercel AI Gateway proxy.
                            </p>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Field
                                    label="Vercel AI Gateway URL"
                                    help="Leave blank to call provider endpoints directly."
                                >
                                    <input
                                        type="text"
                                        value={config.gatewayUrl}
                                        onChange={(e) =>
                                            setConfig({ ...config, gatewayUrl: e.target.value })
                                        }
                                        placeholder="https://gateway.ai.vercel.cloud/v1/projects/..."
                                        className="adm-input font-mono"
                                    />
                                </Field>

                                <div className="adm-field">
                                    <label htmlFor="gateway-api-key" className="adm-label">
                                        Vercel AI Gateway API key
                                    </label>
                                    {showGatewayKeyInput ? (
                                        <div className="flex gap-2">
                                            <input
                                                id="gateway-api-key"
                                                type="password"
                                                value={gatewayApiKey}
                                                onChange={(e) => setGatewayApiKey(e.target.value)}
                                                placeholder="Paste Vercel AI Gateway key…"
                                                autoComplete="new-password"
                                                className="adm-input flex-1 font-mono"
                                            />
                                            {config.hasGatewayApiKey && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowGatewayKeyInput(false);
                                                        setGatewayApiKey('');
                                                    }}
                                                    className="adm-btn"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-2 rounded-[10px] border border-[var(--hairline-strong)] bg-[var(--bg-primary)] px-3 py-2">
                                            <span className="truncate font-mono text-sm text-[var(--text-secondary)]">
                                                •••• •••• •••• •••• (Saved)
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => setShowGatewayKeyInput(true)}
                                                className="adm-btn"
                                            >
                                                Replace
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Panel>

                    {/* Providers */}
                    <Panel
                        title="AI providers and credentials"
                        actions={<Badge>{config.providers.length} configured</Badge>}
                    >
                        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
                            <div className="space-y-4 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-4">
                                <h3 className="adm-panel-title">Add provider instance</h3>

                                <Field label="Provider type">
                                    <select
                                        value={providerForm.type}
                                        onChange={(e) =>
                                            setProviderForm({ ...providerForm, type: e.target.value })
                                        }
                                        className="adm-input"
                                    >
                                        {PROVIDER_TYPES.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <div className="adm-field">
                                    <div className="flex items-center justify-between gap-2">
                                        <label htmlFor="provider-name-input" className="adm-label">
                                            Provider name
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={providerForm.autoName}
                                                onChange={(e) =>
                                                    setProviderForm({
                                                        ...providerForm,
                                                        autoName: e.target.checked,
                                                    })
                                                }
                                                className="adm-check"
                                            />
                                            Autogenerate
                                        </label>
                                    </div>
                                    <input
                                        id="provider-name-input"
                                        type="text"
                                        value={providerForm.name}
                                        onChange={(e) =>
                                            setProviderForm({
                                                ...providerForm,
                                                name: e.target.value,
                                                autoName: false,
                                            })
                                        }
                                        disabled={providerForm.autoName}
                                        placeholder={
                                            providerForm.autoName
                                                ? 'Autogenerates (e.g. Google API)'
                                                : 'Custom provider name'
                                        }
                                        className="adm-input"
                                    />
                                </div>

                                <Field label="API secret key">
                                    <input
                                        type="password"
                                        value={providerForm.apiKey}
                                        onChange={(e) =>
                                            setProviderForm({
                                                ...providerForm,
                                                apiKey: e.target.value,
                                            })
                                        }
                                        placeholder="Paste API key…"
                                        autoComplete="new-password"
                                        className="adm-input font-mono"
                                    />
                                </Field>

                                <button
                                    type="button"
                                    onClick={addProvider}
                                    disabled={validatingProvider}
                                    className="adm-btn adm-btn-primary w-full"
                                >
                                    {validatingProvider ? (
                                        <FaSpinner aria-hidden="true" className="animate-spin" />
                                    ) : (
                                        <FaPlus aria-hidden="true" />
                                    )}
                                    {validatingProvider ? 'Validating key' : 'Test and add provider'}
                                </button>
                            </div>

                            <div className="min-w-0">
                                {config.providers.length === 0 ? (
                                    <EmptyState
                                        title="No providers configured"
                                        description="Add an API key on the left to register your first AI provider."
                                    />
                                ) : (
                                    <ul className="adm-list rounded-[10px] border border-[var(--hairline)]">
                                        {config.providers.map((p) => (
                                            <li key={p.id} className="adm-row justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-semibold text-[var(--text-bright)]">
                                                            {p.name || `${p.type.toUpperCase()} API`}
                                                        </span>
                                                        <Badge tone="info">{p.type}</Badge>
                                                    </div>
                                                    <p className="adm-help mt-0.5 flex items-center gap-1.5 font-mono">
                                                        <FaLock aria-hidden="true" /> •••• •••• •••• ••••
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteProvider(p.id)}
                                                    aria-label={`Delete provider ${p.name || p.type}`}
                                                    className="adm-icon-btn"
                                                >
                                                    <FaTrashCan aria-hidden="true" />
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </Panel>

                        </div>
                    )}

                    {/* Models */}
                    {activeTab === 'models' && (
                    <Panel
                        title="Models"
                        actions={<Badge>{config.models.length} configured</Badge>}
                    >
                        <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
                            <div className="space-y-4 rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-primary)] p-4">
                                <h3 className="adm-panel-title">Add model</h3>

                                <Field label="Link to provider">
                                    <select
                                        value={modelForm.providerId}
                                        onChange={(e) => {
                                            const pid = e.target.value;
                                            const prov = config.providers.find((p) => p.id === pid);
                                            const defaultModelId =
                                                PROVIDER_TYPES.find((pt) => pt.id === prov?.type)
                                                    ?.defaultModel || '';
                                            setModelForm({
                                                ...modelForm,
                                                providerId: pid,
                                                modelId: defaultModelId,
                                            });
                                            if (prov) {
                                                fetchRemoteModels(prov);
                                            }
                                        }}
                                        className="adm-input"
                                    >
                                        <option value="" disabled>
                                            Select a configured provider…
                                        </option>
                                        {config.providers.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name || `${p.type.toUpperCase()} API`}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                {modelForm.providerId &&
                                    (() => {
                                        const prov = config.providers.find(
                                            (p) => p.id === modelForm.providerId
                                        );
                                        const type = prov?.type || 'google';
                                        const commons = COMMON_MODELS[type] || [];
                                        const remotes = remoteModels[modelForm.providerId] || [];
                                        const isLoadingRemote =
                                            loadingRemoteModels[modelForm.providerId];

                                        return (
                                            <Field
                                                label="Model identifier"
                                                help={
                                                    isLoadingRemote
                                                        ? 'Fetching remote models…'
                                                        : undefined
                                                }
                                            >
                                                <select
                                                    value={modelForm.modelId}
                                                    onChange={(e) =>
                                                        setModelForm({
                                                            ...modelForm,
                                                            modelId: e.target.value,
                                                        })
                                                    }
                                                    className="adm-input"
                                                >
                                                    <optgroup label="Pre-configured models">
                                                        {commons.map((m) => (
                                                            <option key={m.id} value={m.id}>
                                                                {m.name}
                                                            </option>
                                                        ))}
                                                    </optgroup>

                                                    {remotes.length > 0 && (
                                                        <optgroup label="Discovered online models">
                                                            {remotes.map((m) => (
                                                                <option key={m.id} value={m.id}>
                                                                    {m.name}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                    <option value="custom">
                                                        Custom model identifier
                                                    </option>
                                                </select>
                                            </Field>
                                        );
                                    })()}

                                {modelForm.modelId === 'custom' && (
                                    <div className="space-y-3">
                                        <Field label="Custom model ID">
                                            <input
                                                type="text"
                                                value={modelForm.customModelId}
                                                onChange={(e) =>
                                                    setModelForm({
                                                        ...modelForm,
                                                        customModelId: e.target.value,
                                                    })
                                                }
                                                placeholder="gpt-4o-mini-2024-07-18"
                                                className="adm-input font-mono"
                                            />
                                        </Field>

                                        <label className="adm-choice">
                                            <input
                                                type="checkbox"
                                                checked={modelForm.isFree}
                                                onChange={(e) =>
                                                    setModelForm({
                                                        ...modelForm,
                                                        isFree: e.target.checked,
                                                    })
                                                }
                                                className="adm-check"
                                            />
                                            <span>Free tier model</span>
                                        </label>
                                    </div>
                                )}

                                <Field label="Display label (optional)">
                                    <input
                                        type="text"
                                        value={modelForm.name}
                                        onChange={(e) =>
                                            setModelForm({ ...modelForm, name: e.target.value })
                                        }
                                        placeholder="Gemini 2.0 Flash Lite"
                                        className="adm-input"
                                    />
                                </Field>

                                <button
                                    type="button"
                                    onClick={addModel}
                                    className="adm-btn adm-btn-primary w-full"
                                >
                                    <FaPlus aria-hidden="true" /> Add model
                                </button>
                            </div>

                            <div className="min-w-0">
                                {config.models.length === 0 ? (
                                    <EmptyState
                                        title="No models configured"
                                        description="Link a model to a provider on the left to use it in text or vision chains."
                                    />
                                ) : (
                                    <ul className="adm-list rounded-[10px] border border-[var(--hairline)]">
                                        {config.models.map((m) => {
                                            const prov = config.providers.find(
                                                (p) => p.id === m.providerId
                                            );
                                            const inText = config.textPriority.includes(m.id);
                                            const inImage = config.imagePriority.includes(m.id);
                                            return (
                                                <li
                                                    key={m.id}
                                                    className="adm-row flex-wrap justify-between gap-3"
                                                >
                                                    <div className="min-w-0 flex-1 basis-56">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-semibold text-[var(--text-bright)]">
                                                                {m.name}
                                                            </span>
                                                            {m.isFree && (
                                                                <Badge tone="ok">Free</Badge>
                                                            )}
                                                        </div>
                                                        <p className="adm-help font-mono">
                                                            {m.modelId} ·{' '}
                                                            {prov?.name || prov?.type || 'Unknown'}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            aria-pressed={inText}
                                                            onClick={() =>
                                                                togglePriority(m.id, 'text')
                                                            }
                                                            className="adm-tab"
                                                        >
                                                            Text generation
                                                        </button>
                                                        <button
                                                            type="button"
                                                            aria-pressed={inImage}
                                                            onClick={() =>
                                                                togglePriority(m.id, 'image')
                                                            }
                                                            className="adm-tab"
                                                        >
                                                            Vision
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => deleteModel(m.id)}
                                                            aria-label={`Delete model ${m.name}`}
                                                            className="adm-icon-btn"
                                                        >
                                                            <FaTrashCan aria-hidden="true" />
                                                        </button>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </Panel>
                    )}

                    {/* Priority routing */}
                    {activeTab === 'generate' && (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Panel title="Text fallback priority" flush>
                            <div className="border-b border-[var(--hairline)] px-4 py-2.5 sm:px-5">
                                <p className="adm-help">
                                    Drag rows or use the arrows to set failover order for text generation.
                                </p>
                            </div>
                            {config.textPriority.length === 0 ? (
                                <EmptyState
                                    title="No models in text priority"
                                    description="Enable Text generation on a model above."
                                />
                            ) : (
                                <ul className="adm-list">
                                    {config.textPriority.map((modelId, idx) => {
                                        const model = config.models.find((m) => m.id === modelId);
                                        const prov = model
                                            ? config.providers.find(
                                                  (p) => p.id === model.providerId
                                              )
                                            : null;
                                        if (!model) return null;

                                        return (
                                            <li
                                                key={model.id}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, idx, 'text')}
                                                onDragOver={(e) => handleDragOver(e, idx, 'text')}
                                                onDragEnd={handleDragEnd}
                                                className="adm-row justify-between gap-3 cursor-grab active:cursor-grabbing"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <FaGripVertical
                                                        aria-hidden="true"
                                                        className="shrink-0 text-[var(--adm-hint)]"
                                                    />
                                                    <span className="adm-num adm-help">{idx + 1}.</span>
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-semibold text-[var(--text-bright)]">
                                                                {model.name}
                                                            </span>
                                                            {model.isFree && (
                                                                <Badge tone="ok">Free</Badge>
                                                            )}
                                                        </div>
                                                        <p className="adm-help truncate font-mono">
                                                            {model.modelId} (
                                                            {prov?.name || prov?.type})
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveItem(idx, -1, 'text')}
                                                        disabled={idx === 0}
                                                        aria-label={`Move ${model.name} up`}
                                                        className="adm-icon-btn"
                                                    >
                                                        <FaArrowUp aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveItem(idx, 1, 'text')}
                                                        disabled={
                                                            idx === config.textPriority.length - 1
                                                        }
                                                        aria-label={`Move ${model.name} down`}
                                                        className="adm-icon-btn"
                                                    >
                                                        <FaArrowDown aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Panel>

                        <Panel title="Image captioning fallback priority" flush>
                            <div className="border-b border-[var(--hairline)] px-4 py-2.5 sm:px-5">
                                <p className="adm-help">
                                    Drag rows or use the arrows to set failover order for vision and captioning.
                                </p>
                            </div>
                            {config.imagePriority.length === 0 ? (
                                <EmptyState
                                    title="No models in vision priority"
                                    description="Enable Vision on a model above."
                                />
                            ) : (
                                <ul className="adm-list">
                                    {config.imagePriority.map((modelId, idx) => {
                                        const model = config.models.find((m) => m.id === modelId);
                                        const prov = model
                                            ? config.providers.find(
                                                  (p) => p.id === model.providerId
                                              )
                                            : null;
                                        if (!model) return null;

                                        return (
                                            <li
                                                key={model.id}
                                                draggable
                                                onDragStart={(e) =>
                                                    handleDragStart(e, idx, 'image')
                                                }
                                                onDragOver={(e) => handleDragOver(e, idx, 'image')}
                                                onDragEnd={handleDragEnd}
                                                className="adm-row justify-between gap-3 cursor-grab active:cursor-grabbing"
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <FaGripVertical
                                                        aria-hidden="true"
                                                        className="shrink-0 text-[var(--adm-hint)]"
                                                    />
                                                    <span className="adm-num adm-help">{idx + 1}.</span>
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <span className="font-semibold text-[var(--text-bright)]">
                                                                {model.name}
                                                            </span>
                                                            {model.isFree && (
                                                                <Badge tone="ok">Free</Badge>
                                                            )}
                                                        </div>
                                                        <p className="adm-help truncate font-mono">
                                                            {model.modelId} (
                                                            {prov?.name || prov?.type})
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveItem(idx, -1, 'image')}
                                                        disabled={idx === 0}
                                                        aria-label={`Move ${model.name} up`}
                                                        className="adm-icon-btn"
                                                    >
                                                        <FaArrowUp aria-hidden="true" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveItem(idx, 1, 'image')}
                                                        disabled={
                                                            idx === config.imagePriority.length - 1
                                                        }
                                                        aria-label={`Move ${model.name} down`}
                                                        className="adm-icon-btn"
                                                    >
                                                        <FaArrowDown aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </Panel>
                    </div>
                    )}

                    {/* Global system instructions */}
                    {activeTab === 'config' && (
                    <Panel title="Global system instructions">
                        <Field
                            label="Base system prompt"
                            help="Prepended to all system prompts to set logic, tone, and formatting constraints."
                        >
                            <textarea
                                value={config.systemInstruction}
                                onChange={(e) =>
                                    setConfig({ ...config, systemInstruction: e.target.value })
                                }
                                rows={6}
                                placeholder="Define how the AI should behave globally…"
                                className="adm-input"
                            />
                        </Field>
                    </Panel>
                    )}

                    {/* Telemetry */}
                    {activeTab === 'logs' && (
                    <Panel
                        title="Recent generation history"
                        actions={
                            <button
                                type="button"
                                onClick={fetchTelemetry}
                                disabled={loadingTelemetry}
                                className="adm-btn"
                            >
                                <FaArrowsRotate
                                    aria-hidden="true"
                                    className={loadingTelemetry ? 'animate-spin' : ''}
                                />
                                Refresh
                            </button>
                        }
                        flush
                    >
                        {loadingTelemetry ? (
                            <Loading label="Loading telemetry logs" rows={5} />
                        ) : telemetryLogs.length === 0 ? (
                            <EmptyState
                                title="No telemetry records found"
                                description="Generation requests and token usage will appear here as AI features run."
                            />
                        ) : (
                            <div className="adm-table-wrap">
                                <table className="adm-table min-w-[44rem]">
                                    <thead>
                                        <tr>
                                            <th>Timestamp</th>
                                            <th>Provider and mode</th>
                                            <th>Prompt and response</th>
                                            <th className="text-right">Tokens used</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {telemetryLogs.map((log) => (
                                            <tr key={log.id}>
                                                <td className="adm-num whitespace-nowrap text-xs text-[var(--text-secondary)]">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </td>
                                                <td>
                                                    <Badge tone="info">{log.provider}</Badge>
                                                    <div className="adm-help mt-1 font-mono">
                                                        {log.mode}
                                                    </div>
                                                </td>
                                                <td className="max-w-md">
                                                    <div className="truncate text-xs text-[var(--text-primary)]">
                                                        <span className="font-mono text-[var(--adm-hint)]">
                                                            P:{' '}
                                                        </span>
                                                        {log.prompt || '<No prompt / Image input>'}
                                                    </div>
                                                    <div className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                                                        <span className="font-mono text-[var(--adm-hint)]">
                                                            R:{' '}
                                                        </span>
                                                        {log.response || '<No response>'}
                                                    </div>
                                                </td>
                                                <td className="text-right">
                                                    <div className="adm-num font-semibold text-[var(--text-bright)]">
                                                        {log.totalTokens?.toLocaleString() || 0}
                                                    </div>
                                                    <div className="adm-help font-mono">
                                                        {log.inputTokens || 0} in /{' '}
                                                        {log.outputTokens || 0} out
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Panel>
                    )}
                    </div>
                </div>

                <aside className="adm-stack adm-side">
                    <Panel title="Save configuration">
                        <p className="adm-help mb-4">
                            Commit changes to providers, models, priority chains, and system instructions.
                        </p>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="adm-btn adm-btn-primary w-full"
                        >
                            {saving ? (
                                <FaSpinner aria-hidden="true" className="animate-spin" />
                            ) : (
                                <FaFloppyDisk aria-hidden="true" />
                            )}
                            {saving ? 'Saving' : 'Save changes'}
                        </button>
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Badge tone={config.enabled ? 'ok' : 'warn'}>
                                {config.enabled ? 'Core online' : 'Core offline'}
                            </Badge>
                            <Badge>{config.providers.length} providers</Badge>
                            <Badge>{config.models.length} models</Badge>
                        </div>
                    </Panel>

                    <Stat
                        label="Total tokens used"
                        value={overallTotalTokens.toLocaleString()}
                        hint="Across all providers"
                    />

                    <Panel title="Usage by provider" flush>
                        {activeProviderStats.length === 0 ? (
                            <EmptyState
                                title="No provider usage yet"
                                description="Token totals per provider will appear here after your first request."
                            />
                        ) : (
                            <ul className="adm-list">
                                {activeProviderStats.map((p) => {
                                    const statLine = telemetryStats[p.id];
                                    return (
                                        <li key={p.id} className="p-4 sm:px-5 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-[var(--text-bright)]">
                                                    {p.name}
                                                </span>
                                                <span className="adm-num font-semibold text-[var(--text-bright)]">
                                                    {statLine.total.toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="adm-help font-mono">
                                                {statLine.input?.toLocaleString() || 0} in ·{' '}
                                                {statLine.output?.toLocaleString() || 0} out ·{' '}
                                                {statLine.requests || 0} req
                                            </p>
                                            <MeterBar
                                                label={`${p.name} share of token usage`}
                                                percent={
                                                    overallTotalTokens > 0
                                                        ? (statLine.total / overallTotalTokens) * 100
                                                        : 0
                                                }
                                            />
                                            <p className="adm-help">
                                                {overallTotalTokens > 0
                                                    ? `${Math.round(
                                                          (statLine.total / overallTotalTokens) * 100
                                                      )}% of total usage`
                                                    : 'No token usage recorded'}
                                            </p>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Panel>
                </aside>
            </div>

        </div>
    );
}
