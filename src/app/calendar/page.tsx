// NEXUS Calendar Intelligence Surface
// Read-optimized deadline view - Calendar reveals pressure, doesn't create work

import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { IconBox } from '@/components/ui/IconBox';
import { Button } from '@/components/ui/Button';
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Target
} from 'lucide-react';
import { getCalendarEventsForMonth, getUpcomingDeadlines, CalendarEventWithContext } from '@/server/calendar/queries';
import Link from 'next/link';
import { CalendarGrid } from './CalendarGrid';
import { AddManualEventModal } from './AddManualEventModal';

interface CalendarPageProps {
    searchParams: Promise<{ month?: string; year?: string }>;
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
    const params = await searchParams;
    const today = new Date();
    const year = params.year ? parseInt(params.year) : today.getFullYear();
    const month = params.month ? parseInt(params.month) - 1 : today.getMonth(); // 0-indexed

    // Fetch data server-side
    const [events, upcomingDeadlines] = await Promise.all([
        getCalendarEventsForMonth(year, month),
        getUpcomingDeadlines(10)
    ]);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    // Navigation URLs
    const prevMonth = month === 0
        ? `/calendar?year=${year - 1}&month=12`
        : `/calendar?year=${year}&month=${month}`;
    const nextMonth = month === 11
        ? `/calendar?year=${year + 1}&month=1`
        : `/calendar?year=${year}&month=${month + 2}`;

    return (
        <Layout title="Calendar" subtitle="Deadlines and important dates">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Calendar Grid */}
                <div className="xl:col-span-2">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <IconBox icon={CalendarIcon} />
                                    <CardTitle>{monthNames[month]} {year}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={prevMonth}>
                                        <Button variant="ghost" size="sm">
                                            <ChevronLeft className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Link href={nextMonth}>
                                        <Button variant="ghost" size="sm">
                                            <ChevronRight className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <CalendarGrid
                                events={events}
                                year={year}
                                month={month}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Upcoming Deadlines Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Upcoming Deadlines</CardTitle>
                                <AddManualEventModal />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {upcomingDeadlines.length === 0 ? (
                                <p className="text-sm text-slate-500 py-4 text-center">
                                    No upcoming deadlines
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {upcomingDeadlines.map(event => (
                                        <DeadlineItem key={event.id} event={event} />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Legend */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Event Types</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-purple-500" />
                                    <span className="text-sm text-slate-600">Hackathon</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-green-500" />
                                    <span className="text-sm text-slate-600">Project</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                                    <span className="text-sm text-slate-600">Academic</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-full bg-slate-500" />
                                    <span className="text-sm text-slate-600">Personal</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Confidence Legend */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Deadline Confidence</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span className="text-sm text-slate-600">On Track</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-amber-500" />
                                    <span className="text-sm text-slate-600">Tight</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-500" />
                                    <span className="text-sm text-slate-600">At Risk</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
}

// =============================================
// DEADLINE ITEM COMPONENT
// =============================================

function DeadlineItem({ event }: { event: CalendarEventWithContext }) {
    const daysUntil = Math.ceil(
        (new Date(event.date).getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)
    );

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'HACKATHON': return 'bg-purple-500';
            case 'PROJECT': return 'bg-green-500';
            case 'ACADEMIC': return 'bg-blue-500';
            default: return 'bg-slate-500';
        }
    };

    const getConfidenceIcon = (confidence?: string) => {
        switch (confidence) {
            case 'ON_TRACK': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'TIGHT': return <Clock className="h-4 w-4 text-amber-500" />;
            case 'AT_RISK': return <AlertTriangle className="h-4 w-4 text-red-500" />;
            default: return null;
        }
    };

    const getStateIcon = (state: string) => {
        switch (state) {
            case 'COMPLETED': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'MISSED': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'TODAY': return <Target className="h-4 w-4 text-amber-500" />;
            default: return null;
        }
    };

    // Navigation link based on event type
    const href = event.projectId
        ? `/projects/${event.projectId}`
        : event.hackathonId
            ? `/hackathons/${event.hackathonId}`
            : undefined;

    const content = (
        <div className="border-b border-slate-100 pb-3 last:border-0 hover:bg-slate-50 rounded-lg p-2 -mx-2 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${getTypeColor(event.type)}`} />
                        <p className="text-sm font-medium text-slate-800 truncate max-w-[200px]">
                            {event.title}
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        {new Date(event.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className={`text-sm font-semibold ${daysUntil <= 3 ? 'text-red-600' :
                            daysUntil <= 7 ? 'text-amber-600' : 'text-slate-600'
                        }`}>
                        {daysUntil === 0 ? 'Today' :
                            daysUntil === 1 ? '1 day' :
                                daysUntil < 0 ? 'Overdue' :
                                    `${daysUntil} days`}
                    </span>
                    {event.confidence && getConfidenceIcon(event.confidence)}
                    {event.state !== 'UPCOMING' && getStateIcon(event.state)}
                </div>
            </div>

            {/* Task Stats (if available) */}
            {event.taskStats && event.taskStats.total > 0 && (
                <div className="flex items-center gap-2 mt-2">
                    <StatusBadge variant="neutral">
                        {event.taskStats.pending} pending
                    </StatusBadge>
                    {event.taskStats.overdue > 0 && (
                        <StatusBadge variant="error">
                            {event.taskStats.overdue} overdue
                        </StatusBadge>
                    )}
                </div>
            )}

            {/* Auto-generated badge */}
            {event.autoGenerated && (
                <div className="mt-2">
                    <StatusBadge variant="neutral">{event.type.toLowerCase()}</StatusBadge>
                </div>
            )}
        </div>
    );

    if (href) {
        return <Link href={href} className="block">{content}</Link>;
    }

    return content;
}
