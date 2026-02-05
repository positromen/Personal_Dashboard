'use server';

import { prisma } from '@/lib/db';

export interface SystemStats {
    hackathons: number;
    projects: number;
    tasks: number;
    notes: number;
    calendarEvents: number;
    noteLinks: number;

    // Breakdowns
    hackathonsByStatus: Record<string, number>;
    tasksByState: Record<string, number>;
    projectsByStage: Record<string, number>;

    // Activity
    recentActivity: {
        hackathonsLastWeek: number;
        tasksCompletedLastWeek: number;
        notesLastWeek: number;
    };
}

export async function getSystemStats(): Promise<SystemStats> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    // Run all counts in parallel
    const [
        hackathons,
        projects,
        tasks,
        notes,
        calendarEvents,
        noteLinks,
        hackathonsByStatus,
        tasksByState,
        projectsByStage,
        hackathonsLastWeek,
        tasksCompletedLastWeek,
        notesLastWeek
    ] = await Promise.all([
        prisma.hackathon.count(),
        prisma.project.count(),
        prisma.task.count(),
        prisma.note.count(),
        prisma.calendarEvent.count(),
        prisma.noteLink.count(),

        // Status breakdowns
        prisma.hackathon.groupBy({ by: ['status'], _count: true }),
        prisma.task.groupBy({ by: ['state'], _count: true }),
        prisma.project.groupBy({ by: ['stage'], _count: true }),

        // Recent activity
        prisma.hackathon.count({ where: { createdAt: { gte: oneWeekAgo } } }),
        prisma.task.count({ where: { completedAt: { gte: oneWeekAgo } } }),
        prisma.note.count({ where: { createdAt: { gte: oneWeekAgo } } })
    ]);

    return {
        hackathons,
        projects,
        tasks,
        notes,
        calendarEvents,
        noteLinks,

        hackathonsByStatus: hackathonsByStatus.reduce((acc, item) => {
            acc[item.status] = item._count;
            return acc;
        }, {} as Record<string, number>),

        tasksByState: tasksByState.reduce((acc, item) => {
            acc[item.state] = item._count;
            return acc;
        }, {} as Record<string, number>),

        projectsByStage: projectsByStage.reduce((acc, item) => {
            acc[item.stage] = item._count;
            return acc;
        }, {} as Record<string, number>),

        recentActivity: {
            hackathonsLastWeek,
            tasksCompletedLastWeek,
            notesLastWeek
        }
    };
}

export async function exportAllData() {
    const [hackathons, projects, tasks, notes, calendarEvents, noteLinks] = await Promise.all([
        prisma.hackathon.findMany({ include: { tasks: true, notes: true } }),
        prisma.project.findMany({ include: { tasks: true, notes: true } }),
        prisma.task.findMany(),
        prisma.note.findMany({ include: { links: true } }),
        prisma.calendarEvent.findMany(),
        prisma.noteLink.findMany()
    ]);

    return {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        data: {
            hackathons,
            projects,
            tasks,
            notes,
            calendarEvents,
            noteLinks
        }
    };
}
