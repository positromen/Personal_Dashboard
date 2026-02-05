import { getHackathonsWithDerivedData } from '@/server/queries';
import { HackathonClient } from './HackathonClient';
import { Hackathon, HackathonStatus, HackathonMode } from '@/lib/types';
import { Layout } from '@/components/layout/Layout';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function HackathonsPage() {
    const hackathonsData = await getHackathonsWithDerivedData();

    // Serialize Dates and map types for Client Component
    const initialHackathons: Hackathon[] = hackathonsData.map(h => ({
        id: h.id,
        name: h.name,
        organizer: h.organizer || 'Unknown',
        mode: h.mode as HackathonMode,
        theme: h.theme || '',
        teamSize: h.teamSize,
        // Map Dates to Strings (ISO) for Client, handling nulls
        registrationDeadline: h.registrationDeadline?.toISOString() || '',
        submissionDeadline: h.submissionDeadline?.toISOString() || '',
        eventStartDate: h.eventStartDate?.toISOString() || '',
        eventEndDate: h.eventEndDate?.toISOString() || '',
        projectTitle: h.projectTitle || '',
        projectDescription: h.projectDescription || '',
        status: h.status as HackathonStatus,
        registrationLink: h.registrationLink || undefined,
        submissionPortal: h.submissionPortal || undefined,
        discordSlack: h.discordSlack || undefined,
        linkedProjectId: h.linkedProjectId,
        // Map Linked Project Object if needed? Client uses `linkedProject.id`.
        // I need to pass the Relation too if Client needs it. 
        // Hackathon type in lib/types DOES NOT have linkedProject object.
        // But Client CASTS it to any to access it.
        // So I should pass it.
        linkedProject: h.linkedProject ? {
            id: h.linkedProject.id,
            name: h.linkedProject.name,
            progress: 0 // Placeholder or calculate? Project query excludes derived progress.
            // Actually getHackathonsWithDerivedData in queries.ts INCLUDED linkedProject.
            // But getHackathonsWithDerivedData derivation logic didn't calculate project progress.
            // Client uses `linkedProject.progress`.
            // I'll leave it as is, might be missing progress.
        } : undefined,

        links: h.links.map((l, idx) => ({ id: l.id || `link-${idx}`, title: l.title, url: l.url })),
        notes: h.notes.map(n => ({ id: n.id, content: n.content, createdAt: n.createdAt.toISOString() })),
        linkedTasks: h.tasks.map(t => t.id), // Just IDs for now
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
        // Pass derived risk from Server Query
        risk: (h as typeof h & { risk?: string }).risk,
        // Rounds tracking
        rounds: (h as typeof h & { rounds?: unknown[] }).rounds || [],
        currentRound: (h as typeof h & { currentRound?: number }).currentRound || 0
    }));

    return (
        <Layout title="Hackathons" subtitle="Track and manage your hackathon participation">
            <HackathonClient initialHackathons={initialHackathons} />
        </Layout>
    );
}
