import { getUpcomingDeadlines, getAllTasks } from '@/server/queries';
import { getSubjectAttendanceStats } from '@/server/attendance/queries';
import OverviewClient from './OverviewClient';
import { Task, CalendarEvent } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function Page() {
  // Parallel fetch
  const [nearestDeadline, allTasks, attendanceStats] = await Promise.all([
    getUpcomingDeadlines(),
    getAllTasks(),
    getSubjectAttendanceStats()
  ]);

  // Map Prisma Tasks to Client Tasks
  const activeTasks: Task[] = allTasks
    .filter(t => t.state !== 'completed')
    .map(t => ({
      id: t.id,
      title: t.title,
      status: (t.state === 'completed' ? 'done' : t.state === 'in-progress' ? 'in-progress' : 'pending') as Task['status'],
      priority: t.priority as 'low' | 'medium' | 'high',
      dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : undefined,
      contextType: (t.projectId ? 'project' : t.hackathonId ? 'hackathon' : 'standalone') as Task['contextType'],
      contextId: t.projectId || t.hackathonId || '',
      description: t.description || undefined,
      createdAt: t.createdAt.toISOString()
    }))
    .slice(0, 5); // Take top 5

  // Nearest deadline is already formatted by query if I recall correctly?
  // Let's check query return type.
  // getUpcomingDeadlines returns { ...d, date: string, ... } which matches CalendarEvent structure roughly.
  // CalendarEvent interface:
  /*
  export interface CalendarEvent {
      id: string;
      title: string;
      date: string; // YYYY-MM-DD
      type: 'project' | 'hackathon' | 'academic' | 'personal';
      priority: 'high' | 'medium' | 'low';
      // ...
  }
  */
  // The query returns ISOString for date. CalendarEvent usually expects YYYY-MM-DD or ISO string.
  // Client uses `getDaysUntil(e.date)` which parses valid date strings.

  const deadline: CalendarEvent | null = nearestDeadline ? {
    id: nearestDeadline.id,
    title: nearestDeadline.title,
    date: nearestDeadline.date.split('T')[0], // Ensure YYYY-MM-DD for consistency
    type: nearestDeadline.type as 'project' | 'hackathon' | 'academic' | 'personal',
    priority: nearestDeadline.priority as 'high' | 'medium' | 'low'
  } : null;

  return (
    <OverviewClient
      serverNearestDeadline={deadline}
      serverActiveTasks={activeTasks}
      serverAttendanceStats={attendanceStats}
    />
  );
}
