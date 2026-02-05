'use server';

import { prisma } from '@/lib/db';
import { CreateProjectSchema, UpdateProjectSchema, CreateHackathonSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { syncHackathonCalendarEvents, syncProjectCalendarEvents } from '@/server/calendar/actions';

// =============================================
// PROJECT ACTIONS
// =============================================

export async function createProject(input: z.infer<typeof CreateProjectSchema>) {
    const data = CreateProjectSchema.parse(input);

    const project = await prisma.project.create({
        data: {
            name: data.name,
            description: data.description,
            deadline: data.deadline ? new Date(data.deadline) : null,
            history: {
                create: { type: 'CREATE', newValue: JSON.stringify(data) }
            }
        }
    });

    // Auto-sync calendar event if project has deadline
    if (project.deadline) {
        await syncProjectCalendarEvents(project.id);
    }

    revalidatePath('/');
    return project;
}

export async function updateProject(input: z.infer<typeof UpdateProjectSchema>) {
    const data = UpdateProjectSchema.parse(input);

    await prisma.$transaction(async (tx) => {
        const current = await tx.project.findUniqueOrThrow({ where: { id: data.id } });

        const changes: Record<string, string | Date | null> = {};
        const events = [];

        if (data.name && data.name !== current.name) {
            changes.name = data.name;
            events.push({ field: 'name', old: current.name, new: data.name });
        }
        if (data.stage && data.stage !== current.stage) {
            changes.stage = data.stage;
            events.push({ field: 'stage', old: current.stage, new: data.stage });
        }
        // Description handling
        if (data.description !== undefined && data.description !== current.description) {
            changes.description = data.description;
            events.push({ field: 'description', old: current.description || '', new: data.description });
        }
        // Deadline handling - convert string to Date
        if (data.deadline !== undefined) {
            const newDeadline = data.deadline ? new Date(data.deadline) : null;
            const currentDeadlineStr = current.deadline ? current.deadline.toISOString().split('T')[0] : null;
            if (data.deadline !== currentDeadlineStr) {
                changes.deadline = newDeadline;
                events.push({ field: 'deadline', old: currentDeadlineStr || 'Not set', new: data.deadline || 'Not set' });
            }
        }

        if (Object.keys(changes).length > 0) {
            changes.lastActivity = new Date(); // Update last activity timestamp
            await tx.project.update({
                where: { id: data.id },
                data: changes
            });

            for (const e of events) {
                await tx.projectEvent.create({
                    data: {
                        projectId: data.id,
                        type: 'UPDATE',
                        field: e.field,
                        oldValue: String(e.old),
                        newValue: String(e.new)
                    }
                });
            }
        }
    });

    // Sync calendar events after update (outside transaction)
    await syncProjectCalendarEvents(data.id);

    revalidatePath('/');
}

// =============================================
// HACKATHON ACTIONS
// =============================================

export async function createHackathon(input: z.infer<typeof CreateHackathonSchema>) {
    const data = CreateHackathonSchema.parse(input);

    const hackathon = await prisma.hackathon.create({
        data: {
            name: data.name,
            organizer: data.organizer,
            mode: data.mode,
            theme: data.theme,
            teamSize: data.teamSize,
            registrationDeadline: data.registrationDeadline ? new Date(data.registrationDeadline) : null,
            submissionDeadline: data.submissionDeadline ? new Date(data.submissionDeadline) : null,
            eventStartDate: data.eventStartDate ? new Date(data.eventStartDate) : null,
            eventEndDate: data.eventEndDate ? new Date(data.eventEndDate) : null,
            projectTitle: data.projectTitle,
            projectDescription: data.projectDescription,
            registrationLink: data.registrationLink,
            submissionPortal: data.submissionPortal,
            discordSlack: data.discordSlack,
            status: 'upcoming',
            history: {
                create: { type: 'CREATE', newValue: JSON.stringify(data) }
            }
        }
    });

    // Auto-sync calendar events (registration, submission, event dates)
    await syncHackathonCalendarEvents(hackathon.id);

    revalidatePath('/');
    return hackathon;
}

// HACKATHON WORKFLOW ACTIONS

export async function registerForHackathon(hackathonId: string) {
    const hackathon = await prisma.hackathon.findUnique({ where: { id: hackathonId } });
    if (!hackathon) throw new Error("Hackathon not found");

    await prisma.$transaction(async (tx) => {
        // 1. Create Project if not linked
        let projectId = hackathon.linkedProjectId;
        if (!projectId) {
            const newProject = await tx.project.create({
                data: {
                    name: hackathon.projectTitle || hackathon.name,
                    description: hackathon.projectDescription || `Project for ${hackathon.name}`,
                    deadline: hackathon.submissionDeadline ? new Date(hackathon.submissionDeadline) : null,
                    originHackathonId: hackathon.id,
                    stage: 'planning'
                }
            });
            projectId = newProject.id;
        }

        // 2. Update Hackathon
        await tx.hackathon.update({
            where: { id: hackathonId },
            data: {
                status: 'registered',
                linkedProjectId: projectId
            }
        });

        // 3. Create Default Tasks
        const taskCount = await tx.task.count({ where: { projectId } });
        if (taskCount === 0) {
            await tx.task.createMany({
                data: [
                    {
                        title: 'Form Team',
                        projectId,
                        state: 'pending',
                        priority: 'high',
                        description: 'Finalize team members and roles'
                    },
                    {
                        title: 'Brainstorm Ideas',
                        projectId,
                        state: 'pending',
                        priority: 'high',
                        description: 'Problem statement and solution'
                    },
                    {
                        title: 'Setup MVP',
                        projectId,
                        state: 'pending',
                        priority: 'medium',
                        description: 'Repo and boilerplate'
                    }
                ]
            });
        }
    });

    revalidatePath('/');
}

export async function updateHackathonStatus(id: string, status: string) {
    await prisma.hackathon.update({
        where: { id },
        data: { status }
    });
    revalidatePath('/');
}

export async function submitHackathon(id: string) {
    await prisma.hackathon.update({
        where: { id },
        data: { status: 'submitted' }
    });
    revalidatePath('/');
}

export async function markHackathonMissed(id: string) {
    await prisma.hackathon.update({
        where: { id },
        data: { status: 'missed' }
    });
    revalidatePath('/');
}


// ... Hackathon Actions ...

// HELPER ACTIONS FOR PROJECT SUB-ENTITIES

export async function addLink(projectId: string, title: string, url: string, description?: string) {
    if (!projectId || !title || !url) throw new Error("Invalid Link Data");

    await prisma.projectLink.create({
        data: {
            projectId,
            title,
            url,
            description
        }
    });
    revalidatePath('/');
}

export async function addNote(projectId: string, content: string) {
    if (!projectId || !content) throw new Error("Invalid Note Data");

    await prisma.projectNote.create({
        data: {
            projectId,
            content
        }
    });
    revalidatePath('/');
}

// =============================================
// DELETE ACTIONS WITH CASCADE
// =============================================

export async function deleteProject(id: string) {
    if (!id) throw new Error("Project ID is required");

    // First, check if this project is linked to a hackathon
    const project = await prisma.project.findUnique({
        where: { id },
        select: { originHackathonId: true }
    });

    // If project was linked to hackathon, unlink it first
    if (project?.originHackathonId) {
        await prisma.hackathon.update({
            where: { id: project.originHackathonId },
            data: { linkedProjectId: null }
        });
    }

    // Delete project (cascades to tasks, links, notes, events, calendar events)
    await prisma.project.delete({
        where: { id }
    });

    revalidatePath('/');
    return { deleted: true };
}

export async function deleteHackathon(id: string) {
    if (!id) throw new Error("Hackathon ID is required");

    // First, check if hackathon has a linked project - delete it too
    const hackathon = await prisma.hackathon.findUnique({
        where: { id },
        select: { linkedProjectId: true }
    });

    // If hackathon has linked project, delete it first (cascade)
    if (hackathon?.linkedProjectId) {
        await prisma.project.delete({
            where: { id: hackathon.linkedProjectId }
        });
    }

    // Delete hackathon (cascades to tasks, links, notes, events, calendar events)
    await prisma.hackathon.delete({
        where: { id }
    });

    revalidatePath('/');
    return { deleted: true };
}

export async function deleteTask(id: string) {
    if (!id) throw new Error("Task ID is required");

    await prisma.task.delete({
        where: { id }
    });

    revalidatePath('/');
    return { deleted: true };
}

// =============================================
// HACKATHON UPDATE ACTION
// =============================================

export async function updateHackathon(input: {
    id: string;
    name?: string;
    organizer?: string;
    mode?: string;
    theme?: string;
    teamSize?: number;
    registrationDeadline?: string | null;
    submissionDeadline?: string | null;
    eventStartDate?: string | null;
    eventEndDate?: string | null;
    projectTitle?: string;
    projectDescription?: string;
    registrationLink?: string;
    submissionPortal?: string;
    discordSlack?: string;
}) {
    const hackathon = await prisma.hackathon.update({
        where: { id: input.id },
        data: {
            name: input.name,
            organizer: input.organizer,
            mode: input.mode,
            theme: input.theme,
            teamSize: input.teamSize,
            registrationDeadline: input.registrationDeadline ? new Date(input.registrationDeadline) : input.registrationDeadline === null ? null : undefined,
            submissionDeadline: input.submissionDeadline ? new Date(input.submissionDeadline) : input.submissionDeadline === null ? null : undefined,
            eventStartDate: input.eventStartDate ? new Date(input.eventStartDate) : input.eventStartDate === null ? null : undefined,
            eventEndDate: input.eventEndDate ? new Date(input.eventEndDate) : input.eventEndDate === null ? null : undefined,
            projectTitle: input.projectTitle,
            projectDescription: input.projectDescription,
            registrationLink: input.registrationLink,
            submissionPortal: input.submissionPortal,
            discordSlack: input.discordSlack,
        }
    });

    // Sync calendar events after update
    await syncHackathonCalendarEvents(hackathon.id);

    revalidatePath('/');
    return hackathon;
}

// =============================================
// LINK PROJECT TO HACKATHON
// =============================================

export async function linkProjectToHackathon(hackathonId: string, projectId: string) {
    if (!hackathonId || !projectId) throw new Error("Hackathon ID and Project ID are required");

    // Transaction to safely update both sides of the relation
    await prisma.$transaction(async (tx) => {
        // 1. Check if hackathon already has a linked project
        const hackathon = await tx.hackathon.findUnique({ where: { id: hackathonId }, select: { linkedProjectId: true } });
        if (hackathon?.linkedProjectId) {
            // Unlink old project first
            await tx.project.update({
                where: { id: hackathon.linkedProjectId },
                data: { originHackathonId: null }
            });
        }

        // 2. Check if project already has an origin hackathon
        const project = await tx.project.findUnique({ where: { id: projectId }, select: { originHackathonId: true } });
        if (project?.originHackathonId) {
            // Unlink old hackathon first
            await tx.hackathon.update({
                where: { id: project.originHackathonId },
                data: { linkedProjectId: null }
            });
        }

        // 3. Link them
        await tx.project.update({
            where: { id: projectId },
            data: { originHackathonId: hackathonId }
        });

        await tx.hackathon.update({
            where: { id: hackathonId },
            data: { linkedProjectId: projectId }
        });
    });

    revalidatePath('/');
    return { linked: true };
}

export async function unlinkProjectFromHackathon(hackathonId: string) {
    if (!hackathonId) throw new Error("Hackathon ID is required");

    const hackathon = await prisma.hackathon.findUnique({
        where: { id: hackathonId },
        select: { linkedProjectId: true }
    });

    if (hackathon?.linkedProjectId) {
        // Remove the link from project side
        await prisma.project.update({
            where: { id: hackathon.linkedProjectId },
            data: { originHackathonId: null }
        });

        // Remove the link from hackathon side
        await prisma.hackathon.update({
            where: { id: hackathonId },
            data: { linkedProjectId: null }
        });
    }

    revalidatePath('/');
    return { unlinked: true };
}

// =============================================
// TASK ACTIONS
// =============================================

export async function createTask(input: {
    title: string;
    description?: string;
    priority?: string;
    dueDate?: string;
    projectId?: string;
    hackathonId?: string;
}) {
    const task = await prisma.task.create({
        data: {
            title: input.title,
            description: input.description || null,
            priority: input.priority || 'medium',
            dueDate: input.dueDate ? new Date(input.dueDate) : null,
            projectId: input.projectId || null,
            hackathonId: input.hackathonId || null,
            state: 'pending',
            history: {
                create: { type: 'CREATE', newValue: JSON.stringify(input) }
            }
        }
    });

    revalidatePath('/');
    return task;
}

export async function updateTaskState(id: string, state: string) {
    await prisma.task.update({
        where: { id },
        data: {
            state,
            completedAt: state === 'done' ? new Date() : null
        }
    });

    revalidatePath('/');
}

export async function updateTask(id: string, updates: {
    title?: string;
    description?: string;
    priority?: string;
    dueDate?: string | null;
    state?: string;
}) {
    await prisma.task.update({
        where: { id },
        data: {
            title: updates.title,
            description: updates.description,
            priority: updates.priority,
            dueDate: updates.dueDate ? new Date(updates.dueDate) : updates.dueDate === null ? null : undefined,
            state: updates.state,
            completedAt: updates.state === 'done' ? new Date() : updates.state ? null : undefined
        }
    });

    revalidatePath('/');
}
