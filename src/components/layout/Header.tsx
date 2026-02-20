'use client';

import { useState, useEffect } from 'react';

// NEXUS Header Component
// Minimal top header - NO buttons, NO dropdowns

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatDateTime = (date: Date) => {
        return date.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
            {/* Left: Page Title */}
            <div>
                <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-slate-500">{subtitle}</p>
                )}
            </div>

            {/* Right: Date/Time and User */}
            <div className="text-right">
                <div className="text-sm font-medium text-slate-700">Siddhesh Sakle</div>
                <div className="text-xs text-slate-500">
                    {mounted ? formatDateTime(currentTime) : ''}
                </div>
            </div>
        </header>
    );
}
