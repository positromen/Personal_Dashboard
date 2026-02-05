import { getHackathonById, getAllProjects } from '@/server/queries';
import { getNotes } from '@/server/container/noteActions';
import { HackathonDetailClient } from './HackathonDetailClient';
import { Hackathon, Task, ProjectLink, ProjectNote } from '@/lib/types';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: { id: string };
}

export default async function HackathonDetailPage({ params }: PageProps) {
    const { id } = await params;
    const hackathonData = await getHackathonById(id);
    const allProjects = await getAllProjects();
    const allNotes = await getNotes();

    if (!hackathonData) {
        notFound();
    }

    // Map DB Data -> UI types
    const tasks: Task[] = (hackathonData.tasks || []).map(t => ({
        id: t.id,
        title: t.title,
        status: t.state === 'completed' ? 'done' : 'pending',
        priority: t.priority as 'low' | 'medium' | 'high',
        dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : undefined,
        contextType: 'hackathon',
        contextId: hackathonData.id,
        description: t.description || undefined,
        createdAt: t.createdAt.toISOString()
    }));

    const links: ProjectLink[] = (hackathonData.links || []).map(l => ({
        id: l.id,
        title: l.title,
        url: l.url,
        description: l.description || undefined
    }));

    const notes: ProjectNote[] = (hackathonData.notes || []).map(n => ({
        id: n.id,
        content: n.content,
        createdAt: n.createdAt.toISOString()
    }));

    const hackathon: Hackathon = {
        id: hackathonData.id,
        name: hackathonData.name,
        organizer: hackathonData.organizer || '',
        mode: hackathonData.mode as 'online' | 'offline' | 'hybrid',
        theme: hackathonData.theme || '',
        teamSize: hackathonData.teamSize,
        registrationDeadline: hackathonData.registrationDeadline ? hackathonData.registrationDeadline.toISOString().split('T')[0] : '',
        submissionDeadline: hackathonData.submissionDeadline ? hackathonData.submissionDeadline.toISOString().split('T')[0] : '',
        eventStartDate: hackathonData.eventStartDate ? hackathonData.eventStartDate.toISOString().split('T')[0] : '',
        eventEndDate: hackathonData.eventEndDate ? hackathonData.eventEndDate.toISOString().split('T')[0] : '',
        status: hackathonData.status as Hackathon['status'],
        linkedProjectId: hackathonData.linkedProject?.id || null,
        projectTitle: hackathonData.linkedProject?.name || '',
        projectDescription: hackathonData.linkedProject?.description || '',
        registrationLink: (hackathonData as typeof hackathonData & { registrationLink?: string }).registrationLink || '',
        submissionPortal: (hackathonData as typeof hackathonData & { submissionPortal?: string }).submissionPortal || '',
        discordSlack: (hackathonData as typeof hackathonData & { discordSlack?: string }).discordSlack || '',
        links,
        notes,
        linkedTasks: tasks.map(t => t.id),
        // Rounds tracking
        rounds: hackathonData.rounds || [],
        currentRound: hackathonData.currentRound || 0,
        createdAt: hackathonData.createdAt.toISOString(),
        updatedAt: hackathonData.updatedAt.toISOString(),
    };

    return <HackathonDetailClient hackathon={{...hackathon, tasks} as Hackathon & { tasks: Task[] }} projects={allProjects} linkedNotes={hackathonData.noteLinks} allNotes={allNotes} />;
}
