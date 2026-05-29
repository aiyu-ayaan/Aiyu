import React from 'react';
import AdsForm from '../../components/admin/AdsForm';

export const metadata = {
    title: 'AdSense Config | Admin Dashboard',
};

export default function AdsPage() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <header className="mb-12">
                <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">AdSense Configuration</h1>
                <p className="text-slate-300">Manage your Google AdSense integration settings here.</p>
            </header>
            <AdsForm />
        </div>
    );
}
