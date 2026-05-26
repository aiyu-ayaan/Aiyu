"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import Toast from './Toast';

const PLACEMENT_KEYS = ['top', 'middle', 'bottom', 'sidebar', 'footer'];
const AD_TYPES = [
    { value: 'display', label: 'Display Ad (Auto)' },
    { value: 'in-article', label: 'In-article Ad' },
    { value: 'in-feed', label: 'In-feed Ad' },
    { value: 'multiplex', label: 'Multiplex Ad' }
];

const AdsForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        adsenseEnabled: false,
        clientId: '',
        placements: {
            top: { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
            middle: { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
            bottom: { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
            sidebar: { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
            footer: { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' }
        }
    });
    const [activeSlot, setActiveSlot] = useState('top');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/admin/ads');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData({
                        adsenseEnabled: data.adsenseEnabled || false,
                        clientId: data.clientId || '',
                        placements: {
                            top: data.placements?.top || { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
                            middle: data.placements?.middle || { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
                            bottom: data.placements?.bottom || { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
                            sidebar: data.placements?.sidebar || { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
                            footer: data.placements?.footer || { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' }
                        }
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch ads config', err);
        } finally {
            setLoading(false);
        }
    };

    const handleGlobalChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handlePlacementChange = (e, key) => {
        const { name, value, type, checked } = e.target;
        setFormData((prev) => ({
            ...prev,
            placements: {
                ...prev.placements,
                [key]: {
                    ...prev.placements[key],
                    [name]: type === 'checkbox' ? checked : value
                }
            }
        }));
    };

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            const response = await fetch('/api/admin/ads', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                showNotification(true, 'Google AdSense Config Updated');
                router.refresh();
            } else {
                const data = await response.json();
                setError(data.error || 'Failed to update');
                showNotification(false, data.error || 'Failed to update');
            }
        } catch {
            setError('An error occurred');
            showNotification(false, 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-green-400 font-mono animate-pulse">LOADING_ADS_CONFIG...</div>;

    const renderSlotBox = (id, label, styleClasses) => {
        const isActive = activeSlot === id;
        const isEnabled = formData.placements[id].enabled;
        const hasSlotId = !!formData.placements[id].slotId;

        return (
            <div 
                onClick={() => setActiveSlot(id)}
                className={`cursor-pointer border-2 transition-all duration-200 flex items-center justify-center p-2 rounded-md font-mono text-xs
                    ${isActive ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)] bg-green-500/10 scale-[1.02] z-10 relative' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}
                    ${styleClasses}
                `}
            >
                <div className="flex flex-col items-center gap-1">
                    <span className={isActive ? 'text-green-400 font-bold' : 'text-slate-400'}>{label}</span>
                    <div className="flex gap-2 text-[10px]">
                        {isEnabled ? <span className="text-green-500 flex items-center gap-1"><FaCheckCircle/> ON</span> : <span className="text-slate-600">OFF</span>}
                        {isEnabled && !hasSlotId && <span className="text-amber-500 flex items-center gap-1"><FaExclamationCircle/> NO ID</span>}
                    </div>
                </div>
            </div>
        );
    };

    const activePlacement = formData.placements[activeSlot];

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-3">
                    <span className="text-xl">⚠️</span>{error}
                </div>
            )}

            {/* Global Settings */}
            <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                <h2 className="text-sm font-mono text-green-500/70 uppercase tracking-widest mb-6">Global Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                    <div className="flex items-center gap-3 bg-slate-950/50 p-4 rounded-lg border border-white/5 h-12">
                        <input
                            type="checkbox" id="adsenseEnabled" name="adsenseEnabled"
                            checked={formData.adsenseEnabled} onChange={handleGlobalChange}
                            className="w-5 h-5 rounded border-white/10 bg-slate-900 text-green-500 focus:ring-green-500 focus:ring-offset-slate-900"
                        />
                        <label htmlFor="adsenseEnabled" className="text-slate-300 font-bold uppercase tracking-wide cursor-pointer">
                            Enable Google AdSense Globally
                        </label>
                    </div>
                    <div>
                        <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Master Client ID (data-ad-client)</label>
                        <input
                            type="text" name="clientId" value={formData.clientId} onChange={handleGlobalChange}
                            placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                            className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-green-500/50 focus:ring-1 outline-none font-mono"
                        />
                    </div>
                </div>
                <div className="mt-6 rounded-xl border border-green-500/20 bg-slate-950/70 overflow-hidden">
                    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${formData.adsenseEnabled ? 'bg-green-400 shadow-[0_0_14px_rgba(74,222,128,0.75)]' : 'bg-slate-600'}`} />
                                <h3 className="text-white font-bold tracking-tight">Script Preview & Verification</h3>
                                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${formData.adsenseEnabled ? 'border-green-500/30 text-green-300 bg-green-500/10' : 'border-slate-700 text-slate-500 bg-slate-900'}`}>
                                    {formData.adsenseEnabled ? 'Head Injection On' : 'Head Injection Off'}
                                </span>
                            </div>
                            <p className="text-sm leading-6 text-slate-300">
                                Enabling Google AdSense globally injects the ownership verification and auto-ads script into the HTML head on every public page using the saved Master Client ID.
                            </p>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                                Turning it off removes the script tag and stops site-wide AdSense loading after the configuration is saved.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs font-mono text-slate-400 sm:min-w-[260px]">
                            <div className="rounded-lg border border-white/5 bg-slate-900/80 p-3">
                                <span className="block text-slate-500 uppercase tracking-wider">Scope</span>
                                <span className="mt-1 block text-green-300">Site head</span>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-slate-900/80 p-3">
                                <span className="block text-slate-500 uppercase tracking-wider">Mode</span>
                                <span className="mt-1 block text-green-300">Auto ads</span>
                            </div>
                        </div>
                    </div>
                    <div className="border-t border-white/5 bg-black/40 p-5">
                        <div className={`rounded-lg border p-4 ${formData.adsenseEnabled && formData.clientId.trim() ? 'border-green-500/20 bg-green-500/10' : 'border-amber-500/20 bg-amber-500/10'}`}>
                            <p className={`text-sm font-bold ${formData.adsenseEnabled && formData.clientId.trim() ? 'text-green-300' : 'text-amber-200'}`}>
                                {formData.adsenseEnabled && formData.clientId.trim()
                                    ? 'AdSense header script is ready'
                                    : 'AdSense header script is not active yet'}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-slate-300">
                                {formData.adsenseEnabled && formData.clientId.trim()
                                    ? 'After saving, the Google AdSense verification and auto-ads script tag will be added to the HTML head across the site.'
                                    : 'Enable Google AdSense globally and enter a Master Client ID to add the script tag to the HTML head across the site.'}
                            </p>
                        </div>
                    </div>
                    {!formData.clientId.trim() && (
                        <div className="border-t border-amber-500/20 bg-amber-500/10 px-5 py-3 text-xs text-amber-200">
                            Add a Master Client ID to replace the placeholder before enabling verification on the live site.
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left side: Wireframe Skeleton */}
                <div className="lg:col-span-5 bg-slate-950 rounded-2xl border border-white/10 p-6 flex flex-col items-center">
                    <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4 w-full text-center">Blog Detail Layout</h3>
                    
                    <div className="w-full max-w-[320px] bg-slate-900 rounded-xl p-4 border border-slate-800 shadow-xl flex flex-col gap-3 relative">
                        {/* Header Fake */}
                        <div className="w-full h-8 bg-slate-800 rounded-md mb-2"></div>
                        <div className="w-3/4 h-4 bg-slate-800 rounded-md mb-2"></div>
                        
                        {renderSlotBox('top', 'Top Placement', 'w-full h-16')}
                        
                        <div className="flex gap-4 w-full mt-2">
                            {/* Main Content Area */}
                            <div className="flex-grow flex flex-col gap-3">
                                <div className="w-full h-24 bg-slate-800 rounded-md"></div>
                                <div className="w-full h-3 bg-slate-800 rounded-sm"></div>
                                <div className="w-5/6 h-3 bg-slate-800 rounded-sm"></div>
                                
                                {renderSlotBox('middle', 'Middle Placement', 'w-full h-16 my-2')}
                                
                                <div className="w-full h-3 bg-slate-800 rounded-sm"></div>
                                <div className="w-4/6 h-3 bg-slate-800 rounded-sm mb-4"></div>
                                
                                {renderSlotBox('bottom', 'Bottom Placement', 'w-full h-16')}
                            </div>
                            
                            {/* Sidebar Area */}
                            <div className="w-1/3 flex flex-col gap-3 shrink-0">
                                <div className="w-full h-32 bg-slate-800 rounded-md"></div>
                                {renderSlotBox('sidebar', 'Sidebar', 'w-full h-24')}
                            </div>
                        </div>

                        <div className="w-full h-px bg-slate-800 my-2"></div>
                        
                        {/* Footer / Links Fake */}
                        <div className="w-1/2 h-6 bg-slate-800 rounded-md mb-2"></div>
                        {renderSlotBox('footer', 'Footer Placement', 'w-full h-16')}
                    </div>
                </div>

                {/* Right side: Slot Configuration Panel */}
                <div className="lg:col-span-7 bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-white/10 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[100px] pointer-events-none" />
                    
                    <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                        <h2 className="text-xl font-bold text-white capitalize tracking-tight flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            {activeSlot} Placement Config
                        </h2>
                        <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-white/10">
                            <input
                                type="checkbox" id={`enabled-${activeSlot}`} name="enabled"
                                checked={activePlacement.enabled} onChange={(e) => handlePlacementChange(e, activeSlot)}
                                className="w-4 h-4 rounded border-white/10 bg-slate-900 text-green-500 focus:ring-green-500 focus:ring-offset-slate-900 cursor-pointer"
                            />
                            <label htmlFor={`enabled-${activeSlot}`} className="text-slate-300 text-xs font-bold uppercase cursor-pointer pr-2">
                                Enable Slot
                            </label>
                        </div>
                    </div>

                    <div className={`space-y-6 transition-opacity duration-300 ${activePlacement.enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                        <div>
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Ad Type / Format</label>
                            <select
                                name="adType" value={activePlacement.adType} onChange={(e) => handlePlacementChange(e, activeSlot)}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-green-500/50 outline-none font-mono appearance-none"
                            >
                                {AD_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider">Slot ID (data-ad-slot)</label>
                            <input
                                type="text" name="slotId" value={activePlacement.slotId} onChange={(e) => handlePlacementChange(e, activeSlot)}
                                placeholder="XXXXXXXXXX"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg p-3 text-slate-200 focus:border-green-500/50 outline-none font-mono"
                            />
                        </div>

                        {activePlacement.adType === 'in-feed' && (
                            <div className="animate-fade-in">
                                <label className="block text-slate-400 mb-2 text-xs font-mono uppercase tracking-wider text-amber-400">Layout Key (Required for In-feed)</label>
                                <input
                                    type="text" name="adLayoutKey" value={activePlacement.adLayoutKey} onChange={(e) => handlePlacementChange(e, activeSlot)}
                                    placeholder="-fb+5w+4e-db+86"
                                    className="w-full bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 text-slate-200 focus:border-amber-500/50 outline-none font-mono placeholder:text-slate-600"
                                />
                                <p className="text-xs text-amber-500/70 mt-2">Required by Google for matching the visual style of your feed.</p>
                            </div>
                        )}
                        
                        <div className="bg-slate-950 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-slate-500">
                            <span className="text-green-500/50 block mb-2">{'// Generated Attributes Preview'}</span>
                            data-ad-client="{formData.clientId || 'ca-pub-...'}"<br/>
                            data-ad-slot="{activePlacement.slotId || '...'}"<br/>
                            {activePlacement.adType === 'display' && <>data-ad-format="auto"<br/>data-full-width-responsive="true"</>}
                            {activePlacement.adType === 'in-article' && <>data-ad-layout="in-article"<br/>data-ad-format="fluid"</>}
                            {activePlacement.adType === 'in-feed' && <>data-ad-format="fluid"<br/>data-ad-layout-key="{activePlacement.adLayoutKey || '...'}"</>}
                            {activePlacement.adType === 'multiplex' && <>data-ad-format="autorelaxed"</>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="sticky bottom-8 flex justify-end gap-4 pt-6 border-t border-white/5 bg-slate-900/90 backdrop-blur-lg p-4 rounded-xl shadow-2xl z-50">
                <button type="button" onClick={() => router.back()} className="px-6 py-2 rounded bg-white/5 hover:bg-white/10 text-slate-400 transition-colors text-sm font-medium">
                    CANCEL
                </button>
                <button type="submit" disabled={saving} className="px-8 py-2 rounded bg-green-600 hover:bg-green-500 text-white font-bold transition-all shadow-[0_0_20px_rgba(34,197,94,0.3)] disabled:opacity-50 text-sm tracking-wide flex items-center gap-2">
                    {saving ? 'SAVING...' : 'SAVE CONFIGURATION'}
                </button>
            </div>
            <Toast notification={notification} />
        </form>
    );
};

export default AdsForm;
