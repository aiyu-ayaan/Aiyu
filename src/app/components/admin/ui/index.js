"use client";
/*
 * Admin UI primitives (design-system/MASTER.md). Styles: src/app/styles/admin.css (`adm-*` classes).
 * Use the classes directly for buttons, inputs, tables, lists, tabs, switches and notices.
 *
 *   import { PageHeader, Panel, Stat, Badge, EmptyState, Loading, Field } from "@/app/components/admin/ui";
 *
 *   <div className="adm-page">                      // add adm-page-wide for full-width editors
 *     <PageHeader command="ls" title="Blogs" description="Write and publish posts."
 *       actions={<Link href="/admin/blogs/new" className="adm-btn adm-btn-primary">New post</Link>} />
 *     <div className="adm-stats"><Stat label="Posts" value={12} hint="3 drafts" /></div>
 *     <Panel title="All posts" actions={<Badge tone="ok">Live</Badge>} flush>   // flush: no body padding
 *       {posts == null ? <Loading rows={4} />
 *         : posts.length === 0 ? <EmptyState title="No posts yet" description="Write the first one." action={...} />
 *         : <ul className="adm-list">...<li className="adm-row">...</li></ul>}
 *     </Panel>
 *     <Field label="Title" help="Shown in search results." error={errors.title}>
 *       <input className="adm-input" value={title} onChange={...} />   // exactly one control element
 *     </Field>
 *   </div>
 *
 * Badge tone: "ok" | "warn" | "error" | "info" (omit for neutral).
 */
import { cloneElement, useId } from "react";
import { usePathname } from "next/navigation";

const cx = (...parts) => parts.filter(Boolean).join(" ");

export function PageHeader({ command = "ls", title, description, actions }) {
    const path = `~${(usePathname() || "").replace(/^\/admin/, "").replace(/\/$/, "")}`;
    return (
        <header className="adm-page-head">
            <div className="min-w-0">
                <p className="adm-prompt">
                    <span className="adm-prompt-user">admin@aiyu</span>:<span className="adm-prompt-path">{path}</span>$ {command}
                </p>
                <h1 className="adm-title">{title}</h1>
                {description && <p className="adm-desc">{description}</p>}
            </div>
            {actions && <div className="adm-actions">{actions}</div>}
        </header>
    );
}

export function Panel({ title, actions, children, className, flush = false, ...props }) {
    return (
        <section className={cx("adm-panel", className)} {...props}>
            {(title || actions) && (
                <header className="adm-panel-head">
                    {title && <h2 className="adm-panel-title">{title}</h2>}
                    {actions && <div className="adm-actions ml-auto">{actions}</div>}
                </header>
            )}
            {flush ? children : <div className="adm-panel-body">{children}</div>}
        </section>
    );
}

export function Stat({ label, value, hint, children, className }) {
    return (
        <div className={cx("adm-stat", className)}>
            <p className="adm-stat-label">{label}</p>
            <p className="adm-stat-value">{value}</p>
            {hint && <div className="adm-stat-hint">{hint}</div>}
            {children}
        </div>
    );
}

export function Badge({ tone, className, children, ...props }) {
    return (
        <span className={cx("adm-badge", tone && `adm-badge-${tone}`, className)} {...props}>
            {children}
        </span>
    );
}

export function EmptyState({ title, description, action, className }) {
    return (
        <div className={cx("adm-empty", className)}>
            <p className="adm-empty-title">{title}</p>
            {description && <p>{description}</p>}
            {action}
        </div>
    );
}

export function Loading({ label = "Loading", rows = 3, className }) {
    return (
        <div role="status" className={cx("adm-panel-body space-y-3", className)}>
            <span className="sr-only">{label}</span>
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} aria-hidden="true" className="adm-skeleton h-8" />
            ))}
        </div>
    );
}

export function Field({ label, help, error, id, className, children }) {
    const generated = useId();
    const controlId = children.props.id || id || generated;
    const helpId = help ? `${controlId}-help` : null;
    const errorId = error ? `${controlId}-error` : null;
    return (
        <div className={cx("adm-field", className)}>
            <label htmlFor={controlId} className="adm-label">{label}</label>
            {cloneElement(children, {
                id: controlId,
                "aria-describedby": cx(children.props["aria-describedby"], errorId, helpId) || undefined,
                "aria-invalid": error ? true : children.props["aria-invalid"],
            })}
            {error && <p id={errorId} role="alert" className="adm-field-error">{error}</p>}
            {help && <p id={helpId} className="adm-help">{help}</p>}
        </div>
    );
}
