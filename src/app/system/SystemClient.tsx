'use client';

import { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconBox } from '@/components/ui/IconBox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
    Settings,
    Database,
    RefreshCw,
    Download,
    CheckCircle,
    Zap,
    FolderKanban,
    CheckSquare,
    StickyNote,
    Calendar,
    Link2,
    TrendingUp,
    Activity
} from 'lucide-react';
import { SystemStats, getSystemStats, exportAllData } from '@/server/container/systemActions';

interface SystemClientProps {
    initialStats: SystemStats;
}

export default function SystemClient({ initialStats }: SystemClientProps) {
    const [stats, setStats] = useState(initialStats);
    const [lastUpdated, setLastUpdated] = useState(new Date().toLocaleString());
    const [isPending, startTransition] = useTransition();

    const handleRefresh = () => {
        startTransition(async () => {
            const newStats = await getSystemStats();
            setStats(newStats);
            setLastUpdated(new Date().toLocaleString());
        });
    };

    const handleExportAll = async () => {
        const data = await exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `nexus_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(link.href);
    };

    // Format status names for display
    const formatStatus = (status: string) => {
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    return (
        <div className="space-y-6">
            {/* System Status */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <IconBox icon={CheckCircle} className="bg-green-100" iconClassName="text-green-600" />
                        <div>
                            <CardTitle>System Status</CardTitle>
                            <CardDescription>All systems operational</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-sm text-slate-600">Database Connected</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-sm text-slate-600">Prisma ORM</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-sm text-slate-600">UI Components</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-green-500" />
                            <span className="text-sm text-slate-600">Server Actions</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-4">Last checked: {lastUpdated}</p>
                </CardContent>
            </Card>

            {/* Database Stats */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <IconBox icon={Database} />
                            <CardTitle>Database Statistics</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={isPending}>
                            <RefreshCw className={`h-4 w-4 mr-1 ${isPending ? 'animate-spin' : ''}`} />
                            {isPending ? 'Refreshing...' : 'Refresh'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="h-4 w-4 text-orange-600" />
                                <span className="text-sm font-medium text-orange-700">Hackathons</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-700">{stats.hackathons}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
                            <div className="flex items-center gap-2 mb-2">
                                <FolderKanban className="h-4 w-4 text-indigo-600" />
                                <span className="text-sm font-medium text-indigo-700">Projects</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-700">{stats.projects}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckSquare className="h-4 w-4 text-blue-600" />
                                <span className="text-sm font-medium text-blue-700">Tasks</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-700">{stats.tasks}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
                            <div className="flex items-center gap-2 mb-2">
                                <StickyNote className="h-4 w-4 text-amber-600" />
                                <span className="text-sm font-medium text-amber-700">Notes</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-700">{stats.notes}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-green-50 border border-green-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Calendar className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-green-700">Calendar Events</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-700">{stats.calendarEvents}</p>
                        </div>
                        <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Link2 className="h-4 w-4 text-purple-600" />
                                <span className="text-sm font-medium text-purple-700">Note Links</span>
                            </div>
                            <p className="text-3xl font-bold text-slate-700">{stats.noteLinks}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Status Breakdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hackathon Status */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-orange-600" />
                            <CardTitle className="text-sm">Hackathons by Status</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(stats.hackathonsByStatus).length === 0 ? (
                                <p className="text-sm text-slate-400">No hackathons yet</p>
                            ) : (
                                Object.entries(stats.hackathonsByStatus).map(([status, count]) => (
                                    <div key={status} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">{formatStatus(status)}</span>
                                        <span className="font-semibold text-slate-800">{count}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Task Status */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <CheckSquare className="h-4 w-4 text-blue-600" />
                            <CardTitle className="text-sm">Tasks by State</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(stats.tasksByState).length === 0 ? (
                                <p className="text-sm text-slate-400">No tasks yet</p>
                            ) : (
                                Object.entries(stats.tasksByState).map(([state, count]) => (
                                    <div key={state} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">{formatStatus(state)}</span>
                                        <span className="font-semibold text-slate-800">{count}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Project Status */}
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-2">
                            <FolderKanban className="h-4 w-4 text-indigo-600" />
                            <CardTitle className="text-sm">Projects by Stage</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {Object.entries(stats.projectsByStage).length === 0 ? (
                                <p className="text-sm text-slate-400">No projects yet</p>
                            ) : (
                                Object.entries(stats.projectsByStage).map(([stage, count]) => (
                                    <div key={stage} className="flex justify-between items-center text-sm">
                                        <span className="text-slate-600">{formatStatus(stage)}</span>
                                        <span className="font-semibold text-slate-800">{count}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <IconBox icon={Activity} className="bg-teal-100" iconClassName="text-teal-600" />
                        <CardTitle>Recent Activity (Last 7 Days)</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50">
                            <TrendingUp className="h-8 w-8 text-orange-500" />
                            <div>
                                <p className="text-2xl font-bold text-slate-700">{stats.recentActivity.hackathonsLastWeek}</p>
                                <p className="text-sm text-slate-500">New Hackathons</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50">
                            <CheckCircle className="h-8 w-8 text-green-500" />
                            <div>
                                <p className="text-2xl font-bold text-slate-700">{stats.recentActivity.tasksCompletedLastWeek}</p>
                                <p className="text-sm text-slate-500">Tasks Completed</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50">
                            <StickyNote className="h-8 w-8 text-amber-500" />
                            <div>
                                <p className="text-2xl font-bold text-slate-700">{stats.recentActivity.notesLastWeek}</p>
                                <p className="text-sm text-slate-500">New Notes</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <IconBox icon={Settings} />
                        <CardTitle>Data Management</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {/* Download Database File */}
                        <div className="flex items-center justify-between p-4 rounded-lg border border-indigo-200 bg-indigo-50/30">
                            <div>
                                <p className="text-sm font-medium text-slate-800">Download Database File</p>
                                <p className="text-xs text-slate-500">Download the complete SQLite database file (.db)</p>
                            </div>
                            <a href="/api/export-database" download>
                                <Button variant="primary" size="sm">
                                    <Database className="h-4 w-4 mr-1" />
                                    Download .db
                                </Button>
                            </a>
                        </div>

                        {/* Export as JSON */}
                        <div className="flex items-center justify-between p-4 rounded-lg border border-slate-200">
                            <div>
                                <p className="text-sm font-medium text-slate-800">Export as JSON</p>
                                <p className="text-xs text-slate-500">Export all data in human-readable JSON format</p>
                            </div>
                            <Button variant="secondary" size="sm" onClick={handleExportAll}>
                                <Download className="h-4 w-4 mr-1" />
                                Export JSON
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* About */}
            <Card>
                <CardHeader>
                    <CardTitle>About NEXUS</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4 text-sm text-slate-600">
                        <p>
                            <span className="font-semibold text-slate-800">NEXUS</span> - Personal Engineering Command Console
                        </p>
                        <p>
                            A calm, professional dashboard for managing your engineering workflow.
                            Built to run quietly in the background without distracting you from your work.
                        </p>
                        <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                            <StatusBadge variant="success" dot>v1.0.0</StatusBadge>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-500">Built with Next.js, Prisma, TypeScript, and Tailwind</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
