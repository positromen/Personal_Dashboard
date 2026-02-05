// NEXUS IconBox Component
// Icons must sit inside this container - no floating icons

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface IconBoxProps {
    icon: LucideIcon;
    className?: string;
    iconClassName?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function IconBox({
    icon: Icon,
    className,
    iconClassName,
    size = 'md'
}: IconBoxProps) {
    const sizeStyles = {
        sm: "h-8 w-8",
        md: "h-10 w-10",
        lg: "h-12 w-12",
    };

    const iconSizes = {
        sm: "h-4 w-4",
        md: "h-5 w-5",
        lg: "h-6 w-6",
    };

    return (
        <div className={cn(
            "rounded-lg bg-slate-100 flex items-center justify-center",
            sizeStyles[size],
            className
        )}>
            <Icon className={cn(iconSizes[size], "text-slate-600", iconClassName)} />
        </div>
    );
}
