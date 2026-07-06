"use client";
import React, { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";
import CommandPalette from "./CommandPalette";

const COLLAPSE_KEY = "aiyu.admin.sidebarCollapsed";

/**
 * The v2 admin application shell: a persistent collapsible sidebar drawer, a
 * sticky top bar with breadcrumbs + command palette, and the routed page in
 * the content area. The login route renders bare (no chrome) so the shell only
 * wraps authenticated screens.
 */
export default function AdminShell({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const isLogin = pathname === "/admin/login" || pathname?.startsWith("/admin/login/");

    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    // Restore persisted collapse preference.
    useEffect(() => {
        try {
            setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
        } catch { /* ignore */ }
    }, []);

    const toggleCollapse = useCallback(() => {
        setCollapsed((c) => {
            const next = !c;
            try { localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0"); } catch { /* ignore */ }
            return next;
        });
    }, []);

    // Close the mobile drawer whenever the route changes.
    useEffect(() => { setMobileOpen(false); }, [pathname]);

    // Global command-palette shortcut.
    useEffect(() => {
        if (isLogin) return;
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setSearchOpen((s) => !s);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isLogin]);

    const handleLogout = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/logout", { method: "POST" });
            if (res.ok) router.push("/admin/login");
        } catch (err) {
            console.error("Logout failed", err);
        }
    }, [router]);

    if (isLogin) return <>{children}</>;

    return (
        <div className="min-h-screen">
            <AdminSidebar
                collapsed={collapsed}
                onToggleCollapse={toggleCollapse}
                mobileOpen={mobileOpen}
                onCloseMobile={() => setMobileOpen(false)}
                onLogout={handleLogout}
            />

            <div className={`flex min-h-screen flex-col transition-[padding] duration-300 ease-out ${collapsed ? "md:pl-[76px]" : "md:pl-[264px]"}`}>
                <AdminTopbar
                    onOpenMobile={() => setMobileOpen(true)}
                    onOpenSearch={() => setSearchOpen(true)}
                />
                <main className="flex-1">{children}</main>
            </div>

            <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
        </div>
    );
}
