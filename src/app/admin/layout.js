import { Geist, Geist_Mono } from "next/font/google";
import "../styles/globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

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
        <div className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen relative text-slate-200 selection:bg-cyan-500/30`}>
            {/* Deep Space Background for Admin */}
            <div className="fixed inset-0 z-[-1] bg-[#030014]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.1),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(139,92,246,0.1),transparent_50%)]" />
                <div className="absolute inset-0 bg-[repeating-linear-gradient(rgba(255,255,255,0.03)_0px,transparent_1px,transparent_100px),repeating-linear-gradient(90deg,rgba(255,255,255,0.03)_0px,transparent_1px,transparent_100px)]" />
            </div>
            {children}
        </div>
    );
}
