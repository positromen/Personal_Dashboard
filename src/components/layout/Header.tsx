// NEXUS Header Component
// Minimal top header - NO buttons, NO dropdowns

interface HeaderProps {
    title: string;
    subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
            {/* Left: Page Title */}
            <div>
                <h1 className="text-2xl font-semibold text-slate-800">{title}</h1>
                {subtitle && (
                    <p className="text-sm text-slate-500">{subtitle}</p>
                )}
            </div>

            {/* Right: System Status */}
            <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-slate-600">SYSTEM STABLE</span>
            </div>
        </header>
    );
}
