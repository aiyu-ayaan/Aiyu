"use client";
import { CheckCircle, XCircle } from 'lucide-react';

export default function Toast({ notification, onClose }) {
    if (!notification) return null;

    return (
        <div
            className={`fixed bottom-8 right-8 p-4 rounded-xl border shadow-2xl backdrop-blur-xl z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
                notification.success
                    ? 'bg-green-500/10 border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
        >
            {notification.success ? (
                <CheckCircle className="w-5 h-5" />
            ) : (
                <XCircle className="w-5 h-5" />
            )}
            <span className="font-mono text-sm font-bold">{notification.message}</span>
        </div>
    );
}
