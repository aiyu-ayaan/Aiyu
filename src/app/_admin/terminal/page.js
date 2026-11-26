"use client";
import React from 'react';
import TerminalForm from '../../components/admin/TerminalForm';
import { PageHeader } from '@/app/components/admin/ui';
import '@/app/styles/admin-structure.css';

export default function AdminTerminalPage() {
    return (
        <div className="adm-page adm-structure">
            <PageHeader
                command="bash"
                title="Terminal"
                description="Configure the interactive CLI prompt, command options, and custom ASCII art collection."
            />
            <TerminalForm />
        </div>
    );
}
