'use server';

import { prisma } from '@/lib/db';
import { Project, Task } from '@prisma/client';

// =============================================
// DERIVATION DOMAIN (Pure Logic)
// =============================================

function calculateProgress(tasks: Task[]): number {
    if (tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.state === 'completed').length;
    return Math.round((completed / tasks.length) * 100);
}

function deriveProjectStatus<T extends Project & { tasks: Task[] }>(project: T): T & { progress: number; risk: string } {
    // Example Logic: If deadline passed and not completed -> At Risk?
    // User Requirement: "Derived status flags... ALWAYS COMPUTE"
    // For now, return strict calculated fields.
    const progress = calculateProgress(project.tasks);

    // Risk Logic
    let risk = 'stable';
    const overdueTasks = project.tasks.some(t => t.dueDate && new Date(t.dueDate) < new Date() && t.state !== 'completed');
    if (overdueTasks) risk = 'at_risk';
    if (project.deadline && new Date(project.deadline) < new Date() && progress < 100) risk = 'critical';

    return {
        ...project,
        progress,
        risk
    };
}

// =============================================
// QUERIES (Read Operations)
// =============================================

export async function getProjectsWithDerivedData() {
    const projects = await prisma.project.findMany({
        include: {
            tasks: true, // Needed for derivation
            links: true,
            notes: true,
            originHackathon: true
        },
        orderBy: { lastActivity: 'desc' }
    });

    return projects.map(deriveProjectStatus);
}

export async function getHackathonsWithDerivedData() {
    const hackathons = await prisma.hackathon.findMany({
        include: {
            tasks: true,
            links: true,
            notes: true,
            linkedProject: true
        },
        orderBy: { createdAt: 'desc' }
    });

    return hackathons.map(h => {
        // Simple progress/risk for hackathon?
        // User said: "IF submission deadline < 2 days AND not submitted -> Hackathon = CRITICAL"
        let risk = 'stable';
        const daysToSubmit = h.submissionDeadline ? (new Date(h.submissionDeadline).getTime() - Date.now()) / (1000 * 3600 * 24) : 99;

        if (h.status !== 'submitted' && h.status !== 'completed') {
            if (daysToSubmit < 0) risk = 'missed';
            else if (daysToSubmit < 2) risk = 'critical';
            else if (daysToSubmit < 7) risk = 'at_risk';
        }

        // Parse rounds JSON
        let rounds = [];
        try {
            rounds = h.rounds ? JSON.parse(h.rounds) : [];
        } catch {
            rounds = [];
        }

        return {
            ...h,
            risk,
            rounds,
            currentRound: h.currentRound || 0
        };
    });
}


export async function getAllTasks() {
    return await prisma.task.findMany({
        orderBy: [
            { priority: 'desc' }, // High -> Low
            { dueDate: 'asc' }    // Due sooner first
        ]
    });
}

export async function getProjectById(id: string) {
    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            tasks: { orderBy: { priority: 'desc' } },
            links: true,
            notes: { orderBy: { createdAt: 'desc' } }, // Legacy ProjectNote
            noteLinks: { include: { note: true } },    // New System
            originHackathon: true
        }
    });

    if (!project) return null;
    return deriveProjectStatus(project);
}

export async function getHackathonById(id: string) {
    const hackathon = await prisma.hackathon.findUnique({
        where: { id },
        include: {
            tasks: { orderBy: { priority: 'desc' } },
            links: true,
            notes: { orderBy: { createdAt: 'desc' } }, // Legacy ProjectNote
            noteLinks: { include: { note: true } },    // New System
            linkedProject: true
        }
    });

    if (!hackathon) return null;

    // Calculate risk like in getHackathonsWithDerivedData
    let risk = 'stable';
    const daysToSubmit = hackathon.submissionDeadline
        ? (new Date(hackathon.submissionDeadline).getTime() - Date.now()) / (1000 * 3600 * 24)
        : 99;

    if (hackathon.status !== 'submitted' && hackathon.status !== 'completed') {
        if (daysToSubmit < 0) risk = 'missed';
        else if (daysToSubmit < 2) risk = 'critical';
        else if (daysToSubmit < 7) risk = 'at_risk';
    }

    // Parse rounds JSON
    let rounds = [];
    try {
        rounds = hackathon.rounds ? JSON.parse(hackathon.rounds) : [];
    } catch {
        rounds = [];
    }

    return { ...hackathon, risk, rounds, currentRound: hackathon.currentRound || 0 };
}

export async function getAllProjects() {
    return await prisma.project.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, originHackathonId: true }
    });
}

export async function getAllHackathons() {
    return await prisma.hackathon.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    });
}

export async function getUpcomingDeadlines() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [projects, hackathons] = await Promise.all([
        prisma.project.findMany({
            where: {
                deadline: {
                    gte: today
                },
                stage: { // Fixed: using stage instead of status
                    notIn: ['completed', 'archived']
                }
            },
            select: {
                id: true,
                name: true,
                deadline: true,
                stage: true // map to priority?
            },
            orderBy: {
                deadline: 'asc'
            },
            take: 5
        }),
        prisma.hackathon.findMany({
            where: {
                OR: [
                    { submissionDeadline: { gte: today } },
                    { registrationDeadline: { gte: today } },
                    { eventStartDate: { gte: today } }
                ],
                status: {
                    notIn: ['completed', 'past']
                }
            },
            select: {
                id: true,
                name: true,
                submissionDeadline: true,
                registrationDeadline: true,
                eventStartDate: true
            },
            take: 5
        })
    ]);

    // Normalize and sort
    const allDeadlines = [
        ...projects.map(p => ({
            id: p.id,
            title: p.name,
            date: p.deadline!,
            type: 'project',
            priority: 'medium' // Determine based on date proximity?
        })),
        ...hackathons.flatMap(h => {
            const events = [];
            if (h.submissionDeadline && h.submissionDeadline >= today) {
                events.push({ id: h.id + '_sub', title: `Submit: ${h.name}`, date: h.submissionDeadline, type: 'hackathon', priority: 'high' });
            }
            if (h.registrationDeadline && h.registrationDeadline >= today) {
                events.push({ id: h.id + '_reg', title: `Register: ${h.name}`, date: h.registrationDeadline, type: 'hackathon', priority: 'high' });
            }
            if (h.eventStartDate && h.eventStartDate >= today) {
                events.push({ id: h.id + '_start', title: `Start: ${h.name}`, date: h.eventStartDate, type: 'hackathon', priority: 'medium' });
            }
            return events;
        })
    ];

    allDeadlines.sort((a, b) => a.date.getTime() - b.date.getTime());

    return allDeadlines.slice(0, 1).map(d => ({
        ...d,
        date: d.date.toISOString(), // Serializable
        priority: d.priority as 'high' | 'medium' | 'low'
    }))[0] || null;
}
