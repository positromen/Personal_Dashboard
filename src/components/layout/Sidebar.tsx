'use client';

// NEXUS Sidebar Component
// Fixed left sidebar with exact navigation order

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    CalendarCheck,
    Calendar,
    FolderKanban,
    Zap,
    CheckSquare,
    Settings,
    StickyNote,
    Briefcase
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
    { name: 'Overview', href: '/', icon: LayoutDashboard },
    { name: 'Attendance', href: '/attendance', icon: CalendarCheck },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Hackathons', href: '/hackathons', icon: Zap },
    { name: 'Applications', href: '/applications', icon: Briefcase },
    { name: 'To-Do', href: '/todo', icon: CheckSquare },
    { name: 'Notes', href: '/notes', icon: StickyNote },

    { name: 'System', href: '/system', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-slate-200">
            {/* Brand */}
            <div className="flex h-16 items-center px-6 border-b border-slate-200 flex-col justify-center">
                <span className="text-xl font-bold tracking-tight text-slate-800">
                    NEXUS
                </span>
                <span className="text-xs text-slate-500 italic -mt-1">
                    Sab Moh Maya Hai
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1 p-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-slate-100 text-slate-900"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </aside>
    );
}
