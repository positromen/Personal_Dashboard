import { getAllProjects, getAllHackathons } from '@/server/queries';
import NoteDetailClient from '../[id]/NoteDetailClient';
import { Layout } from '@/components/layout/Layout';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function NewNotePage() {
    const projects = await getAllProjects();
    const hackathons = await getAllHackathons();

    return (
        <Layout title="New Note" subtitle="Create a new note">
            <NoteDetailClient isNew={true} projects={projects} hackathons={hackathons} />
        </Layout>
    );
}
