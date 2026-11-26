import "../styles/globals.css";
import "../styles/admin.css";
import AdminShell from "@/app/components/admin/shell/AdminShell";
import { AdminFeedbackProvider } from "@/app/components/admin/feedback/AdminFeedbackProvider";
import V2Backdrop from "@/app/components/landing/v2/V2Backdrop";

export const metadata = {
    title: "Admin | Aiyu Portfolio",
    description: "Admin Dashboard",
};

// Force dynamic rendering for all admin pages
// This prevents Next.js from trying to pre-render admin pages during build
// Admin pages require authentication and database access, so they must be dynamic
export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }) {
    return (
        <div className="adm-root antialiased min-h-screen relative font-sans text-sm text-[var(--text-primary)] selection:bg-[color-mix(in_srgb,var(--accent-cyan)_30%,transparent)]">
            <div className="fixed inset-0 z-[-1]">
                <V2Backdrop />
            </div>
            <AdminFeedbackProvider>
                <AdminShell>{children}</AdminShell>
            </AdminFeedbackProvider>
        </div>
    );
}
