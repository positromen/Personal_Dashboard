'use client';

// NEXUS Overview - Clean Situational Awareness Dashboard

import { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/Card';
import {
  Calendar,
  CheckSquare,
  Clock,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import {
  generateClassInstancesForDate,
  getSubjectById,
} from '@/lib/store';
import {
  Task,
  CalendarEvent,
  ClassInstance,
} from '@/lib/types';
import {
  getDaysUntil,
  getToday,
  getDayOfWeek,
  cn,
} from '@/lib/utils';
import type { SubjectAttendanceStats } from '@/server/attendance/queries';

// Store subscription for hydration detection
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface OverviewClientProps {
  serverNearestDeadline?: CalendarEvent | null;
  serverActiveTasks?: Task[];
  serverAttendanceStats?: SubjectAttendanceStats[];
}

export default function OverviewClient({
  serverNearestDeadline,
  serverActiveTasks,
  serverAttendanceStats
}: OverviewClientProps) {
  // Detect hydration using useSyncExternalStore (avoids setState in useEffect)
  const isHydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot);

  // Compute client-only data only after hydration
  const todaysClasses = useMemo<ClassInstance[]>(() => {
    if (!isHydrated) return [];
    const today = getToday();
    return generateClassInstancesForDate(today);
  }, [isHydrated]);



  const activeTasks = useMemo<Task[]>(() => {
    return serverActiveTasks || [];
  }, [serverActiveTasks]);

  const nearestDeadline = useMemo<CalendarEvent | null>(() => {
    return serverNearestDeadline || null;
  }, [serverNearestDeadline]);

  // Attendance alerts from server data
  const attendanceAlerts = serverAttendanceStats?.filter(s => s.riskState !== 'SAFE') || [];

  const formatTime12h = (time24: string) => {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const getDueLabel = (dueDate?: string) => {
    if (!dueDate) return null;
    const days = getDaysUntil(dueDate);
    if (days < 0) return { text: 'Overdue', color: 'text-red-600 bg-red-50' };
    if (days === 0) return { text: 'Today', color: 'text-amber-600 bg-amber-50' };
    if (days === 1) return { text: 'Tomorrow', color: 'text-orange-600 bg-orange-50' };
    if (days <= 3) return { text: `${days}d`, color: 'text-amber-600 bg-amber-50' };
    return { text: `${days}d`, color: 'text-slate-500 bg-slate-100' };
  };

  const dayName = getDayOfWeek();
  const today = new Date();
  // Use a stable date format to avoid hydration mismatch
  const dateStr = isHydrated 
    ? today.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : '';

  // Tasks due today
  const tasksDueToday = activeTasks.filter(t => t.dueDate && getDaysUntil(t.dueDate) === 0).length;
  const overdueTasks = activeTasks.filter(t => t.dueDate && getDaysUntil(t.dueDate) < 0).length;

  return (
    <Layout title="Overview" subtitle="Your day at a glance">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Today's Classes - Simple List */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-800">Classes</h2>
            </div>
            <span className="text-xs text-slate-400" suppressHydrationWarning>
              {isHydrated ? `${dayName.charAt(0).toUpperCase() + dayName.slice(1)}, ${dateStr}` : ''}
            </span>
          </div>

          {!isHydrated ? (
            <p className="text-sm text-slate-400 py-4">Loading...</p>
          ) : todaysClasses.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">No classes today</p>
          ) : (
            <div className="space-y-2">
              {todaysClasses
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .slice(0, 4)
                .map(c => {
                  const subject = getSubjectById(c.subjectId);
                  return (
                    <div key={c.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                      <span className="text-xs font-medium text-slate-500 w-16">{formatTime12h(c.startTime)}</span>
                      <span className="text-sm text-slate-700 flex-1 truncate">{subject?.name}</span>
                      {c.classType === 'lab' && (
                        <span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">Lab</span>
                      )}
                    </div>
                  );
                })}
              {todaysClasses.length > 4 && (
                <Link href="/calendar" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-1">
                  +{todaysClasses.length - 4} more <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </Card>

        {/* Tasks - Clean List */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-indigo-600" />
              <h2 className="font-semibold text-slate-800">Tasks</h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {overdueTasks > 0 && (
                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full font-medium">{overdueTasks} overdue</span>
              )}
              {tasksDueToday > 0 && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full font-medium">{tasksDueToday} today</span>
              )}
            </div>
          </div>

          {activeTasks.length === 0 ? (
            <p className="text-sm text-slate-400 py-4">All done! No pending tasks</p>
          ) : (
            <div className="space-y-2">
              {activeTasks.slice(0, 5).map(task => {
                const dueLabel = getDueLabel(task.dueDate);
                return (
                  <div key={task.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      task.priority === 'high' ? 'bg-red-500' :
                        task.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300'
                    )} />
                    <span className={cn(
                      "text-sm flex-1 truncate",
                      dueLabel?.text === 'Overdue' ? 'text-red-700' : 'text-slate-700'
                    )}>{task.title}</span>
                    {dueLabel && (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", dueLabel.color)}>
                        {dueLabel.text}
                      </span>
                    )}
                  </div>
                );
              })}
              {activeTasks.length > 5 && (
                <Link href="/todo" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-1">
                  +{activeTasks.length - 5} more <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </Card>

        {/* Nearest Deadline - Enhanced */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-800">Next Deadline</h2>
          </div>

          {!nearestDeadline ? (
            <p className="text-sm text-slate-400 py-4">No upcoming deadlines</p>
          ) : (() => {
            const days = getDaysUntil(nearestDeadline.date);
            const typeLabels: Record<string, { label: string; color: string }> = {
              project: { label: 'Project', color: 'bg-blue-100 text-blue-700' },
              hackathon: { label: 'Hackathon', color: 'bg-purple-100 text-purple-700' },
              academic: { label: 'Academic', color: 'bg-green-100 text-green-700' },
              personal: { label: 'Personal', color: 'bg-slate-100 text-slate-700' },
            };
            const typeInfo = typeLabels[nearestDeadline.type] || typeLabels.personal;

            return (
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Priority dot + Title */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      nearestDeadline.priority === 'high' ? 'bg-red-500' :
                        nearestDeadline.priority === 'medium' ? 'bg-amber-500' : 'bg-slate-300'
                    )} />
                    <p className="text-sm font-semibold text-slate-800 truncate">{nearestDeadline.title}</p>
                  </div>
                  {/* Type badge + Date */}
                  <div className="flex items-center gap-2 ml-4">
                    <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", typeInfo.color)}>
                      {typeInfo.label}
                    </span>
                    <span className="text-xs text-slate-400" suppressHydrationWarning>
                      {new Date(nearestDeadline.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
                {/* Days counter */}
                <div className={cn(
                  "text-center px-4 py-2 rounded-xl shrink-0",
                  days === 0 ? 'bg-red-100' : days <= 2 ? 'bg-amber-50' : 'bg-slate-50'
                )}>
                  <p className={cn(
                    "text-2xl font-bold leading-none",
                    days === 0 ? 'text-red-600' : days <= 2 ? 'text-amber-600' : 'text-slate-700'
                  )}>{days === 0 ? '!' : days}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {days === 0 ? 'Today' : days === 1 ? 'day' : 'days'}
                  </p>
                </div>
              </div>
            );
          })()}
        </Card>

        {/* Attendance Alerts - Simple */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className={cn("h-5 w-5", attendanceAlerts.length > 0 ? "text-amber-500" : "text-green-500")} />
            <h2 className="font-semibold text-slate-800">Attendance</h2>
          </div>

          {attendanceAlerts.length === 0 ? (
            <div className="flex items-center gap-2 py-4">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-sm text-green-700">All subjects above 75%</span>
            </div>
          ) : (
            <div className="space-y-2">
              {attendanceAlerts.slice(0, 3).map(stat => (
                <div key={stat.subjectId} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-700 truncate flex-1">{stat.subjectName}</span>
                  <div className="flex items-center gap-2 ml-2">
                    <span className={cn(
                      "text-sm font-bold",
                      stat.riskState === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'
                    )}>{stat.attendancePercentage}%</span>
                    {stat.classesNeededForSafe && (
                      <span className="text-xs text-slate-400">need {stat.classesNeededForSafe}</span>
                    )}
                  </div>
                </div>
              ))}
              {attendanceAlerts.length > 3 && (
                <Link href="/attendance" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-1">
                  +{attendanceAlerts.length - 3} more <ChevronRight className="h-3 w-3" />
                </Link>
              )}
            </div>
          )}
        </Card>


      </div>
    </Layout>
  );
}
