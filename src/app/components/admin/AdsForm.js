"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaCircleCheck, FaCircleExclamation, FaFloppyDisk, FaSpinner } from 'react-icons/fa6';
import Toast from './Toast';
import { Badge, Field, Loading, Panel } from './ui';
import '@/app/styles/admin-structure.css';

const PLACEMENT_KEYS = ['top', 'middle', 'bottom', 'sidebar', 'footer'];
const PLACEMENT_LABELS = {
    top: 'Top banner',
    middle: 'Mid-article',
    bottom: 'End of article',
    sidebar: 'Sidebar rail',
    footer: 'Footer banner',
};
const AD_TYPES = [
    { value: 'display', label: 'Display ad (auto)' },
    { value: 'in-article', label: 'In-article ad' },
    { value: 'in-feed', label: 'In-feed ad' },
    { value: 'multiplex', label: 'Multiplex ad' },
];

const AdsForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        adsenseEnabled: false,
        clientId: '',
        adsTxt: '',
        placements: {
            top: { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
            middle: { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
            bottom: { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
            sidebar: { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
            footer: { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
        },
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
                        adsTxt: data.adsTxt || '',
                        placements: {
                            top: data.placements?.top || { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
                            middle: data.placements?.middle || { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
                            bottom: data.placements?.bottom || { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
                            sidebar: data.placements?.sidebar || { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
                            footer: data.placements?.footer || { enabled: false, slotId: '', adType: 'display', adLayoutKey: '' },
                        },
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
            [name]: type === 'checkbox' ? checked : value,
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
                    [name]: type === 'checkbox' ? checked : value,
                },
            },
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
                showNotification(true, 'AdSense configuration saved');
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

    if (loading) {
        return (
            <section className="adm-panel">
                <Loading label="Loading AdSense configuration" rows={6} />
            </section>
        );
    }

    const renderSlotBox = (id, label, extraClass = '') => {
        const isActive = activeSlot === id;
        const slot = formData.placements[id];
        const isEnabled = slot.enabled;
        const hasSlotId = Boolean(slot.slotId);

        return (
            <button
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveSlot(id)}
                className={`adm-wireframe-slot ${extraClass}`}
            >
                <span className="font-semibold text-[var(--text-bright)]">{label}</span>
                <span className="flex items-center gap-1.5 text-[11px]">
                    {isEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[var(--adm-ok-ink)]">
                            <FaCircleCheck aria-hidden="true" /> Enabled
                        </span>
                    ) : (
                        <span className="text-[var(--adm-hint)]">Off</span>
                    )}
                    {isEnabled && !hasSlotId && (
                        <span className="inline-flex items-center gap-1 text-[var(--adm-warn-ink)]">
                            <FaCircleExclamation aria-hidden="true" /> Missing ID
                        </span>
                    )}
                </span>
            </button>
        );
    };

    const activePlacement = formData.placements[activeSlot];
    const headScriptReady = Boolean(formData.adsenseEnabled && formData.clientId.trim());
    const enabledSlotsCount = PLACEMENT_KEYS.filter((k) => formData.placements[k]?.enabled).length;

    return (
        <form onSubmit={handleSubmit} className="adm-split">
            <div className="adm-stack">
                {error && (
                    <div role="alert" className="adm-notice adm-notice-error">
                        {error}
                    </div>
                )}

                <Panel
                    title="Global settings"
                    actions={
                        <Badge tone={headScriptReady ? 'ok' : 'warn'}>
                            {headScriptReady ? 'Head injection on' : 'Head injection off'}
                        </Badge>
                    }
                >
                    <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 md:items-start">
                            <label className="adm-choice">
                                <input
                                    type="checkbox"
                                    id="adsenseEnabled"
                                    name="adsenseEnabled"
                                    checked={formData.adsenseEnabled}
                                    onChange={handleGlobalChange}
                                    className="adm-check"
                                />
                                <div>
                                    <span className="font-semibold text-[var(--text-bright)]">
                                        Enable Google AdSense globally
                                    </span>
                                    <p className="adm-help">
                                        Inject ownership verification and auto-ads script into the HTML head.
                                    </p>
                                </div>
                            </label>

                            <Field
                                label="Publisher client ID (data-ad-client)"
                                help="Your Google AdSense publisher identifier."
                            >
                                <input
                                    type="text"
                                    name="clientId"
                                    value={formData.clientId}
                                    onChange={handleGlobalChange}
                                    placeholder="ca-pub-XXXXXXXXXXXXXXXX"
                                    className="adm-input font-mono"
                                />
                            </Field>
                        </div>

                        <div className={`adm-notice ${headScriptReady ? 'adm-notice-ok' : 'adm-notice-warn'}`}>
                            <p className="font-semibold">
                                {headScriptReady
                                    ? 'AdSense header script is ready'
                                    : 'AdSense header script is not active yet'}
                            </p>
                            <p className="mt-1 text-xs">
                                {headScriptReady
                                    ? 'The Google AdSense verification and auto-ads script tag is injected into the HTML head on public pages.'
                                    : 'Enable Google AdSense globally and enter a Publisher Client ID to inject the script tag into the public HTML head.'}
                            </p>
                        </div>
                    </div>
                </Panel>

                <Panel title="Placement slots">
                    <div role="tablist" aria-label="Ad placements" className="adm-tabs mb-5">
                        {PLACEMENT_KEYS.map((key) => {
                            const slot = formData.placements[key];
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={activeSlot === key}
                                    onClick={() => setActiveSlot(key)}
                                    className="adm-tab"
                                >
                                    <span>{PLACEMENT_LABELS[key]}</span>
                                    <Badge tone={slot.enabled ? (slot.slotId ? 'ok' : 'warn') : undefined}>
                                        {slot.enabled ? (slot.slotId ? 'On' : 'No ID') : 'Off'}
                                    </Badge>
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
                        <div>
                            <p className="adm-help mb-2">Blog detail wireframe (click a slot to configure):</p>
                            <div className="adm-wireframe">
                                <div className="adm-wireframe-bar w-full" />
                                <div className="adm-wireframe-bar w-2/3" />

                                {renderSlotBox('top', 'Top placement')}

                                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2.5">
                                    <div className="flex flex-col gap-2">
                                        <div className="adm-wireframe-bar h-12 w-full" />
                                        <div className="adm-wireframe-bar w-full" />
                                        <div className="adm-wireframe-bar w-5/6" />

                                        {renderSlotBox('middle', 'Middle placement')}

                                        <div className="adm-wireframe-bar w-full" />
                                        <div className="adm-wireframe-bar w-4/6" />

                                        {renderSlotBox('bottom', 'Bottom placement')}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <div className="adm-wireframe-bar h-16 w-full" />
                                        {renderSlotBox('sidebar', 'Sidebar', 'min-h-24')}
                                    </div>
                                </div>

                                <div className="border-t border-[var(--hairline)] pt-2">
                                    {renderSlotBox('footer', 'Footer placement')}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] pb-3">
                                <div>
                                    <h3 className="font-semibold text-[var(--text-bright)]">
                                        {PLACEMENT_LABELS[activeSlot]} ({activeSlot})
                                    </h3>
                                    <p className="adm-help">Configure format and slot identifier for this placement.</p>
                                </div>
                                <label className="adm-choice !min-h-9 !px-3 !py-1.5">
                                    <input
                                        type="checkbox"
                                        id={`enabled-${activeSlot}`}
                                        name="enabled"
                                        checked={activePlacement.enabled}
                                        onChange={(e) => handlePlacementChange(e, activeSlot)}
                                        className="adm-check"
                                    />
                                    <span>Enable slot</span>
                                </label>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Ad format">
                                    <select
                                        name="adType"
                                        value={activePlacement.adType}
                                        onChange={(e) => handlePlacementChange(e, activeSlot)}
                                        disabled={!activePlacement.enabled}
                                        className="adm-input"
                                    >
                                        {AD_TYPES.map((type) => (
                                            <option key={type.value} value={type.value}>
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </Field>

                                <Field label="Slot ID (data-ad-slot)">
                                    <input
                                        type="text"
                                        name="slotId"
                                        value={activePlacement.slotId}
                                        onChange={(e) => handlePlacementChange(e, activeSlot)}
                                        disabled={!activePlacement.enabled}
                                        placeholder="XXXXXXXXXX"
                                        className="adm-input font-mono"
                                    />
                                </Field>
                            </div>

                            {activePlacement.adType === 'in-feed' && (
                                <Field
                                    label="Layout key (data-ad-layout-key)"
                                    help="Required by Google AdSense for matching the visual style of your feed."
                                >
                                    <input
                                        type="text"
                                        name="adLayoutKey"
                                        value={activePlacement.adLayoutKey}
                                        onChange={(e) => handlePlacementChange(e, activeSlot)}
                                        disabled={!activePlacement.enabled}
                                        placeholder="-fb+5w+4e-db+86"
                                        className="adm-input font-mono"
                                    />
                                </Field>
                            )}

                            <div>
                                <p className="adm-help mb-1.5">Generated attributes preview</p>
                                <pre className="adm-code text-xs">
                                    {`data-ad-client="${formData.clientId || 'ca-pub-...'}"\ndata-ad-slot="${activePlacement.slotId || '...'}"\n`}
                                    {activePlacement.adType === 'display' && `data-ad-format="auto"\ndata-full-width-responsive="true"`}
                                    {activePlacement.adType === 'in-article' && `data-ad-layout="in-article"\ndata-ad-format="fluid"`}
                                    {activePlacement.adType === 'in-feed' && `data-ad-format="fluid"\ndata-ad-layout-key="${activePlacement.adLayoutKey || '...'}"`}
                                    {activePlacement.adType === 'multiplex' && `data-ad-format="autorelaxed"`}
                                </pre>
                            </div>
                        </div>
                    </div>
                </Panel>

                <Panel
                    title="Dynamic ads.txt"
                    actions={
                        <a href="/ads.txt" target="_blank" rel="noreferrer" className="adm-link font-mono text-xs">
                            /ads.txt
                        </a>
                    }
                >
                    <Field
                        label="ads.txt content"
                        help="Google AdSense crawlers request /ads.txt regularly to verify publisher authorization."
                    >
                        <textarea
                            name="adsTxt"
                            value={formData.adsTxt}
                            onChange={handleGlobalChange}
                            placeholder="google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0"
                            rows={5}
                            className="adm-input font-mono"
                        />
                    </Field>
                </Panel>
            </div>

            <aside className="adm-stack adm-side">
                <Panel title="Publish">
                    <dl className="adm-facts mb-4">
                        <div>
                            <dt>Global script</dt>
                            <dd>{formData.adsenseEnabled ? 'Enabled' : 'Disabled'}</dd>
                        </div>
                        <div>
                            <dt>Active slots</dt>
                            <dd>{enabledSlotsCount} / {PLACEMENT_KEYS.length}</dd>
                        </div>
                    </dl>
                    <div className="flex flex-wrap gap-2">
                        <button type="submit" disabled={saving} className="adm-btn adm-btn-primary flex-1">
                            {saving ? <FaSpinner className="animate-spin" aria-hidden="true" /> : <FaFloppyDisk aria-hidden="true" />}
                            {saving ? 'Saving' : 'Save changes'}
                        </button>
                        <button type="button" onClick={() => router.back()} className="adm-btn">
                            Cancel
                        </button>
                    </div>
                </Panel>

                <Panel title="Slot overview" flush>
                    <ul className="adm-list">
                        {PLACEMENT_KEYS.map((key) => {
                            const slot = formData.placements[key];
                            return (
                                <li key={key}>
                                    <button
                                        type="button"
                                        onClick={() => setActiveSlot(key)}
                                        className="adm-row justify-between"
                                    >
                                        <div>
                                            <span className="font-medium text-[var(--text-bright)]">
                                                {PLACEMENT_LABELS[key]}
                                            </span>
                                            <span className="adm-help ml-2 font-mono text-xs">
                                                {slot.adType}
                                            </span>
                                        </div>
                                        <Badge tone={slot.enabled ? (slot.slotId ? 'ok' : 'warn') : undefined}>
                                            {slot.enabled ? (slot.slotId || 'No ID') : 'Off'}
                                        </Badge>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </Panel>
            </aside>

            <Toast notification={notification} />
        </form>
    );
};

export default AdsForm;
