'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
    Building2,
    Plus,
    ExternalLink,
    Briefcase,
    GraduationCap,
    Clock,
    X,
    Search,
    ArrowUpDown,
    ChevronRight,
    Target,
    CheckCircle2,
    XCircle,
    Calendar,
    TrendingUp,
    Filter
} from 'lucide-react';
import { createApplication, updateApplicationStatus } from '@/server/container/applicationActions';
import {
    APPLICATION_STATUSES,
    APPLICATION_TYPES,
    type ApplicationStatus,
    type ApplicationType
} from '@/lib/applicationTypes';

interface ApplicationWithUpdates {
    id: string;
    companyName: string;
    role: string;
    type: string;
    companyLink: string | null;
    applicationLink: string | null;
    appliedDate: Date | null;
    status: string;
    createdAt: Date;
    lastUpdated: Date;
    updates: { id: string; content: string; timestamp: Date }[];
}

interface ApplicationsClientProps {
    applications: ApplicationWithUpdates[];
}

// Status styling - calm, non-judgmental colors
const statusStyles: Record<string, { variant: 'neutral' | 'success' | 'warning' | 'error' | 'info'; label: string; icon: typeof Target }> = {
    discovered: { variant: 'neutral', label: 'Discovered', icon: Target },
    applied: { variant: 'info', label: 'Applied', icon: CheckCircle2 },
    under_review: { variant: 'warning', label: 'Under Review', icon: Clock },
    interview_scheduled: { variant: 'info', label: 'Interview', icon: Calendar },
    selected: { variant: 'success', label: 'Selected', icon: CheckCircle2 },
    rejected: { variant: 'neutral', label: 'Rejected', icon: XCircle },
    withdrawn: { variant: 'neutral', label: 'Withdrawn', icon: XCircle }
};

type SortOption = 'recent' | 'company' | 'status' | 'applied';

export default function ApplicationsClient({ applications }: ApplicationsClientProps) {
    const [filter, setFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('recent');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isPending, startTransition] = useTransition();

    // Form state
    const [formData, setFormData] = useState({
        companyName: '',
        role: '',
        type: 'INTERNSHIP' as ApplicationType,
        companyLink: '',
        applicationLink: '',
        status: 'discovered' as ApplicationStatus
    });

    // Stats calculations
    const stats = useMemo(() => {
        const total = applications.length;
        const applied = applications.filter(a => a.status === 'applied' || a.status === 'under_review' || a.status === 'interview_scheduled').length;
        const interviews = applications.filter(a => a.status === 'interview_scheduled').length;
        const selected = applications.filter(a => a.status === 'selected').length;
        const rejected = applications.filter(a => a.status === 'rejected').length;
        const internships = applications.filter(a => a.type === 'INTERNSHIP').length;
        const placements = applications.filter(a => a.type === 'PLACEMENT').length;
        const successRate = applied > 0 ? Math.round((selected / (selected + rejected)) * 100) || 0 : 0;

        return { total, applied, interviews, selected, rejected, internships, placements, successRate };
    }, [applications]);

    // Filtered and sorted applications
    const processedApplications = useMemo(() => {
        let result = [...applications];

        // Apply status filter
        if (filter !== 'all') {
            result = result.filter(a => a.status === filter);
        }

        // Apply type filter
        if (typeFilter !== 'all') {
            result = result.filter(a => a.type === typeFilter);
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(a =>
                a.companyName.toLowerCase().includes(query) ||
                a.role.toLowerCase().includes(query)
            );
        }

        // Apply sorting
        result.sort((a, b) => {
            switch (sortBy) {
                case 'company':
                    return a.companyName.localeCompare(b.companyName);
                case 'status':
                    return APPLICATION_STATUSES.indexOf(a.status as ApplicationStatus) - APPLICATION_STATUSES.indexOf(b.status as ApplicationStatus);
                case 'applied':
                    if (!a.appliedDate && !b.appliedDate) return 0;
                    if (!a.appliedDate) return 1;
                    if (!b.appliedDate) return -1;
                    return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
                case 'recent':
                default:
                    return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
            }
        });

        return result;
    }, [applications, filter, typeFilter, searchQuery, sortBy]);

    // Quick status change handler
    const handleQuickStatusChange = (appId: string, newStatus: ApplicationStatus, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        startTransition(async () => {
            await updateApplicationStatus(appId, newStatus);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        startTransition(async () => {
            await createApplication({
                companyName: formData.companyName,
                role: formData.role,
                type: formData.type,
                companyLink: formData.companyLink || undefined,
                applicationLink: formData.applicationLink || undefined,
                status: formData.status,
                appliedDate: formData.status === 'applied' ? new Date() : undefined
            });

            setFormData({
                companyName: '',
                role: '',
                type: 'INTERNSHIP',
                companyLink: '',
                applicationLink: '',
                status: 'discovered'
            });
            setShowAddModal(false);
        });
    };

    const formatDate = (date: Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const getRelativeTime = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - new Date(date).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days}d ago`;
        if (days < 30) return `${Math.floor(days / 7)}w ago`;
        return `${Math.floor(days / 30)}mo ago`;
    };

    // Get next logical status for quick action
    const getNextStatus = (currentStatus: string): ApplicationStatus | null => {
        const flow: Record<string, ApplicationStatus> = {
            'discovered': 'applied',
            'applied': 'under_review',
            'under_review': 'interview_scheduled'
        };
        return flow[currentStatus] || null;
    };

    return (
        <div className="space-y-6">
            {/* Stats Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-gradient-to-br from-slate-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-indigo-100">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                            <p className="text-xs text-slate-500">Total Applications</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-blue-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.interviews}</p>
                            <p className="text-xs text-slate-500">Interviews Lined Up</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-green-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-100">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.selected}</p>
                            <p className="text-xs text-slate-500">Offers Received</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 bg-gradient-to-br from-amber-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-100">
                            <TrendingUp className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{stats.successRate}%</p>
                            <p className="text-xs text-slate-500">Success Rate</p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search, Filter & Controls */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by company or role..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>

                {/* Type Filter */}
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        title="Filter by type"
                    >
                        <option value="all">All Types</option>
                        <option value="INTERNSHIP">Internship ({stats.internships})</option>
                        <option value="PLACEMENT">Placement ({stats.placements})</option>
                    </select>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as SortOption)}
                        className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        title="Sort applications"
                    >
                        <option value="recent">Recently Updated</option>
                        <option value="applied">Applied Date</option>
                        <option value="company">Company Name</option>
                        <option value="status">Status</option>
                    </select>
                </div>

                {/* Add Button */}
                <Button onClick={() => setShowAddModal(true)} className="shrink-0">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Application
                </Button>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex bg-slate-100 rounded-lg p-1 gap-1 flex-wrap">
                {[
                    { key: 'all', label: 'All', count: applications.length },
                    { key: 'discovered', label: 'Discovered', count: applications.filter(a => a.status === 'discovered').length },
                    { key: 'applied', label: 'Applied', count: applications.filter(a => a.status === 'applied').length },
                    { key: 'under_review', label: 'Under Review', count: applications.filter(a => a.status === 'under_review').length },
                    { key: 'interview_scheduled', label: 'Interview', count: applications.filter(a => a.status === 'interview_scheduled').length },
                    { key: 'selected', label: 'Selected', count: applications.filter(a => a.status === 'selected').length },
                    { key: 'rejected', label: 'Rejected', count: applications.filter(a => a.status === 'rejected').length }
                ].filter(tab => tab.count > 0 || tab.key === 'all').map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filter === tab.key
                            ? 'bg-white shadow text-slate-800'
                            : 'text-slate-600 hover:text-slate-800'
                            }`}
                    >
                        {tab.label} {tab.count > 0 && <span className="text-slate-400">({tab.count})</span>}
                    </button>
                ))}
            </div>

            {/* Results count */}
            {(searchQuery || filter !== 'all' || typeFilter !== 'all') && (
                <p className="text-sm text-slate-500">
                    Showing {processedApplications.length} of {applications.length} applications
                    {searchQuery && <span> matching &quot;{searchQuery}&quot;</span>}
                </p>
            )}

            {/* Applications List */}
            <div className="space-y-3">
                {processedApplications.length === 0 ? (
                    <Card className="p-12 text-center">
                        <Building2 className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                        {applications.length === 0 ? (
                            <>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">No Applications Yet</h3>
                                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                    Start tracking your internship and placement applications. Add your first application to begin your journey.
                                </p>
                                <Button onClick={() => setShowAddModal(true)}>
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Your First Application
                                </Button>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold text-slate-700 mb-2">No Matching Applications</h3>
                                <p className="text-slate-500">
                                    Try adjusting your search or filters
                                </p>
                                <button
                                    onClick={() => { setSearchQuery(''); setFilter('all'); setTypeFilter('all'); }}
                                    className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                                >
                                    Clear all filters
                                </button>
                            </>
                        )}
                    </Card>
                ) : (
                    processedApplications.map(app => {
                        const nextStatus = getNextStatus(app.status);
                        return (
                            <Link key={app.id} href={`/applications/${app.id}`}>
                                <Card className="p-4 hover:border-indigo-200 hover:shadow-lg transition-all cursor-pointer group">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4 min-w-0 flex-1">
                                            {/* Company Icon with Type Badge */}
                                            <div className="relative shrink-0">
                                                <div className="p-3 rounded-xl bg-slate-100 group-hover:bg-indigo-50 transition-colors">
                                                    <Building2 className="h-6 w-6 text-slate-600 group-hover:text-indigo-600 transition-colors" />
                                                </div>
                                                <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full ${app.type === 'INTERNSHIP' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                                    {app.type === 'INTERNSHIP' ? (
                                                        <Briefcase className="h-2.5 w-2.5 text-white" />
                                                    ) : (
                                                        <GraduationCap className="h-2.5 w-2.5 text-white" />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                                                    {app.companyName}
                                                </h3>
                                                <p className="text-sm text-slate-500 truncate">{app.role}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-xs text-slate-400 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {getRelativeTime(app.lastUpdated)}
                                                    </span>
                                                    {app.appliedDate && (
                                                        <span className="text-xs text-slate-400">
                                                            Applied {formatDate(app.appliedDate)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Status & Actions */}
                                        <div className="flex items-center gap-3 shrink-0">
                                            {/* Quick Action Button */}
                                            {nextStatus && (
                                                <button
                                                    onClick={(e) => handleQuickStatusChange(app.id, nextStatus, e)}
                                                    disabled={isPending}
                                                    className="px-3 py-1.5 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors opacity-0 group-hover:opacity-100"
                                                    title={`Mark as ${nextStatus.replace(/_/g, ' ')}`}
                                                >
                                                    Mark {statusStyles[nextStatus]?.label || nextStatus}
                                                </button>
                                            )}

                                            <StatusBadge variant={statusStyles[app.status]?.variant || 'neutral'}>
                                                {statusStyles[app.status]?.label || app.status}
                                            </StatusBadge>

                                            {(app.companyLink || app.applicationLink) && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        window.open(app.applicationLink || app.companyLink || '#', '_blank', 'noopener,noreferrer');
                                                    }}
                                                    className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                                    title="Open application link"
                                                >
                                                    <ExternalLink className="h-4 w-4 text-slate-400 hover:text-indigo-600" />
                                                </button>
                                            )}

                                            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        );
                    })
                )}
            </div>

            {/* Add Application Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-lg font-semibold text-slate-800">Add Application</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1 hover:bg-slate-100 rounded"
                                title="Close modal"
                            >
                                <X className="h-5 w-5 text-slate-500" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Company Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.companyName}
                                    onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Google, Microsoft, etc."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Role *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.role}
                                    onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Software Engineer Intern"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Type
                                    </label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as ApplicationType }))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        title="Application type"
                                    >
                                        {APPLICATION_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as ApplicationStatus }))}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        title="Application status"
                                    >
                                        {APPLICATION_STATUSES.map(s => (
                                            <option key={s} value={s}>
                                                {s.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Company Careers Link
                                </label>
                                <input
                                    type="url"
                                    value={formData.companyLink}
                                    onChange={e => setFormData(prev => ({ ...prev, companyLink: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="https://careers.company.com/..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Application Portal Link
                                </label>
                                <input
                                    type="url"
                                    value={formData.applicationLink}
                                    onChange={e => setFormData(prev => ({ ...prev, applicationLink: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="https://apply.company.com/..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setShowAddModal(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" className="flex-1" disabled={isPending}>
                                    {isPending ? 'Adding...' : 'Add Application'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
