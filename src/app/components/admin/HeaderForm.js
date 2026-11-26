"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FaFloppyDisk, FaGripVertical, FaPlus, FaSpinner, FaTrashCan } from 'react-icons/fa6';
import Toast from './Toast';
import { Badge, EmptyState, Field, Loading, Panel } from './ui';
import '@/app/styles/admin-structure.css';

function SortableNavRow({
    link,
    index,
    onChange,
    onRemove,
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: link._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const rowLabel = link.name?.trim() || `Link ${index + 1}`;

    return (
        <li
            ref={setNodeRef}
            style={style}
            className="grid gap-4 p-4 sm:px-5 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto_auto] lg:items-end"
        >
            <div className="flex items-center gap-2 lg:pb-1">
                <button
                    type="button"
                    className="adm-icon-btn cursor-grab active:cursor-grabbing"
                    aria-label={`Reorder ${rowLabel}`}
                    {...attributes}
                    {...listeners}
                >
                    <FaGripVertical aria-hidden="true" />
                </button>
                <span className="adm-num adm-help text-xs">#{index + 1}</span>
            </div>

            <Field label="Display label">
                <input
                    type="text"
                    value={link.name}
                    onChange={(e) => onChange(index, 'name', e.target.value)}
                    className="adm-input"
                    placeholder="Projects"
                />
            </Field>

            <Field label="Target path or URL">
                <input
                    type="text"
                    value={link.href}
                    onChange={(e) => onChange(index, 'href', e.target.value)}
                    className="adm-input font-mono"
                    placeholder="/projects"
                />
            </Field>

            <div className="flex flex-wrap items-center gap-2 lg:pb-0.5">
                <label className="adm-choice !min-h-10 !px-3 !py-1.5 text-xs">
                    <input
                        type="checkbox"
                        checked={link.visible !== false}
                        onChange={(e) => onChange(index, 'visible', e.target.checked)}
                        className="adm-check"
                    />
                    <span>Visible</span>
                </label>
                <label className="adm-choice !min-h-10 !px-3 !py-1.5 text-xs">
                    <input
                        type="checkbox"
                        checked={link.beta === true}
                        onChange={(e) => onChange(index, 'beta', e.target.checked)}
                        className="adm-check"
                    />
                    <span>Beta</span>
                </label>
                <label className="adm-choice !min-h-10 !px-3 !py-1.5 text-xs">
                    <input
                        type="checkbox"
                        checked={link.target === '_blank'}
                        onChange={(e) => onChange(index, 'target', e.target.checked ? '_blank' : '')}
                        className="adm-check"
                    />
                    <span>New tab</span>
                </label>
            </div>

            <div className="flex justify-end lg:pb-0.5">
                <button
                    type="button"
                    onClick={() => onRemove(index)}
                    className="adm-icon-btn"
                    aria-label={`Remove ${rowLabel}`}
                >
                    <FaTrashCan aria-hidden="true" />
                </button>
            </div>
        </li>
    );
}

const HeaderForm = () => {
    const router = useRouter();
    const [formData, setFormData] = useState({
        navLinks: [],
        contactLink: { name: '', href: '' },
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        fetchData();
    }, []);

    const ensureIds = (items) => {
        return items.map((item) => ({
            ...item,
            _id: item._id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        }));
    };

    const fetchData = async () => {
        try {
            const res = await fetch('/api/header');
            if (res.ok) {
                const data = await res.json();
                if (data) {
                    setFormData({
                        ...data,
                        navLinks: ensureIds(data.navLinks || []),
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch header data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setFormData((prev) => {
                const oldIndex = prev.navLinks.findIndex((item) => item._id === active.id);
                const newIndex = prev.navLinks.findIndex((item) => item._id === over.id);

                return {
                    ...prev,
                    navLinks: arrayMove(prev.navLinks, oldIndex, newIndex),
                };
            });
        }
    };

    const handleNavLinkChange = (index, field, value) => {
        const newNavLinks = [...formData.navLinks];
        newNavLinks[index] = { ...newNavLinks[index], [field]: value };
        setFormData({ ...formData, navLinks: newNavLinks });
    };

    const handleContactLinkChange = (field, value) => {
        setFormData({
            ...formData,
            contactLink: { ...formData.contactLink, [field]: value },
        });
    };

    const showNotification = (success, message) => {
        setNotification({ success, message });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        const payload = {
            ...formData,
            navLinks: formData.navLinks.map(({ _id, ...rest }) => rest),
        };

        try {
            const response = await fetch('/api/header', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                showNotification(true, 'Header navigation saved');
                fetchData();
            } else {
                const data = await response.json();
                setError(data.error || 'Could not update header navigation');
                showNotification(false, data.error || 'Failed to update');
            }
        } catch {
            setError('An error occurred while saving header navigation');
            showNotification(false, 'An error occurred');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <section className="adm-panel">
                <Loading label="Loading header configuration" rows={5} />
            </section>
        );
    }

    const handleAddNavLink = () => {
        setFormData({
            ...formData,
            navLinks: [
                { _id: `temp-${Date.now()}`, name: '', href: '', visible: true, beta: false, target: '' },
                ...formData.navLinks,
            ],
        });
    };

    const handleRemoveNavLink = (index) => {
        const newNavLinks = formData.navLinks.filter((_, i) => i !== index);
        setFormData({ ...formData, navLinks: newNavLinks });
    };

    const visibleLinks = formData.navLinks.filter((l) => l.visible !== false);
    const hiddenCount = formData.navLinks.length - visibleLinks.length;
    const betaCount = formData.navLinks.filter((l) => l.beta === true).length;

    return (
        <form onSubmit={handleSubmit} className="adm-split">
            <div className="adm-stack">
                {error && (
                    <div role="alert" className="adm-notice adm-notice-error">
                        {error}
                    </div>
                )}

                <Panel
                    title="Navigation links"
                    actions={
                        <button type="button" onClick={handleAddNavLink} className="adm-btn">
                            <FaPlus aria-hidden="true" /> Add link
                        </button>
                    }
                    flush
                >
                    {formData.navLinks.length === 0 ? (
                        <EmptyState
                            title="No navigation links yet"
                            description="Add links to populate the main site navigation bar."
                            action={
                                <button type="button" onClick={handleAddNavLink} className="adm-btn adm-btn-primary">
                                    <FaPlus aria-hidden="true" /> Add first link
                                </button>
                            }
                        />
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={formData.navLinks.map((link) => link._id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <ul className="adm-list">
                                    {formData.navLinks.map((link, index) => (
                                        <SortableNavRow
                                            key={link._id}
                                            link={link}
                                            index={index}
                                            onChange={handleNavLinkChange}
                                            onRemove={handleRemoveNavLink}
                                        />
                                    ))}
                                </ul>
                            </SortableContext>
                        </DndContext>
                    )}
                </Panel>

                <Panel title="Primary contact action">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Action label" help="Text shown on the contact button in the header.">
                            <input
                                type="text"
                                value={formData.contactLink?.name || ''}
                                onChange={(e) => handleContactLinkChange('name', e.target.value)}
                                className="adm-input"
                                placeholder="Hire me"
                            />
                        </Field>
                        <Field label="Target route or anchor" help="Internal route (/contact-us), hash (#contact), or external URL.">
                            <input
                                type="text"
                                value={formData.contactLink?.href || ''}
                                onChange={(e) => handleContactLinkChange('href', e.target.value)}
                                className="adm-input font-mono"
                                placeholder="/contact-us"
                            />
                        </Field>
                    </div>
                </Panel>
            </div>

            <aside className="adm-stack adm-side">
                <Panel title="Publish">
                    <dl className="adm-facts mb-4">
                        <div>
                            <dt>Visible links</dt>
                            <dd>{visibleLinks.length}</dd>
                        </div>
                        <div>
                            <dt>Hidden</dt>
                            <dd>{hiddenCount}</dd>
                        </div>
                        <div>
                            <dt>Beta badges</dt>
                            <dd>{betaCount}</dd>
                        </div>
                    </dl>
                    <p className="adm-help mb-4">Drag the handle on any row to reorder links in the public header.</p>
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

                <Panel title="Header preview">
                    <div className="rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-secondary)] p-3 font-mono text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[var(--text-bright)]">&lt; aiyu /&gt;</span>
                            <span className="text-[var(--adm-hint)]">|</span>
                            {visibleLinks.length === 0 ? (
                                <span className="text-[var(--adm-hint)]">No visible links</span>
                            ) : (
                                visibleLinks.map((link, idx) => (
                                    <span key={link._id || idx} className="inline-flex items-center gap-1 text-[var(--text-secondary)]">
                                        {idx === 0 ? `[ ${link.name || 'untitled'} ]` : (link.name || 'untitled')}
                                        {link.beta && <Badge tone="warn">beta</Badge>}
                                    </span>
                                ))
                            )}
                        </div>
                        {formData.contactLink?.name && (
                            <div className="mt-3 flex items-center justify-between border-t border-[var(--hairline)] pt-2.5">
                                <span className="text-[var(--adm-hint)]">CTA</span>
                                <Badge tone="info">{formData.contactLink.name} → {formData.contactLink.href || '/'}</Badge>
                            </div>
                        )}
                    </div>
                </Panel>

                <Panel title="Related" flush>
                    <ul className="adm-list">
                        <li>
                            <Link href="/admin/config" className="adm-row adm-link">
                                Site branding and logo text
                            </Link>
                        </li>
                        <li>
                            <Link href="/admin/footer" className="adm-row adm-link">
                                Footer and social links
                            </Link>
                        </li>
                    </ul>
                </Panel>
            </aside>

            <Toast notification={notification} />
        </form>
    );
};

export default HeaderForm;
