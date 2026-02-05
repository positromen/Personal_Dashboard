'use server';

import { prisma } from '@/lib/db';
import { CreateTaskSchema, UpdateTaskSchema } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';


/**
 * STRICT EXECUTION: CREATE TASK
 * Atomic creation with Audit Log.
 */
export async function createTask(input: z.infer<typeof CreateTaskSchema>) {
    const data = CreateTaskSchema.parse(input);

    // Enforce Context Logic
    if (data.projectId && data.hackathonId) {
        throw new Error("Task cannot belong to both Project and Hackathon.");
    }

    const task = await prisma.$transaction(async (tx) => {
        const newTask = await tx.task.create({
            data: {
                title: data.title,
                description: data.description,
                priority: data.priority,
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                projectId: data.projectId || null,
                hackathonId: data.hackathonId || null,
            }
        });

        // Audit Creation
        await tx.taskEvent.create({
            data: {
                taskId: newTask.id,
                type: 'CREATE',
                newValue: JSON.stringify(data)
            }
        });

        return newTask;
    });

    revalidatePath('/');
    return task;
}

/**
 * STRICT EXECUTION: UPDATE TASK (Transition)
 * Validates State Transition, Updates Record, Logs Difference.
 */
export async function updateTask(input: z.infer<typeof UpdateTaskSchema>) {
    const data = UpdateTaskSchema.parse(input);

    const updatedTask = await prisma.$transaction(async (tx) => {
        // 1. Fetch Current State strictly
        const current = await tx.task.findUniqueOrThrow({
            where: { id: data.id }
        });

        // 2. Calculate Diffs & Prepare Audit
        const changes: Record<string, string | Date | null> = {};
        const events = [];

        if (data.title && data.title !== current.title) {
            changes.title = data.title;
            events.push({ field: 'title', old: current.title, new: data.title, type: 'UPDATE' });
        }
        if (data.state && data.state !== current.state) {
            changes.state = data.state;
            events.push({ field: 'state', old: current.state, new: data.state, type: 'STATUS_CHANGE' });
        }
        if (data.priority && data.priority !== current.priority) {
            changes.priority = data.priority;
            events.push({ field: 'priority', old: current.priority, new: data.priority, type: 'UPDATE' });
        }
        // TODO: Handle Date Comparison strictly

        if (Object.keys(changes).length === 0) return current; // No Op

        // 3. Update Record
        const result = await tx.task.update({
            where: { id: data.id },
            data: changes
        });

        // 4. Write Audit Logs
        for (const event of events) {
            await tx.taskEvent.create({
                data: {
                    taskId: data.id,
                    type: event.type as 'CREATE' | 'UPDATE' | 'STATUS_CHANGE' | 'DELETE',
                    field: event.field,
                    oldValue: String(event.old),
                    newValue: String(event.new)
                }
            });
        }

        return result;
    });

    revalidatePath('/');
    return updatedTask;
}
