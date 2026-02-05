import { getNotes } from '@/server/container/noteActions';
import NoteListClient from './NoteListClient';
import { Layout } from '@/components/layout/Layout';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function NotesPage() {
    const notes = await getNotes();

    return (
        <Layout title="Notes" subtitle="Capture thoughts, ideas, and knowledge">
            <NoteListClient notes={notes} />
        </Layout>
    );
}
