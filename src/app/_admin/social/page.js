"use client";
import React from "react";
import SocialMetaForm from "@/app/components/admin/SocialMetaForm";
import { PageHeader } from "@/app/components/admin/ui";
import "../../styles/admin-insights.css";

export default function SocialPage() {
    return (
        <div className="adm-page">
            <PageHeader
                command="edit --social"
                title="Social & metadata"
                description="Manage global site title, favicon, default Open Graph image, and per-page social sharing previews. Blog post metadata is managed per post."
            />
            <SocialMetaForm />
        </div>
    );
}
