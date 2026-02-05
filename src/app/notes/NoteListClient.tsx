'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
    Plus,
    StickyNote,
    FolderKanban,
    Zap,
    Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

// Types defined inline to avoid Prisma import issues
interface NoteWithLinks {
    id: string;
    title: string | null;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    links: {
        id: string;
        project: { name: string } | null;
        hackathon: { name: string } | null;
    }[];
}

export default function NoteListClient({ notes }: { notes: NoteWithLinks[] }) {
    // Sort by most recently updated
    const sortedNotes = [...notes].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Stats
    const totalNotes = notes.length;

    return (
        <div className="space-y-6">
            {/* Filter Tabs & New Note Button - Matching Hackathon Layout */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                    <button className="px-3 py-1.5 rounded-md text-sm font-medium bg-white shadow text-slate-800">
                        All ({totalNotes})
                    </button>
                </div>
                <Link href="/notes/new">
                    <Button>
                        <Plus className="h-4 w-4 mr-1" />
                        New Note
                    </Button>
                </Link>
            </div>

            {/* Notes Grid */}
            {sortedNotes.length === 0 ? (
                <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
                        <StickyNote className="h-8 w-8 text-amber-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">No notes yet</h3>
                    <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">
                        Start writing to build your knowledge base. Notes can be linked to projects and hackathons.
                    </p>
                    <Link href="/notes/new">
                        <Button>Create your first note</Button>
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sortedNotes.map(note => (
                        <Link key={note.id} href={`/notes/${note.id}`} className="block group">
                            <div className="h-full bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-5 flex flex-col">
                                {/* Header with Icon */}
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                                        <StickyNote className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                                            {note.title || 'Untitled Note'}
                                        </h3>
                                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                                            <Clock className="h-3 w-3" />
                                            <span>{formatDistanceToNow(new Date(note.updatedAt))} ago</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Preview */}
                                <p className="text-slate-500 text-sm line-clamp-3 flex-1 mb-4 leading-relaxed">
                                    {note.content || <span className="italic text-slate-400">No content...</span>}
                                </p>

                                {/* Linked Contexts Footer */}
                                {note.links.length > 0 && (
                                    <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                                        {note.links.slice(0, 2).map(link => (
                                            <span
                                                key={link.id}
                                                className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                                    link.project
                                                        ? "bg-indigo-50 text-indigo-600"
                                                        : "bg-orange-50 text-orange-600"
                                                )}
                                                title={link.project?.name || link.hackathon?.name || ''}
                                            >
                                                {link.project ? (
                                                    <FolderKanban className="h-2.5 w-2.5" />
                                                ) : (
                                                    <Zap className="h-2.5 w-2.5" />
                                                )}
                                                <span className="truncate max-w-[70px]">
                                                    {link.project?.name || link.hackathon?.name}
                                                </span>
                                            </span>
                                        ))}
                                        {note.links.length > 2 && (
                                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                                                +{note.links.length - 2}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
