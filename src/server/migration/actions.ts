'use server';

import { prisma } from '@/lib/db';
// Import legacy types or schemas? We assume loose JSON matching or re-use validation schemas

interface LegacyProject {
    id: string;
    name: string;
    description?: string;
    stage?: string;
    deadline?: string;
    createdAt?: string;
}

interface LegacyTask {
    id: string;
    title: string;
    description?: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    projectId?: string;
    hackathonId?: string;
    contextType?: string;
    contextId?: string;
    createdAt?: string;
}

interface LegacyHackathon {
    id: string;
    name: string;
    mode?: string;
    status?: string;
    createdAt?: string;
}

/**
 * MIGRATION ACTION
 * Imports a full dump of Projects, Tasks, Hackathons.
 * Idempotent: Skips if ID exists.
 */
export async function importLegacyData(payload: {
    projects: LegacyProject[],
    tasks: LegacyTask[],
    hackathons: LegacyHackathon[]
}) {
    console.log(`Starting Migration: ${payload.projects.length} Projects, ${payload.tasks.length} Tasks...`);

    const result = await prisma.$transaction(async (tx) => {
        let pCount = 0;
        let hCount = 0;
        let tCount = 0;

        // 1. Projects
        for (const p of payload.projects) {
            const exists = await tx.project.findUnique({ where: { id: p.id } });
            if (!exists) {
                await tx.project.create({
                    data: {
                        id: p.id,
                        name: p.name,
                        description: p.description,
                        stage: p.stage, // Ensure Enum matches or map it
                        deadline: p.deadline ? new Date(p.deadline) : null,
                        createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
                        history: {
                            create: { type: 'CREATE', newValue: 'MIGRATION_IMPORT' }
                        }
                    }
                });
                pCount++;
            }
        }

        // 2. Hackathons
        for (const h of payload.hackathons) {
            const exists = await tx.hackathon.findUnique({ where: { id: h.id } });
            if (!exists) {
                await tx.hackathon.create({
                    data: {
                        id: h.id,
                        name: h.name,
                        mode: h.mode,
                        status: h.status,
                        // map other fields...
                        createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
                        history: {
                            create: { type: 'CREATE', newValue: 'MIGRATION_IMPORT' }
                        }
                    }
                });
                hCount++;
            }
        }

        // 3. Tasks
        for (const t of payload.tasks) {
            const exists = await tx.task.findUnique({ where: { id: t.id } });
            if (!exists) {
                // Resolve Context
                // Legacy: contextType / projectId / hackathonId
                // Strict: projectId OR hackathonId
                const pid = t.projectId || (t.contextType === 'project' ? t.contextId : null);
                const hid = t.hackathonId || (t.contextType === 'hackathon' ? t.contextId : null);

                // Validate FK existence? Prisma throws if FK invalid.
                // We might need to skip orphans or create placeholders.
                // For now, assume FKs exist if we migrated Projects/Hackathons first.

                try {
                    await tx.task.create({
                        data: {
                            id: t.id,
                            title: t.title,
                            description: t.description,
                            state: t.status === 'done' ? 'completed' : t.status, // Map 'done' -> 'completed'
                            priority: t.priority,
                            dueDate: t.dueDate ? new Date(t.dueDate) : null,
                            projectId: pid,
                            hackathonId: hid,
                            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
                            history: {
                                create: { type: 'CREATE', newValue: 'MIGRATION_IMPORT' }
                            }
                        }
                    });
                    tCount++;
                } catch (e) {
                    console.warn(`Skipping Orphan Task ${t.id}:`, e);
                }
            }
        }

        return { pCount, hCount, tCount };
    });

    return result;
}
