'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createNote(data: { content: string; title?: string }) {
    const note = await prisma.note.create({
        data: {
            content: data.content,
            title: data.title
        }
    });
    revalidatePath('/notes');
    return note;
}

export async function updateNote(id: string, data: { content: string; title?: string }) {
    const note = await prisma.note.update({
        where: { id },
        data: {
            content: data.content,
            title: data.title
        }
    });
    revalidatePath(`/notes/${id}`);
    revalidatePath('/notes');
    return note;
}

export async function deleteNote(id: string) {
    await prisma.note.delete({
        where: { id }
    });
    revalidatePath('/notes');
}

export async function linkNote(noteId: string, targetType: 'project' | 'hackathon', targetId: string) {
    if (targetType === 'project') {
        // Check if link already exists to prevent duplicates?
        // Schema doesn't enforce unique link per pair unless I added @@unique. I didn't. 
        // Logic should check.
        const existing = await prisma.noteLink.findFirst({
            where: { noteId, projectId: targetId }
        });
        if (existing) return existing;

        await prisma.noteLink.create({
            data: {
                noteId,
                projectId: targetId
            }
        });
        revalidatePath(`/projects/${targetId}`);
    } else {
        const existing = await prisma.noteLink.findFirst({
            where: { noteId, hackathonId: targetId }
        });
        if (existing) return existing;

        await prisma.noteLink.create({
            data: {
                noteId,
                hackathonId: targetId
            }
        });
        revalidatePath(`/hackathons/${targetId}`);
    }
    revalidatePath(`/notes/${noteId}`);
    revalidatePath('/notes');
}

export async function unlinkNote(linkId: string) {
    const link = await prisma.noteLink.findUnique({ where: { id: linkId } });
    if (!link) return;

    await prisma.noteLink.delete({
        where: { id: linkId }
    });

    if (link.projectId) revalidatePath(`/projects/${link.projectId}`);
    if (link.hackathonId) revalidatePath(`/hackathons/${link.hackathonId}`);
    revalidatePath(`/notes/${link.noteId}`);
}

export async function getNotes() {
    return await prisma.note.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
            links: {
                include: {
                    project: { select: { name: true } },
                    hackathon: { select: { name: true } }
                }
            }
        }
    });
}

export async function getNote(id: string) {
    return await prisma.note.findUnique({
        where: { id },
        include: {
            links: {
                include: {
                    project: { select: { id: true, name: true } },
                    hackathon: { select: { id: true, name: true } }
                }
            }
        }
    });
}
