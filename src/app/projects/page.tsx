import { Layout } from '@/components/layout/Layout';
import { getProjectsWithDerivedData } from '@/server/queries';
import { ProjectsClient } from './ProjectsClient';
import { Project } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
    // 1. Fetch
    const dbProjects = await getProjectsWithDerivedData();

    // 2. Map
    const projects: Project[] = dbProjects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        // Infer domain from context or default
        domain: p.originHackathonId ? 'hackathon' : 'personal',
        stage: p.stage as 'planning' | 'building' | 'testing' | 'finalizing' | 'completed', // 'planning' | 'building' ... matches strings
        status: (p as typeof p & { risk?: string }).risk === 'critical' ? 'at-risk' : 'active',
        priority: 'medium', // Default if not in DB
        progress: (p as typeof p & { progress?: number }).progress || 0,
        deadline: p.deadline ? p.deadline.toISOString().split('T')[0] : undefined,
        links: p.links.map((l, idx) => ({ id: l.id || `link-${idx}`, title: l.title, url: l.url })),
        notes: p.notes.map(n => ({ id: n.id, content: n.content, createdAt: n.createdAt.toISOString() })),
        linkedTasks: p.tasks.map(t => t.id), // Just IDs for count
        linkedComponents: [],
        lastActivity: p.lastActivity.toISOString(),
        createdAt: p.createdAt.toISOString()
    }));

    // 3. Render
    return (
        <Layout title="Projects" subtitle="Overview of all active and archived projects">
            <ProjectsClient initialProjects={projects} />
        </Layout>
    );
}
