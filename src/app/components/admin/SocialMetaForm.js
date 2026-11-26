"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SOCIAL_PAGES } from "@/lib/socialMeta";
import { useAdminFeedback } from "@/app/components/admin/feedback/AdminFeedbackProvider";
import { Panel, Badge, EmptyState, Loading, Field } from "@/app/components/admin/ui";
import {
    FaXmark, FaMagnifyingGlass, FaImage, FaArrowsRotate, FaFloppyDisk,
    FaUpload, FaFolderOpen, FaTriangleExclamation,
} from "react-icons/fa6";
import "@/app/styles/admin-insights.css";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|avif|bmp)$/i;

const emptyPages = () =>
    SOCIAL_PAGES.reduce((acc, page) => {
        acc[page.key] = { title: "", description: "", image: "" };
        return acc;
    }, {});

const SocialMetaForm = () => {
    const router = useRouter();
    const { toast } = useAdminFeedback();
    // Branding / global metadata — persisted to /api/config
    const [branding, setBranding] = useState({
        siteTitle: "",
        ogImage: "",
        favicon: { value: "", filename: "", mimeType: "" },
    });
    // Per-page social overrides — persisted to /api/admin/social
    const [pages, setPages] = useState(emptyPages());
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [uploading, setUploading] = useState(null); // 'global' | page.key

    // Existing-image picker (reads /api/admin/storage upload library)
    const [pickerOpen, setPickerOpen] = useState(false);
    const [library, setLibrary] = useState([]);
    const [libraryLoading, setLibraryLoading] = useState(false);
    const [libraryError, setLibraryError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const pickerApplyRef = useRef(null);

    useEffect(() => {
        fetchData();
    }, []);

    const loadLibrary = async () => {
        setLibraryLoading(true);
        setLibraryError("");
        try {
            const res = await fetch("/api/admin/storage");
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to load images");
            }
            const images = (data.data?.uploads || [])
                .filter((f) => !f.isThumbnail && IMAGE_EXT.test(f.filename))
                .map((f) => ({ ...f, url: `/api/uploads/${f.filename}` }));
            setLibrary(images);
        } catch (err) {
            setLibraryError(err instanceof Error ? err.message : "Failed to load images");
        } finally {
            setLibraryLoading(false);
        }
    };

    const openPicker = (apply) => {
        pickerApplyRef.current = apply;
        setPickerOpen(true);
        if (library.length === 0) loadLibrary();
    };

    const selectFromLibrary = (url) => {
        pickerApplyRef.current?.(url);
        setPickerOpen(false);
        showNotification(true, "Image selected from library.");
    };

    const showNotification = (success, message) => {
        toast(message, { success });
    };

    const fetchData = async () => {
        try {
            const [configRes, socialRes] = await Promise.all([
                fetch("/api/config"),
                fetch("/api/admin/social"),
            ]);

            if (configRes.ok) {
                const data = await configRes.json();
                setBranding({
                    siteTitle: data?.siteTitle || "",
                    ogImage: data?.ogImage || "",
                    favicon: {
                        value: data?.favicon?.value || "",
                        filename: data?.favicon?.filename || "",
                        mimeType: data?.favicon?.mimeType || "",
                    },
                });
            }

            if (socialRes.ok) {
                const data = await socialRes.json();
                const stored = data?.social?.pages || {};
                setPages((prev) => {
                    const next = { ...prev };
                    for (const page of SOCIAL_PAGES) {
                        next[page.key] = {
                            title: stored[page.key]?.title || "",
                            description: stored[page.key]?.description || "",
                            image: stored[page.key]?.image || "",
                        };
                    }
                    return next;
                });
            }
        } catch (err) {
            console.error("Failed to fetch social metadata", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBrandingChange = (e) => {
        const { name, value } = e.target;
        setBranding((prev) => ({ ...prev, [name]: value }));
    };

    const handlePageChange = (key, field, value) => {
        setPages((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    };

    const handleFaviconUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 1 * 1024 * 1024) {
            setError("Favicon size too large. Max 1MB.");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setBranding((prev) => ({
                ...prev,
                favicon: { value: reader.result, filename: file.name, mimeType: file.type },
            }));
        };
        reader.readAsDataURL(file);
    };

    const uploadImage = async (file, apply, scope) => {
        setUploading(scope);
        setError("");
        try {
            const payload = new FormData();
            payload.append("file", file);
            const response = await fetch("/api/upload", { method: "POST", body: payload });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || "Failed to upload image");
            }
            apply(data.url);
            showNotification(true, "Image uploaded and preview updated.");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to upload image";
            setError(message);
            showNotification(false, message);
        } finally {
            setUploading(null);
        }
    };

    const handleGlobalImageUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        uploadImage(file, (url) => setBranding((prev) => ({ ...prev, ogImage: url })), "global");
        e.target.value = "";
    };

    const handlePageImageUpload = (key, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        uploadImage(file, (url) => handlePageChange(key, "image", url), key);
        e.target.value = "";
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError("");
        try {
            const [configRes, socialRes] = await Promise.all([
                fetch("/api/config", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        siteTitle: branding.siteTitle,
                        ogImage: branding.ogImage,
                        favicon: branding.favicon,
                    }),
                }),
                fetch("/api/admin/social", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ social: { defaultImage: "", pages } }),
                }),
            ]);

            if (configRes.ok && socialRes.ok) {
                showNotification(true, "Changes saved.");
                router.refresh();
                fetchData();
            } else {
                const failed = !configRes.ok ? configRes : socialRes;
                const data = await failed.json().catch(() => ({}));
                setError(data.error || "Something went wrong");
                showNotification(false, data.error || "Failed to update");
            }
        } catch {
            setError("An error occurred while saving.");
            showNotification(false, "An error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Panel flush title="Loading social metadata">
                <Loading label="Loading social metadata" rows={6} />
            </Panel>
        );
    }

    const configuredPagesCount = SOCIAL_PAGES.filter((p) => {
        const entry = pages[p.key];
        return Boolean(entry?.title || entry?.description || entry?.image);
    }).length;

    const dynamicCategories = Array.from(
        new Set(library.flatMap((item) => item.references || []))
    ).sort();
    const allFilterCategories = ["All", ...dynamicCategories, "Unreferenced"];

    const filteredLibrary = library.filter((item) => {
        const matchesSearch = item.filename.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;
        if (activeCategory === "All") return true;
        if (activeCategory === "Unreferenced")
            return !item.isReferenced || item.references.length === 0;
        return item.references && item.references.includes(activeCategory);
    });

    return (
        <>
            <form
                id="social-meta-form"
                onSubmit={handleSubmit}
                className="adm-split"
            >
                <div className="adm-stack">
                    {error && (
                        <div role="alert" className="adm-notice adm-notice-error flex items-center gap-2.5">
                            <FaTriangleExclamation aria-hidden="true" className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Global SEO & branding */}
                    <Panel id="social-global" title="Global site identity">
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <Field
                                    label="Site title"
                                    help="Default title shown in the browser tab and search results."
                                    id="branding-site-title"
                                >
                                    <input
                                        type="text"
                                        name="siteTitle"
                                        value={branding.siteTitle}
                                        onChange={handleBrandingChange}
                                        placeholder="Ayaan's Portfolio"
                                        className="adm-input"
                                    />
                                </Field>

                                <div className="adm-field">
                                    <span className="adm-label">Favicon</span>
                                    <div className="flex items-center gap-3">
                                        <label className="adm-btn adm-file">
                                            <FaUpload aria-hidden="true" />
                                            <span>{branding.favicon.filename || "Upload favicon"}</span>
                                            <input
                                                type="file"
                                                accept=".ico,.png,.jpg,.svg"
                                                onChange={handleFaviconUpload}
                                                className="sr-only"
                                            />
                                        </label>
                                        {branding.favicon.value && (
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--hairline)] bg-[var(--bg-secondary)] p-1.5">
                                                <img
                                                    src={branding.favicon.value}
                                                    alt="Favicon preview"
                                                    className="h-full w-full object-contain"
                                                    loading="lazy"
                                                    decoding="async"
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <p className="adm-help">Accepts .ico, .png, or .svg up to 1 MB.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_14rem] gap-4 items-start">
                                <div className="space-y-3">
                                    <Field
                                        label="Default Open Graph image"
                                        help="Fallback social card image used when an individual page has no custom image set."
                                        id="branding-og-image"
                                    >
                                        <input
                                            type="text"
                                            name="ogImage"
                                            value={branding.ogImage}
                                            onChange={handleBrandingChange}
                                            placeholder="/api/uploads/your-og-image.webp or https://example.com/og-image.png"
                                            className="adm-input font-mono"
                                        />
                                    </Field>
                                    <div className="flex flex-wrap gap-2">
                                        <label className={`adm-btn adm-file ${uploading === "global" ? "opacity-50 pointer-events-none" : ""}`}>
                                            <FaUpload aria-hidden="true" />
                                            <span>{uploading === "global" ? "Uploading…" : "Upload image"}</span>
                                            <input
                                                type="file"
                                                accept="image/*,.heic,.heif"
                                                onChange={handleGlobalImageUpload}
                                                className="sr-only"
                                            />
                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => openPicker((url) => setBranding((prev) => ({ ...prev, ogImage: url })))}
                                            className="adm-btn"
                                        >
                                            <FaFolderOpen aria-hidden="true" />
                                            Choose from library
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--bg-secondary)]">
                                    {branding.ogImage ? (
                                        <img
                                            src={branding.ogImage}
                                            alt="Default Open Graph preview"
                                            className="aspect-[1200/630] w-full object-cover"
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    ) : (
                                        <div className="flex aspect-[1200/630] items-center justify-center p-4 text-center text-xs text-[var(--text-secondary)]">
                                            No default image set
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Panel>

                    {/* Per-page overrides */}
                    <Panel
                        title="Per-page social metadata"
                        actions={<Badge>{configuredPagesCount} of {SOCIAL_PAGES.length} customized</Badge>}
                    >
                        <div className="space-y-4">
                            <p className="adm-help">
                                Blank fields fall back to the page default and the global image above. Blog posts manage their social cards individually.
                            </p>

                            {SOCIAL_PAGES.map((page) => {
                                const entry = pages[page.key];
                                const previewImage = entry.image || branding.ogImage;
                                const isCustomized = Boolean(entry.title || entry.description || entry.image);
                                return (
                                    <div
                                        key={page.key}
                                        id={`social-page-${page.key}`}
                                        className="rounded-xl border border-[var(--hairline)] bg-[var(--bg-secondary)] p-4 sm:p-5 space-y-4 scroll-mt-20"
                                    >
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-semibold text-[var(--text-bright)]">
                                                    {page.label}
                                                </h3>
                                                <span className="adm-code">{page.key}</span>
                                            </div>
                                            <Badge tone={isCustomized ? "ok" : undefined}>
                                                {isCustomized ? "Customized" : "Using defaults"}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Field label="Open Graph title" id={`og-title-${page.key}`}>
                                                <input
                                                    type="text"
                                                    value={entry.title}
                                                    onChange={(e) => handlePageChange(page.key, "title", e.target.value)}
                                                    placeholder={page.hint}
                                                    className="adm-input"
                                                />
                                            </Field>
                                            <Field label="Open Graph description" id={`og-desc-${page.key}`}>
                                                <input
                                                    type="text"
                                                    value={entry.description}
                                                    onChange={(e) => handlePageChange(page.key, "description", e.target.value)}
                                                    placeholder="Shown in social share cards"
                                                    className="adm-input"
                                                />
                                            </Field>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_13rem] gap-4 items-start">
                                            <div className="space-y-2.5">
                                                <Field label="Open Graph image" id={`og-image-${page.key}`}>
                                                    <input
                                                        type="text"
                                                        value={entry.image}
                                                        onChange={(e) => handlePageChange(page.key, "image", e.target.value)}
                                                        placeholder="Leave blank to use the default Open Graph image"
                                                        className="adm-input font-mono"
                                                    />
                                                </Field>
                                                <div className="flex flex-wrap gap-2">
                                                    <label className={`adm-btn adm-file ${uploading === page.key ? "opacity-50 pointer-events-none" : ""}`}>
                                                        <FaUpload aria-hidden="true" />
                                                        <span>{uploading === page.key ? "Uploading…" : "Upload image"}</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*,.heic,.heif"
                                                            onChange={(e) => handlePageImageUpload(page.key, e)}
                                                            className="sr-only"
                                                        />
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => openPicker((url) => handlePageChange(page.key, "image", url))}
                                                        className="adm-btn"
                                                    >
                                                        <FaFolderOpen aria-hidden="true" />
                                                        Choose from library
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--bg-primary)]">
                                                {previewImage ? (
                                                    <>
                                                        <img
                                                            src={previewImage}
                                                            alt={`${page.label} Open Graph preview`}
                                                            className="h-24 w-full object-cover"
                                                            loading="lazy"
                                                            decoding="async"
                                                        />
                                                        {!entry.image && (
                                                            <p className="adm-help px-2.5 py-1 font-mono">Global fallback</p>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div className="flex h-24 items-center justify-center p-2 text-center text-xs text-[var(--text-secondary)]">
                                                        No preview image
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Panel>
                </div>

                {/* Sticky side column */}
                <aside className="adm-side space-y-6">
                    <Panel title="Save metadata">
                        <div className="space-y-4">
                            <dl className="space-y-2 text-sm">
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-[var(--text-secondary)]">Site title</dt>
                                    <dd className="truncate font-medium text-[var(--text-bright)]">
                                        {branding.siteTitle || "Not set"}
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-[var(--text-secondary)]">Default OG image</dt>
                                    <dd>
                                        <Badge tone={branding.ogImage ? "ok" : "warn"}>
                                            {branding.ogImage ? "Configured" : "Missing"}
                                        </Badge>
                                    </dd>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    <dt className="text-[var(--text-secondary)]">Page overrides</dt>
                                    <dd className="adm-num font-semibold text-[var(--text-bright)]">
                                        {configuredPagesCount} / {SOCIAL_PAGES.length}
                                    </dd>
                                </div>
                            </dl>

                            <div className="flex flex-col gap-2 pt-2 border-t border-[var(--hairline)]">
                                <button type="submit" disabled={saving} className="adm-btn adm-btn-primary w-full">
                                    <FaFloppyDisk aria-hidden="true" />
                                    {saving ? "Saving changes…" : "Save changes"}
                                </button>
                                <button type="button" onClick={() => router.back()} className="adm-btn w-full">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </Panel>

                    <Panel flush title="Sections">
                        <ul className="adm-list">
                            <li>
                                <a href="#social-global" className="adm-row justify-between">
                                    <span>Global site identity</span>
                                    <Badge tone={branding.siteTitle && branding.ogImage ? "ok" : undefined}>Global</Badge>
                                </a>
                            </li>
                            {SOCIAL_PAGES.map((p) => {
                                const entry = pages[p.key];
                                const active = Boolean(entry?.title || entry?.description || entry?.image);
                                return (
                                    <li key={p.key}>
                                        <a href={`#social-page-${p.key}`} className="adm-row justify-between">
                                            <span className="truncate">{p.label}</span>
                                            <span className="adm-help font-mono">{active ? "Custom" : p.key}</span>
                                        </a>
                                    </li>
                                );
                            })}
                        </ul>
                    </Panel>
                </aside>
            </form>

            {/* Library Picker Modal */}
            {pickerOpen && (
                <div className="adm-overlay" role="dialog" aria-modal="true" aria-label="Select existing image">
                    <div className="adm-dialog adm-dialog-lg max-h-[85dvh]">
                        <div className="adm-panel-head">
                            <h2 className="adm-panel-title flex items-center gap-2">
                                <FaImage aria-hidden="true" className="text-[var(--accent-cyan)]" />
                                Select image from library
                            </h2>
                            <button
                                type="button"
                                onClick={() => setPickerOpen(false)}
                                className="adm-icon-btn"
                                aria-label="Close image picker"
                            >
                                <FaXmark aria-hidden="true" />
                            </button>
                        </div>

                        <div className="adm-panel-body flex flex-1 flex-col gap-4 overflow-hidden">
                            <div className="flex flex-col sm:flex-row gap-2.5">
                                <div className="relative flex-1">
                                    <FaMagnifyingGlass
                                        aria-hidden="true"
                                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]"
                                    />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Filter by filename…"
                                        aria-label="Filter images by filename"
                                        className="adm-input !pl-8 font-mono"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={loadLibrary}
                                    disabled={libraryLoading}
                                    className="adm-btn"
                                >
                                    <FaArrowsRotate aria-hidden="true" className={libraryLoading ? "animate-spin" : ""} />
                                    Refresh
                                </button>
                            </div>

                            {library.length > 0 && !libraryLoading && !libraryError && (
                                <div className="flex flex-wrap gap-1.5 border-b border-[var(--hairline)] pb-3">
                                    {allFilterCategories.map((category) => {
                                        const isActive = activeCategory === category;
                                        const count = library.filter((item) => {
                                            if (category === "All") return true;
                                            if (category === "Unreferenced")
                                                return !item.isReferenced || item.references.length === 0;
                                            return item.references && item.references.includes(category);
                                        }).length;

                                        if (count === 0 && !isActive) return null;

                                        return (
                                            <button
                                                key={category}
                                                type="button"
                                                aria-pressed={isActive}
                                                onClick={() => setActiveCategory(category)}
                                                className={`adm-btn !min-h-8 !px-3 text-xs ${isActive ? "adm-btn-primary" : ""}`}
                                            >
                                                <span>{category}</span>
                                                <span className="adm-num opacity-80">({count})</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="flex-1 overflow-y-auto min-h-0">
                                {libraryLoading ? (
                                    <Loading label="Loading media library" rows={4} />
                                ) : libraryError ? (
                                    <div role="alert" className="adm-notice adm-notice-error">
                                        {libraryError}
                                    </div>
                                ) : library.length === 0 ? (
                                    <EmptyState
                                        title="No uploaded images found"
                                        description="Upload an image first to browse it in the library."
                                    />
                                ) : filteredLibrary.length === 0 ? (
                                    <EmptyState
                                        title={`No images matching "${searchQuery}"`}
                                        description="Try a different filename filter or category."
                                    />
                                ) : (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-0.5">
                                        {filteredLibrary.map((item) => (
                                            <button
                                                key={item.filename}
                                                type="button"
                                                onClick={() => selectFromLibrary(item.url)}
                                                className="group flex flex-col overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--bg-primary)] text-left transition-colors hover:border-[var(--accent-cyan)]"
                                            >
                                                <div className="aspect-video w-full overflow-hidden bg-[var(--bg-secondary)]">
                                                    <img
                                                        src={item.url}
                                                        alt={item.filename}
                                                        className="h-full w-full object-cover"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                </div>
                                                <span className="block w-full truncate border-t border-[var(--hairline)] px-2.5 py-1.5 font-mono text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-bright)]">
                                                    {item.filename}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end border-t border-[var(--hairline)] pt-3">
                                <button type="button" onClick={() => setPickerOpen(false)} className="adm-btn">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default SocialMetaForm;
