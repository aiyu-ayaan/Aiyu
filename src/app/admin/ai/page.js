'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminFeedback } from '@/app/components/admin/feedback/AdminFeedbackProvider';
import { 
    Loader2, Bot, CheckCircle, XCircle, ArrowLeft, Cpu, Key, 
    Lock, Server, BarChart3, Clock, Database, Plus, Trash2, 
    ArrowUp, ArrowDown, GripVertical, Settings, HelpCircle, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';

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
    { id: 'azure', name: 'Azure OpenAI', defaultModel: 'gpt-4o' }
];

const COMMON_MODELS = {
    google: [
        { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite [Free]', isFree: true },
        { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash [Free]', isFree: true },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', isFree: false },
        { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', isFree: false }
    ],
    openai: [
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', isFree: false },
        { id: 'gpt-4o', name: 'GPT-4o', isFree: false },
        { id: 'o1-mini', name: 'o1 Mini', isFree: false }
    ],
    groq: [
        { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70b Versatile [Free]', isFree: true },
        { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8b Instant [Free]', isFree: true },
        { id: 'llama-3.2-90b-vision-preview', name: 'Llama 3.2 90b Vision [Free]', isFree: true },
        { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7b [Free]', isFree: true }
    ],
    openrouter: [
        { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8b [Free]', isFree: true },
        { id: 'google/gemini-2.5-flash:free', name: 'Gemini 2.5 Flash [Free]', isFree: true },
        { id: 'openrouter/auto', name: 'Auto Router', isFree: false },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', isFree: false }
    ],
    anthropic: [
        { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet v2', isFree: false },
        { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', isFree: false },
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', isFree: false }
    ],
    cohere: [
        { id: 'command-r-plus', name: 'Command R+', isFree: false },
        { id: 'command-r', name: 'Command R', isFree: false }
    ],
    perplexity: [
        { id: 'sonar-reasoning', name: 'Sonar Reasoning', isFree: false },
        { id: 'sonar', name: 'Sonar', isFree: false }
    ],
    replicate: [
        { id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405b Instruct', isFree: false }
    ],
    together: [
        { id: 'meta-llama/Llama-3-70b-chat-hf', name: 'Llama 3 70b Chat', isFree: false },
        { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B Instruct', isFree: false }
    ],
    mistral: [
        { id: 'mistral-large-latest', name: 'Mistral Large', isFree: false },
        { id: 'mistral-small-latest', name: 'Mistral Small', isFree: false },
        { id: 'codestral-latest', name: 'Codestral', isFree: false }
    ],
    deepseek: [
        { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)', isFree: false },
        { id: 'deepseek-coder', name: 'DeepSeek Coder', isFree: false }
    ],
    fireworks: [
        { id: 'accounts/fireworks/models/llama-v3p1-70b-instruct', name: 'Llama 3.1 70b Instruct', isFree: false }
    ],
    xai: [
        { id: 'grok-2-latest', name: 'Grok 2', isFree: false },
        { id: 'grok-beta', name: 'Grok Beta', isFree: false }
    ],
    stabilityai: [
        { id: 'stable-diffusion-v1-6', name: 'Stable Diffusion 1.6', isFree: false }
    ],
    aws: [
        { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', name: 'Claude 3.5 Sonnet (Bedrock)', isFree: false }
    ],
    azure: [
        { id: 'gpt-4o', name: 'GPT-4o (Azure)', isFree: false }
    ]
};

export default function AiConfigPage() {
    const { confirm } = useAdminFeedback();
    const router = useRouter();
    const [config, setConfig] = useState({
        enabled: false,
        systemInstruction: '',
        gatewayUrl: '',
        hasGatewayApiKey: false,
        providers: [],
        models: [],
        textPriority: [],
        imagePriority: []
    });

    const [gatewayApiKey, setGatewayApiKey] = useState('');
    const [showGatewayKeyInput, setShowGatewayKeyInput] = useState(true);
    const [validatingProvider, setValidatingProvider] = useState(false);

    // Form states
    const [providerForm, setProviderForm] = useState({
        type: 'google',
        name: '',
        autoName: true,
        apiKey: ''
    });
    const [modelForm, setModelForm] = useState({
        providerId: '',
        modelId: 'gemini-2.0-flash-lite',
        customModelId: '',
        name: '',
        isFree: true
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
    const [notification, setNotification] = useState(null);

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
                    imagePriority: Array.isArray(data.data.imagePriority) ? data.data.imagePriority : []
                });
                setShowGatewayKeyInput(!data.data.hasGatewayApiKey);

                // Fetch remote models for saved providers
                const savedProviders = data.data.providers || [];
                savedProviders.forEach(p => {
                    if (p.hasKey) {
                        fetchRemoteModels(p);
                    }
                });

                // Auto-fill forms if providers exist
                if (savedProviders.length > 0) {
                    setModelForm(prev => ({
                        ...prev,
                        providerId: savedProviders[0].id,
                        modelId: COMMON_MODELS[savedProviders[0].type]?.[0]?.id || ''
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
        setLoadingRemoteModels(prev => ({ ...prev, [id]: true }));
        try {
            let res;
            if (typeof provider === 'object' && provider.apiKey && provider.apiKey !== '•••• •••• •••• ••••') {
                res = await fetch('/api/admin/ai/models', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: provider.type, apiKey: provider.apiKey })
                });
            } else {
                res = await fetch(`/api/admin/ai/models?providerId=${id}`);
            }
            const data = await res.json();
            if (data.success) {
                setRemoteModels(prev => ({ ...prev, [id]: data.data || [] }));
            }
        } catch (error) {
            console.error(`Failed to fetch models for provider ${id}:`, error);
        } finally {
            setLoadingRemoteModels(prev => ({ ...prev, [id]: false }));
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
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                enabled: config.enabled,
                systemInstruction: config.systemInstruction,
                gatewayUrl: config.gatewayUrl,
                gatewayApiKey: showGatewayKeyInput ? gatewayApiKey : '•••• •••• •••• ••••',
                providers: config.providers.map(p => ({
                    id: p.id,
                    name: p.name,
                    type: p.type,
                    apiKey: p.apiKey || '•••• •••• •••• ••••'
                })),
                models: config.models,
                textPriority: config.textPriority,
                imagePriority: config.imagePriority
            };

            const res = await fetch('/api/admin/ai/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
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
                    imagePriority: Array.isArray(data.data.imagePriority) ? data.data.imagePriority : []
                });
                setGatewayApiKey('');
                setShowGatewayKeyInput(!data.data.hasGatewayApiKey);
                showNotification(true, 'AI Neural Core Saved Successfully');
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

    // Form handlers
    const addProvider = async () => {
        if (!providerForm.apiKey || !providerForm.apiKey.trim()) {
            showNotification(false, 'API Key is required to add provider.');
            return;
        }

        setValidatingProvider(true);
        try {
            // Call the validation endpoint
            const res = await fetch('/api/admin/ai/validate-provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: providerForm.type, apiKey: providerForm.apiKey })
            });
            const data = await res.json();
            if (!data.success) {
                showNotification(false, `API Key Validation Failed: ${data.error || 'Invalid API Key'}`);
                return;
            }
        } catch (error) {
            console.error('Validation error:', error);
            showNotification(false, `API Key Validation Error: ${error.message}`);
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
            hasKey: true
        };

        setConfig(prev => {
            const nextProviders = [...prev.providers, newProvider];
            return {
                ...prev,
                providers: nextProviders
            };
        });

        // Fetch remote models immediately for this validated provider!
        fetchRemoteModels(newProvider);

        // Initialize model form link
        if (!modelForm.providerId) {
            setModelForm(prev => ({ ...prev, providerId: newId }));
        }

        setProviderForm({
            type: 'google',
            name: '',
            autoName: true,
            apiKey: ''
        });

        showNotification(true, 'Provider API Key Validated and Added! Save configuration to persist.');
    };

    const deleteProvider = async (id) => {
        const linkedModels = config.models.filter(m => m.providerId === id);
        if (linkedModels.length > 0) {
            if (!(await confirm({
                title: 'Delete provider and linked models?',
                message: `Deleting this provider will also delete the following models linked to it:\n${linkedModels.map(m => ` - ${m.name}`).join('\n')}`,
                confirmText: 'Delete',
                danger: true,
            }))) {
                return;
            }
        }

        setConfig(prev => {
            const nextProviders = prev.providers.filter(p => p.id !== id);
            const nextModels = prev.models.filter(m => m.providerId !== id);
            const nextModelsIds = nextModels.map(m => m.id);
            const nextTextPriority = prev.textPriority.filter(mid => nextModelsIds.includes(mid));
            const nextImagePriority = prev.imagePriority.filter(mid => nextModelsIds.includes(mid));

            return {
                ...prev,
                providers: nextProviders,
                models: nextModels,
                textPriority: nextTextPriority,
                imagePriority: nextImagePriority
            };
        });
    };

    const addModel = () => {
        if (!modelForm.providerId) {
            showNotification(false, 'Please configure and select an AI provider first.');
            return;
        }

        const provider = config.providers.find(p => p.id === modelForm.providerId);
        if (!provider) return;

        const isCustom = modelForm.modelId === 'custom';
        const modelIdValue = isCustom ? modelForm.customModelId : modelForm.modelId;

        if (!modelIdValue || !modelIdValue.trim()) {
            showNotification(false, 'Model ID is required.');
            return;
        }

        const newId = 'model_' + Math.random().toString(36).substring(2, 9);
        
        // Find isFree setting
        let isFreeVal = modelForm.isFree;
        if (!isCustom) {
            const matchedCommon = COMMON_MODELS[provider.type]?.find(m => m.id === modelForm.modelId);
            if (matchedCommon) isFreeVal = matchedCommon.isFree;
            const matchedRemote = remoteModels[provider.id]?.find(m => m.id === modelForm.modelId);
            if (matchedRemote) isFreeVal = matchedRemote.isFree;
        }

        const label = modelForm.name.trim() || `${provider.name || provider.type.toUpperCase()} ${modelIdValue}`;

        const newModel = {
            id: newId,
            name: label,
            modelId: modelIdValue.trim(),
            providerId: provider.id,
            isFree: isFreeVal
        };

        setConfig(prev => {
            const nextModels = [...prev.models, newModel];
            // Auto append to text priority if not present
            const nextTextPriority = [...prev.textPriority, newId];
            return {
                ...prev,
                models: nextModels,
                textPriority: nextTextPriority
            };
        });

        setModelForm(prev => ({
            ...prev,
            customModelId: '',
            name: ''
        }));

        showNotification(true, 'Model added locally. Save update to commit.');
    };

    const deleteModel = (id) => {
        setConfig(prev => {
            const nextModels = prev.models.filter(m => m.id !== id);
            const nextTextPriority = prev.textPriority.filter(mid => mid !== id);
            const nextImagePriority = prev.imagePriority.filter(mid => mid !== id);
            return {
                ...prev,
                models: nextModels,
                textPriority: nextTextPriority,
                imagePriority: nextImagePriority
            };
        });
    };

    // Priority Sort Handlers
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

        setConfig(prev => ({ ...prev, [priorityKey]: list }));
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

        setConfig(prev => ({ ...prev, [priorityKey]: list }));
    };

    const togglePriority = (modelId, targetType) => {
        const listKey = targetType === 'text' ? 'textPriority' : 'imagePriority';
        const inList = config[listKey].includes(modelId);

        setConfig(prev => {
            let nextList;
            if (inList) {
                nextList = prev[listKey].filter(id => id !== modelId);
            } else {
                nextList = [...prev[listKey], modelId];
            }
            return { ...prev, [listKey]: nextList };
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-950">
                <span className="font-mono text-cyan-400 animate-pulse tracking-widest">INITIALIZING_NEURAL_ROUTERS...</span>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors mb-4 font-mono text-sm tracking-wide"
                >
                    ← BACK_TO_COMMAND_CENTER
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                            <Bot size={32} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-cyan-500">AI Gateway Core</h1>
                            <p className="text-slate-400 mt-1">Configure resilient multi-provider AI model routing and failover structures.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Master Switch & Vercel AI Gateway Config */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 mb-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none transition-opacity opacity-50 group-hover:opacity-100" />
                
                <div className="flex flex-col gap-6 relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/5 pb-6">
                        <div>
                            <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                                <Cpu className="text-cyan-400" size={20} />
                                System Status
                            </h2>
                            <p className="text-slate-400 text-sm max-w-2xl">
                                Enable or disable all generative AI features globally. Disabling this shuts down the gateway entirely.
                            </p>
                        </div>

                        <div className={`flex items-center gap-4 px-4 py-2 rounded-xl border ${config.enabled
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-slate-800/50 border-white/10'
                            }`}>
                            <span className={`text-[10px] uppercase font-bold font-mono tracking-widest ${config.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {config.enabled ? 'CORE_ONLINE' : 'CORE_OFFLINE'}
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.enabled}
                                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                                <Server size={14} /> Vercel AI Gateway URL
                            </label>
                            <input
                                type="text"
                                value={config.gatewayUrl}
                                onChange={(e) => setConfig({ ...config, gatewayUrl: e.target.value })}
                                placeholder="https://gateway.ai.vercel.cloud/v1/projects/.../gateways/..."
                                className="w-full bg-slate-950/80 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 outline-none text-sm font-mono placeholder:text-slate-700 transition-all"
                            />
                            <p className="text-[10px] text-slate-500 mt-1 font-mono">
                                Defaults to global endpoints if empty. Integrates with Vercel's proxy server.
                            </p>
                        </div>

                        <div>
                            <label className="block text-xs font-mono uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                                <Key size={14} /> Vercel AI Gateway API Key
                            </label>
                            {showGatewayKeyInput ? (
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        value={gatewayApiKey}
                                        onChange={(e) => setGatewayApiKey(e.target.value)}
                                        placeholder="Paste Vercel AI Gateway key..."
                                        autoComplete="new-password"
                                        className="flex-1 bg-slate-950/80 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-cyan-500/50 outline-none text-sm font-mono placeholder:text-slate-700 transition-all"
                                    />
                                    {config.hasGatewayApiKey && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowGatewayKeyInput(false);
                                                setGatewayApiKey('');
                                            }}
                                            className="px-3 py-2 bg-slate-800 text-xs text-slate-300 rounded border border-white/10 hover:bg-slate-700 font-mono transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 flex items-center justify-between">
                                    <span className="text-emerald-400 text-sm font-mono flex-1 truncate">
                                        •••• •••• •••• •••• (Saved securely)
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowGatewayKeyInput(true)}
                                        className="px-3 py-1 bg-slate-950/50 hover:bg-slate-900 text-[10px] text-slate-300 rounded border border-white/10 font-mono transition-colors uppercase"
                                    >
                                        Replace
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 4-SECTION LAYOUT */}
            <div className="space-y-8">

                {/* SECTION 1: AI PROVIDERS */}
                <div className="bg-slate-900/40 rounded-2xl border border-white/10 p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />
                    
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3 font-mono">
                        <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded">01</span>
                        AI Providers & Credentials
                        <div className="h-px bg-white/5 flex-grow" />
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Add Provider Panel */}
                        <div className="bg-slate-950/40 border border-white/5 p-5 rounded-xl flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-300 mb-4 font-mono uppercase tracking-wider">Configure Provider</h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Provider Type</label>
                                        <select
                                            value={providerForm.type}
                                            onChange={(e) => setProviderForm({ ...providerForm, type: e.target.value })}
                                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/50"
                                        >
                                            {PROVIDER_TYPES.map(t => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500">Provider Name</label>
                                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-mono text-indigo-400">
                                                <input
                                                    type="checkbox"
                                                    checked={providerForm.autoName}
                                                    onChange={(e) => setProviderForm({ ...providerForm, autoName: e.target.checked })}
                                                    className="rounded border-white/10 bg-slate-900 text-indigo-600 focus:ring-0"
                                                />
                                                Autogenerate
                                            </label>
                                        </div>
                                        <input
                                            type="text"
                                            value={providerForm.name}
                                            onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value, autoName: false })}
                                            disabled={providerForm.autoName}
                                            placeholder={providerForm.autoName ? "Auto-generates (e.g. Google API)" : "Enter custom provider name..."}
                                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/50 placeholder:text-slate-700 disabled:opacity-50"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">API Secret Key</label>
                                        <input
                                            type="password"
                                            value={providerForm.apiKey}
                                            onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })}
                                            placeholder="Paste API Key here..."
                                            autoComplete="new-password"
                                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 outline-none focus:border-indigo-500/50 font-mono placeholder:text-slate-700"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={addProvider}
                                disabled={validatingProvider}
                                className="w-full mt-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold font-mono text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {validatingProvider ? (
                                    <>
                                        <Loader2 className="animate-spin" size={14} /> Validating...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={14} /> Add Provider Instance
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Configured Providers List */}
                        <div className="lg:col-span-2 space-y-3">
                            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500">Configured Instances</h3>
                            
                            {config.providers.length === 0 ? (
                                <div className="h-44 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-slate-500 font-mono text-xs">
                                    NO_ACTIVE_PROVIDERS_CONFIGURED
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {config.providers.map(p => (
                                        <div key={p.id} className="bg-slate-950/60 border border-white/5 p-4 rounded-xl flex flex-col justify-between hover:border-white/10 transition-colors">
                                            <div className="flex justify-between items-start gap-2 mb-3">
                                                <div>
                                                    <h4 className="font-bold text-slate-200 text-sm truncate">{p.name || `${p.type.toUpperCase()} API`}</h4>
                                                    <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest">{p.type}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteProvider(p.id)}
                                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all"
                                                    title="Delete Provider Instance"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-2 bg-slate-900 border border-white/5 rounded-lg px-3 py-2">
                                                <Lock size={12} className="text-emerald-500" />
                                                <span className="text-[10px] font-mono text-emerald-500 flex-1 truncate">
                                                    •••• •••• •••• ••••
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* SECTION 2: AI MODELS */}
                <div className="bg-slate-900/40 rounded-2xl border border-white/10 p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-[80px] pointer-events-none" />
                    
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-3 font-mono">
                        <span className="text-xs bg-violet-500/20 text-violet-400 border border-violet-500/30 px-2 py-0.5 rounded">02</span>
                        Model Parameters Configuration
                        <div className="h-px bg-white/5 flex-grow" />
                    </h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Add Model Panel */}
                        <div className="bg-slate-950/40 border border-white/5 p-5 rounded-xl flex flex-col justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-300 mb-4 font-mono uppercase tracking-wider">Configure Model</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Link to Provider</label>
                                        <select
                                            value={modelForm.providerId}
                                            onChange={(e) => {
                                                const pid = e.target.value;
                                                const prov = config.providers.find(p => p.id === pid);
                                                const defaultModelId = PROVIDER_TYPES.find(pt => pt.id === prov?.type)?.defaultModel || '';
                                                setModelForm({
                                                    ...modelForm,
                                                    providerId: pid,
                                                    modelId: defaultModelId
                                                });
                                                if (prov) {
                                                    fetchRemoteModels(prov);
                                                }
                                            }}
                                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 outline-none focus:border-violet-500/50"
                                        >
                                            <option value="" disabled>Select a configured provider...</option>
                                            {config.providers.map(p => (
                                                <option key={p.id} value={p.id}>{p.name || `${p.type.toUpperCase()} API`}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {modelForm.providerId && (() => {
                                        const prov = config.providers.find(p => p.id === modelForm.providerId);
                                        const type = prov?.type || 'google';
                                        const commons = COMMON_MODELS[type] || [];
                                        const remotes = remoteModels[modelForm.providerId] || [];
                                        const loading = loadingRemoteModels[modelForm.providerId];

                                        return (
                                            <div>
                                                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2 flex justify-between">
                                                    <span>Model Identifier</span>
                                                    {loading && <Loader2 className="animate-spin text-violet-400" size={10} />}
                                                </label>
                                                <select
                                                    value={modelForm.modelId}
                                                    onChange={(e) => setModelForm({ ...modelForm, modelId: e.target.value })}
                                                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 outline-none focus:border-violet-500/50"
                                                >
                                                    <optgroup label="Common/Pre-configured Models">
                                                        {commons.map(m => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        ))}
                                                    </optgroup>
                                                    
                                                    {remotes.length > 0 && (
                                                        <optgroup label="Discovered Online Models">
                                                            {remotes.map(m => (
                                                                <option key={m.id} value={m.id}>{m.name}</option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                    <option value="custom">Custom/Manual Model Identifier</option>
                                                </select>
                                            </div>
                                        );
                                    })()}

                                    {modelForm.modelId === 'custom' && (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Enter Model ID</label>
                                                <input
                                                    type="text"
                                                    value={modelForm.customModelId}
                                                    onChange={(e) => setModelForm({ ...modelForm, customModelId: e.target.value })}
                                                    placeholder="e.g. gpt-4o-mini-2024-07-18"
                                                    className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 outline-none focus:border-violet-500/50 font-mono"
                                                />
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="custom-model-free"
                                                    checked={modelForm.isFree}
                                                    onChange={(e) => setModelForm({ ...modelForm, isFree: e.target.checked })}
                                                    className="rounded border-white/10 bg-slate-900 text-violet-600 focus:ring-0"
                                                />
                                                <label htmlFor="custom-model-free" className="text-xs text-slate-400 font-mono">This is a Free tier model</label>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Model Label (Display Name)</label>
                                        <input
                                            type="text"
                                            value={modelForm.name}
                                            onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                                            placeholder="e.g. Gemini 2.0 Flash Lite"
                                            className="w-full bg-slate-900 border border-white/10 rounded-lg p-2.5 text-sm text-slate-200 outline-none focus:border-violet-500/50"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={addModel}
                                className="w-full mt-6 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold font-mono text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> Add Model Parameter
                            </button>
                        </div>

                        {/* Configured Models List */}
                        <div className="lg:col-span-2 space-y-3">
                            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-500">Configured Models</h3>

                            {config.models.length === 0 ? (
                                <div className="h-44 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-slate-500 font-mono text-xs">
                                    NO_MODELS_CONFIGURED
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {config.models.map(m => {
                                        const prov = config.providers.find(p => p.id === m.providerId);
                                        return (
                                            <div key={m.id} className="bg-slate-950/60 border border-white/5 p-4 rounded-xl flex flex-col justify-between hover:border-white/10 transition-colors">
                                                <div className="flex justify-between items-start gap-2 mb-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-slate-200 text-sm">{m.name}</h4>
                                                            {m.isFree && (
                                                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                                                                    Free
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] font-mono text-slate-500 block truncate mt-1">ID: {m.modelId}</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteModel(m.id)}
                                                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all"
                                                        title="Delete Model Parameter"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5 justify-between">
                                                    <span className="text-[10px] font-mono text-violet-400">Provider: {prov?.name || prov?.type || 'Unknown'}</span>
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePriority(m.id, 'text')}
                                                            className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${config.textPriority.includes(m.id)
                                                                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                                                : 'bg-slate-900 text-slate-500 border-white/5 hover:text-slate-300'
                                                            }`}
                                                        >
                                                            Text Gen
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePriority(m.id, 'image')}
                                                            className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${config.imagePriority.includes(m.id)
                                                                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                                                                : 'bg-slate-900 text-slate-500 border-white/5 hover:text-slate-300'
                                                            }`}
                                                        >
                                                            Vision
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* PRIORITY ROUTING BLOCKS (SECTIONS 3 & 4) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* SECTION 3: TEXT GENERATION PRIORITY */}
                    <div className="bg-slate-900/40 rounded-2xl border border-white/10 p-6 relative overflow-hidden group flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
                        
                        <div>
                            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-3 font-mono">
                                <span className="text-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded">03</span>
                                Text priority fallback flow
                            </h2>
                            <p className="text-slate-400 text-xs mb-6 font-mono">Drag list items or use arrows to define failover order. If a model fails, it falls back to the next one.</p>

                            {config.textPriority.length === 0 ? (
                                <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-slate-500 font-mono text-xs">
                                    NO_MODELS_ACTIVE_IN_TEXT_PRIORITY
                                    <p className="text-[10px] text-slate-600 mt-2">Activate Text Gen in Section 2 above.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {config.textPriority.map((modelId, idx) => {
                                        const model = config.models.find(m => m.id === modelId);
                                        const prov = model ? config.providers.find(p => p.id === model.providerId) : null;
                                        if (!model) return null;

                                        return (
                                            <div key={model.id} className="flex flex-col items-center">
                                                {idx > 0 && (
                                                    <div className="my-1.5 flex flex-col items-center gap-0.5">
                                                        <div className="w-0.5 h-3 bg-cyan-500/20" />
                                                        <div className="w-1.5 h-1.5 border-r border-b border-cyan-500/40 transform rotate-45" />
                                                    </div>
                                                )}
                                                
                                                <div
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, idx, 'text')}
                                                    onDragOver={(e) => handleDragOver(e, idx, 'text')}
                                                    onDragEnd={handleDragEnd}
                                                    className="w-full bg-slate-950/80 border border-white/5 hover:border-cyan-500/30 transition-all rounded-xl p-3 flex items-center justify-between gap-3 group/item shadow-inner cursor-grab active:cursor-grabbing"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-slate-600 group-hover/item:text-cyan-500 transition-colors">
                                                            <GripVertical size={16} />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono text-slate-500">{idx + 1}.</span>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-slate-200">{model.name}</span>
                                                                    {model.isFree && (
                                                                        <span className="text-[9px] text-emerald-400 font-mono">free</span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] font-mono text-slate-500">ID: {model.modelId} ({prov?.name || prov?.type})</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-40 group-hover/item:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            onClick={() => moveItem(idx, -1, 'text')}
                                                            disabled={idx === 0}
                                                            className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                                        >
                                                            <ArrowUp size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveItem(idx, 1, 'text')}
                                                            disabled={idx === config.textPriority.length - 1}
                                                            className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                                        >
                                                            <ArrowDown size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECTION 4: IMAGE GENERATION PRIORITY */}
                    <div className="bg-slate-900/40 rounded-2xl border border-white/10 p-6 relative overflow-hidden group flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />
                        
                        <div>
                            <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-3 font-mono">
                                <span className="text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded">04</span>
                                Image Captioning Fallback Flow
                            </h2>
                            <p className="text-slate-400 text-xs mb-6 font-mono">Drag list items or use arrows to define failover order. Vision models will process HEIC/JPEG captions.</p>

                            {config.imagePriority.length === 0 ? (
                                <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-slate-500 font-mono text-xs">
                                    NO_MODELS_ACTIVE_IN_VISION_PRIORITY
                                    <p className="text-[10px] text-slate-600 mt-2">Activate Vision in Section 2 above.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {config.imagePriority.map((modelId, idx) => {
                                        const model = config.models.find(m => m.id === modelId);
                                        const prov = model ? config.providers.find(p => p.id === model.providerId) : null;
                                        if (!model) return null;

                                        return (
                                            <div key={model.id} className="flex flex-col items-center">
                                                {idx > 0 && (
                                                    <div className="my-1.5 flex flex-col items-center gap-0.5">
                                                        <div className="w-0.5 h-3 bg-purple-500/20" />
                                                        <div className="w-1.5 h-1.5 border-r border-b border-purple-500/40 transform rotate-45" />
                                                    </div>
                                                )}
                                                
                                                <div
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, idx, 'image')}
                                                    onDragOver={(e) => handleDragOver(e, idx, 'image')}
                                                    onDragEnd={handleDragEnd}
                                                    className="w-full bg-slate-950/80 border border-white/5 hover:border-purple-500/30 transition-all rounded-xl p-3 flex items-center justify-between gap-3 group/item shadow-inner cursor-grab active:cursor-grabbing"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="text-slate-600 group-hover/item:text-purple-500 transition-colors">
                                                            <GripVertical size={16} />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono text-slate-500">{idx + 1}.</span>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-bold text-slate-200">{model.name}</span>
                                                                    {model.isFree && (
                                                                        <span className="text-[9px] text-emerald-400 font-mono">free</span>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] font-mono text-slate-500">ID: {model.modelId} ({prov?.name || prov?.type})</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-40 group-hover/item:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            onClick={() => moveItem(idx, -1, 'image')}
                                                            disabled={idx === 0}
                                                            className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                                        >
                                                            <ArrowUp size={14} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => moveItem(idx, 1, 'image')}
                                                            disabled={idx === config.imagePriority.length - 1}
                                                            className="p-1 hover:bg-white/5 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                                        >
                                                            <ArrowDown size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* System Persona Section */}
                <div className="bg-slate-900/40 rounded-2xl border border-white/10 p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[80px] pointer-events-none" />
                    
                    <h2 className="text-sm font-mono text-cyan-400 uppercase tracking-widest mb-6 flex items-center gap-3">
                        <Settings size={14} /> Global System Instructions
                        <div className="h-px bg-white/5 flex-grow" />
                    </h2>

                    <div className="grid grid-cols-1 gap-6 relative z-10">
                        <div>
                            <textarea
                                value={config.systemInstruction}
                                onChange={(e) => setConfig({ ...config, systemInstruction: e.target.value })}
                                rows={6}
                                placeholder="Define how the AI should behave globally..."
                                className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-4 text-slate-300 text-sm focus:border-cyan-500/50 outline-none resize-none placeholder:text-slate-700 custom-scrollbar shadow-inner"
                            />
                            <p className="text-[10px] text-slate-500 mt-2 font-mono">
                                This base instruction is prepended to all system prompts to restrict logic, tone, and formatting constraints.
                            </p>
                        </div>
                    </div>
                </div>

                {/* SAVE BUTTON */}
                <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-8 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] disabled:opacity-50 disabled:cursor-not-allowed text-xs uppercase tracking-widest flex items-center gap-2 font-mono"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="animate-spin" size={14} />
                                SAVING_ROUTER_STATE...
                            </>
                        ) : (
                            'UPDATE_NEURAL_CORE'
                        )}
                    </button>
                </div>
            </div>

            {/* AI Telemetry & Logs Section */}
            <div className="my-12">
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent w-full" />
            </div>

            <div className="mb-12">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                    <Database className="text-cyan-400" /> AI Telemetry & Access Logs
                </h2>

                {loadingTelemetry ? (
                    <div className="p-12 flex flex-col items-center justify-center bg-slate-900/30 rounded-2xl border border-white/5">
                        <Loader2 className="animate-spin text-cyan-500 mb-4" size={32} />
                        <span className="text-slate-400 font-mono text-sm uppercase tracking-widest">Compiling Telemetry data...</span>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Token Stats Overview */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-slate-900/50 rounded-xl border border-white/10 p-6 flex flex-col justify-center">
                                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-1">Global Sum</span>
                                <span className="text-3xl font-bold text-white truncate">{overallTotalTokens.toLocaleString()}</span>
                                <span className="text-xs text-emerald-400 mt-2 flex items-center gap-1"><BarChart3 size={12} /> Total Tokens Used</span>
                            </div>

                            {PROVIDER_TYPES.map(p => {
                                const statLine = telemetryStats?.[p.id];
                                return (
                                    <div key={p.id} className="bg-slate-900/30 rounded-xl border border-white/5 p-6 relative overflow-hidden">
                                        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-[40px] opacity-20 ${
                                            p.id === 'google' ? 'bg-blue-500' : p.id === 'groq' ? 'bg-emerald-500' : p.id === 'openai' ? 'bg-indigo-500' : 'bg-purple-500'
                                        }`} />

                                        <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-1">{p.name}</span>
                                        <span className="text-2xl font-bold text-slate-200 truncate block">
                                            {statLine ? statLine.total.toLocaleString() : '0'} <span className="text-xs font-normal text-slate-500">Tokens</span>
                                        </span>
                                        <div className="mt-3 flex items-center gap-3 text-[10px] font-mono text-slate-400">
                                            <span title="Input Tokens">IN: {statLine?.input?.toLocaleString() || 0}</span>
                                            <span title="Output Tokens">OUT: {statLine?.output?.toLocaleString() || 0}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-600 block mt-2">Requests: {statLine?.requests || 0}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Recent History Table */}
                        <div className="bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden">
                            <div className="p-4 bg-slate-900/80 border-b border-white/5 flex items-center justify-between">
                                <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">Recent Generation History (Last 50)</span>
                                <button onClick={fetchTelemetry} className="text-xs text-cyan-500 hover:text-cyan-400 font-mono flex items-center gap-2 transition-colors">
                                    <Clock size={12} /> Refresh
                                </button>
                            </div>

                            {telemetryLogs.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 text-sm font-mono">No telemetry records found.</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-950/50 text-[10px] uppercase font-mono tracking-widest text-slate-500">
                                                <th className="p-4 border-b border-white/5 font-normal">Timestamp</th>
                                                <th className="p-4 border-b border-white/5 font-normal">Provider / Mode</th>
                                                <th className="p-4 border-b border-white/5 font-normal max-w-xs">Data Snippet</th>
                                                <th className="p-4 border-b border-white/5 font-normal text-right">Tokens Used</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {telemetryLogs.map((log) => (
                                                <tr key={log.id} className="border-b border-white/5 last:border-0 hover:bg-slate-800/30 transition-colors">
                                                    <td className="p-4 text-xs text-slate-400 whitespace-nowrap">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="p-4 text-xs">
                                                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1 ${
                                                            log.provider === 'google' || log.provider === 'gemini' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                            log.provider === 'groq' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                                            log.provider === 'openai' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                                                            'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                        }`}>
                                                            {log.provider}
                                                        </span>
                                                        <div className="text-[10px] text-slate-500 font-mono mt-1">{log.mode}</div>
                                                    </td>
                                                    <td className="p-4 max-w-xs">
                                                        <div className="text-xs text-slate-300 truncate mb-1">
                                                            <span className="text-slate-500 font-mono mr-2">P:</span>
                                                            {log.prompt || '<No prompt / Image input>'}
                                                        </div>
                                                        <div className="text-xs text-slate-400 truncate">
                                                            <span className="text-slate-500 font-mono mr-2">R:</span>
                                                            {log.response || '<No response>'}
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <span className="text-sm font-bold text-slate-200 block">{log.totalTokens?.toLocaleString()}</span>
                                                        <span className="text-[10px] text-slate-500 font-mono">{log.inputTokens} IN / {log.outputTokens} OUT</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className={`fixed bottom-8 right-8 p-4 rounded-xl border shadow-2xl backdrop-blur-xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${notification.success
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                    {notification.success ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                    <span className="font-mono text-sm font-bold">{notification.message}</span>
                </div>
            )}
        </div>
    );
}
