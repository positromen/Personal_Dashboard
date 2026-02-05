// NEXUS StatusBadge Component
// Status indicators with proper colors

import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    variant: 'success' | 'warning' | 'error' | 'info' | 'neutral';
    children: React.ReactNode;
    className?: string;
    dot?: boolean;
}

export function StatusBadge({
    variant,
    children,
    className,
    dot = false
}: StatusBadgeProps) {
    const variantStyles = {
        success: "bg-green-50 text-green-700 border-green-200",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
        error: "bg-red-50 text-red-700 border-red-200",
        info: "bg-blue-50 text-blue-700 border-blue-200",
        neutral: "bg-slate-50 text-slate-600 border-slate-200",
    };

    const dotColors = {
        success: "bg-green-500",
        warning: "bg-amber-500",
        error: "bg-red-500",
        info: "bg-blue-500",
        neutral: "bg-slate-400",
    };

    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border",
            variantStyles[variant],
            className
        )}>
            {dot && (
                <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />
            )}
            {children}
        </span>
    );
}
