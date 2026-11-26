"use client";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaCircleCheck, FaCircleInfo, FaCircleXmark, FaTriangleExclamation } from "react-icons/fa6";

/**
 * Global admin feedback layer: promise-based confirm/prompt dialogs and a
 * stacked toast system. Replaces the browser-native alert()/confirm()/prompt()
 * calls so every notice matches the admin theme and never blocks the UI thread.
 *
 * Usage:
 *   const { toast, confirm, prompt } = useAdminFeedback();
 *   toast.success("Saved");
 *   if (!(await confirm({ title: "Delete?", danger: true }))) return;
 *   const name = await prompt({ title: "Rename", defaultValue: current });
 */
const FeedbackContext = createContext(null);

let toastSeq = 0;

export function AdminFeedbackProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const [dialog, setDialog] = useState(null);
    const resolverRef = useRef(null);

    const dismissToast = useCallback((id) => {
        setToasts((list) => list.filter((t) => t.id !== id));
    }, []);

    const pushToast = useCallback((message, { success = true, duration = 3500 } = {}) => {
        const id = ++toastSeq;
        setToasts((list) => [...list, { id, message, success }]);
        if (duration > 0) {
            setTimeout(() => dismissToast(id), duration);
        }
        return id;
    }, [dismissToast]);

    const toast = useMemo(() => {
        const fn = (message, opts) => pushToast(message, opts);
        fn.success = (message, opts) => pushToast(message, { ...opts, success: true });
        fn.error = (message, opts) => pushToast(message, { ...opts, success: false });
        return fn;
    }, [pushToast]);

    const closeDialog = useCallback((result) => {
        setDialog(null);
        if (resolverRef.current) {
            resolverRef.current(result);
            resolverRef.current = null;
        }
    }, []);

    const confirm = useCallback((options = {}) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setDialog({ mode: "confirm", ...options });
        });
    }, []);

    const prompt = useCallback((options = {}) => {
        return new Promise((resolve) => {
            resolverRef.current = resolve;
            setDialog({ mode: "prompt", ...options });
        });
    }, []);

    const value = useMemo(() => ({ toast, confirm, prompt }), [toast, confirm, prompt]);

    return (
        <FeedbackContext.Provider value={value}>
            {children}
            <ToastStack toasts={toasts} onClose={dismissToast} />
            {dialog && <FeedbackDialog dialog={dialog} onClose={closeDialog} />}
        </FeedbackContext.Provider>
    );
}

export function useAdminFeedback() {
    const ctx = useContext(FeedbackContext);
    if (!ctx) {
        throw new Error("useAdminFeedback must be used within an AdminFeedbackProvider");
    }
    return ctx;
}

/**
 * Portals cannot be rendered on the server or during the first client render.
 * Branching on `typeof document` makes those two passes disagree — the server
 * emits nothing while the client immediately portals into `document.body` —
 * which fails hydration for the whole admin layout and leaves the tree (login
 * form included) without its event handlers until React re-renders it client
 * side. Gate on a post-mount flag instead: it is `false` on the server AND on
 * the first client render, so both passes match and the portal only appears
 * once hydration has completed.
 */
function useMounted() {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    return mounted;
}

function ToastStack({ toasts, onClose }) {
    const mounted = useMounted();
    if (!mounted) return null;
    return createPortal(
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[100] flex flex-col items-end gap-3">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    role="status"
                    onClick={() => onClose(t.id)}
                    className={`adm-toast ${t.success ? "" : "adm-toast-error"} cursor-pointer animate-in slide-in-from-bottom-5 fade-in duration-200`}
                >
                    {t.success ? <FaCircleCheck /> : <FaCircleXmark />}
                    <span>{t.message}</span>
                </div>
            ))}
        </div>,
        document.body
    );
}

function FeedbackDialog({ dialog, onClose }) {
    const {
        mode,
        title = mode === "prompt" ? "Enter a value" : "Are you sure?",
        message,
        confirmText = mode === "prompt" ? "Save" : "Confirm",
        cancelText = "Cancel",
        danger = false,
        defaultValue = "",
        placeholder = "",
        checkbox = null, // confirm-only: { label } → resolves { confirmed, checked }
    } = dialog;

    const [input, setInput] = useState(defaultValue);
    const [checked, setChecked] = useState(false);
    const inputRef = useRef(null);
    const mounted = useMounted();
    const titleId = useId();

    const resolveConfirm = (confirmed) => (checkbox ? { confirmed, checked } : confirmed);
    const submit = () => onClose(mode === "prompt" ? input : resolveConfirm(true));
    const cancel = () => onClose(mode === "prompt" ? null : resolveConfirm(false));

    if (!mounted) return null;

    return createPortal(
        <div
            className="adm-overlay !z-[110] animate-in fade-in duration-200"
            onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="adm-dialog animate-in zoom-in-95 fade-in duration-200"
                onKeyDown={(e) => {
                    if (e.key === "Escape") cancel();
                    if (e.key === "Enter" && mode !== "prompt") submit();
                }}
            >
                <div className="p-5">
                    <div className="flex items-start gap-3">
                        {danger
                            ? <FaTriangleExclamation className="mt-1 shrink-0 text-[var(--adm-error-ink)]" />
                            : <FaCircleInfo className="mt-1 shrink-0 text-[var(--accent-cyan)]" />}
                        <div className="flex-1 min-w-0">
                            <h3 id={titleId} className="text-base font-semibold text-[var(--text-bright)]">{title}</h3>
                            {message && (
                                <p className="mt-1 text-sm text-[var(--text-secondary)] whitespace-pre-line">{message}</p>
                            )}
                        </div>
                    </div>

                    {mode === "prompt" && (
                        <input
                            ref={inputRef}
                            autoFocus
                            value={input}
                            placeholder={placeholder}
                            aria-labelledby={titleId}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                            className="adm-input mt-4"
                        />
                    )}

                    {mode === "confirm" && checkbox && (
                        <label className="mt-4 flex min-h-11 items-center gap-2.5 cursor-pointer select-none text-sm text-[var(--text-secondary)]">
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setChecked(e.target.checked)}
                                className="adm-check"
                            />
                            {checkbox.label || "Don't show this again"}
                        </label>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-[var(--hairline)] px-5 py-3">
                    <button type="button" onClick={cancel} className="adm-btn adm-btn-quiet">
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        autoFocus={mode !== "prompt"}
                        onClick={submit}
                        className={`adm-btn ${danger ? "adm-btn-danger" : "adm-btn-primary"}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
