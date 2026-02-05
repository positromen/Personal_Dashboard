import { getProjectById } from '@/server/queries';
import { getNotes } from '@/server/container/noteActions';
import { ProjectDetailClient } from './ProjectDetailClient';
import { Project, Task } from '@/lib/types';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: { id: string };
}


export default async function ProjectDetailPage({ params }: PageProps) {
    const { id } = await params;
    const projectData = await getProjectById(id);
    const allNotes = await getNotes();


    if (!projectData) {
        notFound();
    }

    // MAP DB Data -> UI Logic
    // 1. Tasks
    const tasks: Task[] = (projectData.tasks || []).map(t => ({
        id: t.id,
        title: t.title,
        status: t.state === 'completed' ? 'done' : 'pending',
        priority: t.priority as 'low' | 'medium' | 'high',
        dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : undefined,
        contextType: 'project',
        contextId: projectData.id,
        description: t.description || undefined,
        createdAt: t.createdAt.toISOString()
    }));

    // 2. Project Object
    const project: Project = {
        id: projectData.id,
        name: projectData.name,
        description: projectData.description || '',
        stage: projectData.stage as 'planning' | 'building' | 'testing' | 'finalizing' | 'completed',
        status: (projectData as typeof projectData & { risk?: string }).risk === 'critical' ? 'at-risk' : 'active', // Derived risk
        priority: 'medium',
        domain: projectData.originHackathonId ? 'hackathon' : 'personal', // Default
        progress: (projectData as typeof projectData & { progress?: number }).progress || 0,
        deadline: projectData.deadline ? projectData.deadline.toISOString().split('T')[0] : undefined,

        links: projectData.links.map(l => ({
            id: l.id,
            title: l.title,
            url: l.url,
            description: l.description || undefined
        })),

        notes: projectData.notes.map(n => ({
            id: n.id,
            content: n.content,
            createdAt: n.createdAt.toISOString()
        })),

        linkedTasks: tasks.map(t => t.id),
        linkedComponents: [], // Not implemented yet
        lastActivity: projectData.lastActivity.toISOString(),
        createdAt: projectData.createdAt.toISOString(),

        // Pass Hydrated Tasks
        tasks: tasks // Add this prop to Project type? OR pass as separate prop?
        // Project type in lib/types.ts does NOT have 'tasks: Task[]'.
        // ProjectDetailClient needs to cast it or render it.
        // In previous Step, I used `(project as any).tasks`.
        // So I'll inject it here.
    } as Project & { tasks: Task[] };

    return <ProjectDetailClient project={project} linkedNotes={projectData.noteLinks} allNotes={allNotes} />;
}
