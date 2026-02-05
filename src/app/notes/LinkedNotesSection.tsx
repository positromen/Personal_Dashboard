'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Plus, StickyNote, Trash2, X, ExternalLink } from 'lucide-react';
import { createNote, linkNote, unlinkNote } from '@/server/container/noteActions';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Types defined inline to avoid Prisma import issues
interface LinkedNote {
    id: string;
    noteId: string;
    note: {
        id: string;
        title: string | null;
        content: string;
        updatedAt: Date;
    };
}

interface NoteSummary {
    id: string;
    title: string | null;
    content: string;
}

interface LinkedNotesSectionProps {
    targetType: 'project' | 'hackathon';
    targetId: string;
    linkedNotes: LinkedNote[];
    allNotes: NoteSummary[];
}

export default function LinkedNotesSection({ targetType, targetId, linkedNotes, allNotes }: LinkedNotesSectionProps) {
    const router = useRouter();
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [mode, setMode] = useState<'existing' | 'new'>('existing');

    // Existing Note Selection
    const [selectedNoteId, setSelectedNoteId] = useState('');

    // New Note Creation
    const [newNoteTitle, setNewNoteTitle] = useState('');
    const [newNoteContent, setNewNoteContent] = useState('');

    const handleLinkExisting = async () => {
        if (!selectedNoteId) return;
        try {
            await linkNote(selectedNoteId, targetType, targetId);
            setIsLinkModalOpen(false);
            setSelectedNoteId('');
            router.refresh();
        } catch (e) {
            console.error(e);
            alert('Failed to link note');
        }
    };

    const handleCreateAndLink = async () => {
        if (!newNoteContent) return;
        try {
            const note = await createNote({ title: newNoteTitle, content: newNoteContent });
            await linkNote(note.id, targetType, targetId);
            setIsLinkModalOpen(false);
            setNewNoteTitle('');
            setNewNoteContent('');
            router.refresh();
        } catch (e) {
            console.error(e);
            alert('Failed to create and link note');
        }
    };

    const handleUnlink = async (linkId: string) => {
        if (!confirm('Unlink this note? (Note will not be deleted)')) return;
        try {
            await unlinkNote(linkId);
            router.refresh();
        } catch (e) {
            console.error(e);
            alert('Failed to unlink');
        }
    };

    // Filter out already linked notes from available options
    const availableNotes = allNotes.filter(n => !linkedNotes.some(ln => ln.noteId === n.id));

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-4 mt-8">
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-amber-500" />
                    Linked Notes
                </h3>
                <Button size="sm" variant="ghost" onClick={() => setIsLinkModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Link Note
                </Button>
            </div>

            {linkedNotes.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <StickyNote className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm">No notes linked to this {targetType}</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {linkedNotes.map(link => (
                        <div
                            key={link.id}
                            className="flex items-start justify-between p-3 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50/30 transition-all group"
                        >
                            <Link href={`/notes/${link.note.id}`} className="flex-1 block min-w-0">
                                <div className="flex flex-col gap-0.5">
                                    <h4 className="font-medium text-slate-800 group-hover:text-amber-700 flex items-center gap-1 truncate">
                                        {link.note.title || 'Untitled Note'}
                                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 shrink-0" />
                                    </h4>
                                    <p className="text-sm text-slate-500 line-clamp-1">
                                        {link.note.content || <span className="italic">No content</span>}
                                    </p>
                                    <span className="text-xs text-slate-400 mt-1">
                                        Updated {formatDistanceToNow(new Date(link.note.updatedAt))} ago
                                    </span>
                                </div>
                            </Link>
                            <button
                                onClick={() => handleUnlink(link.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                title="Unlink Note"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Link Modal */}
            {isLinkModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 border border-slate-200">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-lg text-slate-800">Link Note</h4>
                            <button onClick={() => setIsLinkModalOpen(false)}>
                                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                            </button>
                        </div>

                        {/* Mode Toggle */}
                        <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-lg">
                            <button
                                className={cn(
                                    "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                                    mode === 'existing'
                                        ? 'bg-white shadow text-slate-900'
                                        : 'text-slate-500 hover:text-slate-700'
                                )}
                                onClick={() => setMode('existing')}
                            >
                                Link Existing
                            </button>
                            <button
                                className={cn(
                                    "flex-1 py-1.5 text-sm font-medium rounded-md transition-all",
                                    mode === 'new'
                                        ? 'bg-white shadow text-slate-900'
                                        : 'text-slate-500 hover:text-slate-700'
                                )}
                                onClick={() => setMode('new')}
                            >
                                Create New
                            </button>
                        </div>

                        {mode === 'existing' ? (
                            <div className="space-y-4">
                                <select
                                    className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                                    value={selectedNoteId}
                                    onChange={e => setSelectedNoteId(e.target.value)}
                                >
                                    <option value="">Select a note...</option>
                                    {availableNotes.map(n => (
                                        <option key={n.id} value={n.id}>
                                            {n.title || 'Untitled'} - {n.content.slice(0, 30)}...
                                        </option>
                                    ))}
                                </select>
                                {availableNotes.length === 0 && (
                                    <p className="text-xs text-orange-500">No unlinked notes available.</p>
                                )}
                                <div className="flex justify-end pt-2">
                                    <Button onClick={handleLinkExisting} disabled={!selectedNoteId}>
                                        Link Selected
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Note Title (Optional)"
                                    className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none"
                                    value={newNoteTitle}
                                    onChange={e => setNewNoteTitle(e.target.value)}
                                />
                                <textarea
                                    className="w-full h-32 p-3 border border-slate-200 bg-white rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 text-slate-700 placeholder:text-slate-400"
                                    placeholder="Content..."
                                    value={newNoteContent}
                                    onChange={e => setNewNoteContent(e.target.value)}
                                />
                                <div className="flex justify-end pt-2">
                                    <Button onClick={handleCreateAndLink} disabled={!newNoteContent}>
                                        Create & Link
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
