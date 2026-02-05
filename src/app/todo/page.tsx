import { Layout } from '@/components/layout/Layout';
import { getAllTasks, getProjectsWithDerivedData, getHackathonsWithDerivedData } from '@/server/queries';
import { TodoClient } from './TodoClient';
import { Task } from '@/lib/types';

export const dynamic = 'force-dynamic'; // Ensure fresh data on every request

export default async function TodoPage() {
    // 1. Fetch Data from DB (Strict Execution Graph)
    const [dbTasks, dbProjects, dbHackathons] = await Promise.all([
        getAllTasks(),
        getProjectsWithDerivedData(),
        getHackathonsWithDerivedData()
    ]);

    // 2. Map Database Types to UI Types
    const tasks: Task[] = dbTasks.map(t => ({
        id: t.id,
        title: t.title,
        status: (t.state === 'completed' ? 'done' : 'pending') as Task['status'],
        priority: t.priority as 'low' | 'medium' | 'high',
        dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : undefined,
        contextType: (t.hackathonId ? 'hackathon' : (t.projectId ? 'project' : 'standalone')) as Task['contextType'],
        contextId: t.hackathonId || t.projectId || '',
        createdAt: t.createdAt.toISOString(),
        completedAt: t.completedAt ? t.completedAt.toISOString() : undefined
    }));

    // Map Projects/Hackathons to simple options for context selection
    const projects = dbProjects.map(p => ({
        id: p.id,
        name: p.name
    }));

    const hackathons = dbHackathons.map(h => ({
        id: h.id,
        name: h.name
    }));

    return (
        <Layout title="To-Do" subtitle="Task Execution Graph">
            <TodoClient
                initialTasks={tasks}
                projects={projects}
                hackathons={hackathons}
            />
        </Layout>
    );
}
