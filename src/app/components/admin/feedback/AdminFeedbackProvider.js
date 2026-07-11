"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

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

function ToastStack({ toasts, onClose }) {
    if (typeof document === "undefined") return null;
    return createPortal(
        <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-3">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    role="status"
                    onClick={() => onClose(t.id)}
                    className={`cursor-pointer p-4 rounded-xl border shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
                        t.success
                            ? "bg-green-500/10 border-green-500/20 text-green-400"
                            : "bg-red-500/10 border-red-500/20 text-red-400"
                    }`}
                >
                    {t.success ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
                    <span className="font-mono text-sm font-bold whitespace-pre-line">{t.message}</span>
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
    } = dialog;

    const [input, setInput] = useState(defaultValue);
    const inputRef = useRef(null);

    const accent = danger
        ? "bg-red-500/10 border-red-500/20 text-red-400"
        : "bg-cyan-500/10 border-cyan-500/20 text-cyan-400";
    const confirmBtn = danger
        ? "bg-red-500/90 hover:bg-red-500 text-white"
        : "bg-cyan-500/90 hover:bg-cyan-500 text-white";

    const submit = () => onClose(mode === "prompt" ? input : true);
    const cancel = () => onClose(mode === "prompt" ? null : false);

    if (typeof document === "undefined") return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl animate-in zoom-in-95 fade-in duration-200"
                onKeyDown={(e) => {
                    if (e.key === "Escape") cancel();
                    if (e.key === "Enter" && mode !== "prompt") submit();
                }}
            >
                <div className="p-6">
                    <div className="flex items-start gap-3">
                        <div className={`shrink-0 rounded-xl border p-2 ${accent}`}>
                            {danger ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base font-bold text-slate-100">{title}</h3>
                            {message && (
                                <p className="mt-1 text-sm text-slate-400 whitespace-pre-line">{message}</p>
                            )}
                        </div>
                    </div>

                    {mode === "prompt" && (
                        <input
                            ref={inputRef}
                            autoFocus
                            value={input}
                            placeholder={placeholder}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                            className="mt-4 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500/50"
                        />
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-white/10 px-6 py-4">
                    <button
                        type="button"
                        onClick={cancel}
                        className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/5 transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        autoFocus={mode !== "prompt"}
                        onClick={submit}
                        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${confirmBtn}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
