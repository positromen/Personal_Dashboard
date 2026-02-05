import { getNote } from '@/server/container/noteActions';
import { getAllProjects, getAllHackathons } from '@/server/queries';
import NoteDetailClient from './NoteDetailClient';
import { Layout } from '@/components/layout/Layout';
import { notFound } from 'next/navigation';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    if (id === 'new') return notFound();

    const note = await getNote(id);
    if (!note) return notFound();

    const projects = await getAllProjects();
    const hackathons = await getAllHackathons();

    return (
        <Layout title={note.title || 'Untitled Note'} subtitle="Edit and manage your note">
            <NoteDetailClient note={note} projects={projects} hackathons={hackathons} />
        </Layout>
    );
}
