"use client";
import { FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';

export default function Toast({ notification, onClose }) {
    if (!notification) return null;

    return (
        <div
            role="status"
            className={`adm-toast ${notification.success ? '' : 'adm-toast-error'} fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-50 animate-in slide-in-from-bottom-5 fade-in duration-200`}
        >
            {notification.success ? <FaCircleCheck /> : <FaCircleXmark />}
            <span>{notification.message}</span>
        </div>
    );
}
