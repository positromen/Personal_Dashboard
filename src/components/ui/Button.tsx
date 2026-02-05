// NEXUS Button Component - Standard Template
// Hover → opacity only

import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'success' | 'warning' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    className,
    children,
    ...props
}: ButtonProps) {
    const baseStyles = "rounded-md font-medium transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";

    const variantStyles = {
        primary: "bg-slate-900 text-white hover:opacity-90",
        secondary: "bg-slate-100 text-slate-800 hover:opacity-80",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100",
        success: "bg-green-600 text-white hover:opacity-90",
        warning: "bg-amber-600 text-white hover:opacity-90",
        danger: "bg-red-600 text-white hover:opacity-90",
    };

    const sizeStyles = {
        sm: "px-3 py-1.5 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
    };

    return (
        <button
            className={cn(
                baseStyles,
                variantStyles[variant],
                sizeStyles[size],
                className
            )}
            {...props}
        >
            {children}
        </button>
    );
}
