'use client';

// NEXUS Layout Component
// Base page wrapper combining sidebar + header + content

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useEffect } from 'react';
import { initializeSampleData } from '@/lib/store';

interface LayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

export function Layout({ children, title, subtitle }: LayoutProps) {
    useEffect(() => {
        initializeSampleData();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar />
            <div className="ml-64">
                <Header title={title} subtitle={subtitle} />
                <main className="p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
