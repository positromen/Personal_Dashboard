'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import {
    StickyNote,
    Save,
    X,
    Link2,
    Trash2,
    ChevronLeft,
    FolderKanban,
    Zap,
    Clock,
    Plus
} from 'lucide-react';
import { createNote, updateNote, deleteNote, linkNote, unlinkNote } from '@/server/container/noteActions';
import { formatDistanceToNow } from 'date-fns';

// Types defined inline to avoid Prisma import issues
interface NoteWithLinks {
    id: string;
    title: string | null;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    links: {
        id: string;
        project: { id: string; name: string } | null;
        hackathon: { id: string; name: string } | null;
    }[];
}

interface NoteDetailClientProps {
    note?: NoteWithLinks;
    projects?: { id: string; name: string }[];
    hackathons?: { id: string; name: string }[];
    isNew?: boolean;
}

export default function NoteDetailClient({ note, projects = [], hackathons = [], isNew = false }: NoteDetailClientProps) {
    const router = useRouter();
    const [title, setTitle] = useState(note?.title || '');
    const [content, setContent] = useState(note?.content || '');
    const [isSaving, setIsSaving] = useState(false);

    // Linking State
    const [isLinkOpen, setIsLinkOpen] = useState(false);
    const [linkType, setLinkType] = useState<'project' | 'hackathon'>('project');
    const [selectedTargetId, setSelectedTargetId] = useState('');

    const handleSave = async () => {
        setIsSaving(true);
        try {
            if (isNew) {
                const created = await createNote({ title, content });
                router.push(`/notes/${created.id}`);
            } else if (note) {
                await updateNote(note.id, { title, content });
            }
            router.refresh();
        } catch (e) {
            console.error(e);
            alert('Failed to save note');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!note || !confirm('Are you sure you want to delete this note?')) return;
        try {
            await deleteNote(note.id);
            router.push('/notes');
        } catch (e) {
            console.error(e);
            alert('Failed to delete note');
        }
    };

    const handleLink = async () => {
        if (!note || !selectedTargetId) return;
        try {
            await linkNote(note.id, linkType, selectedTargetId);
            setIsLinkOpen(false);
            setSelectedTargetId('');
            router.refresh();
        } catch (e) {
            console.error(e);
            alert('Failed to link note');
        }
    };

    const handleUnlink = async (linkId: string) => {
        if (!confirm('Remove this link?')) return;
        try {
            await unlinkNote(linkId);
            router.refresh();
        } catch (e) {
            console.error(e);
            alert('Failed to unlink');
        }
    };

    const availableTargets = linkType === 'project' ? projects : hackathons;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* TOOLBAR - Matching HackathonDetailClient */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => router.push('/notes')}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back to Notes
                </Button>

                <div className="flex items-center gap-2">
                    {!isNew && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDelete}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                        </Button>
                    )}
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || (!title && !content)}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Note'}
                    </Button>
                </div>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
                {/* MAIN EDITOR CARD */}
                <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
                    {/* Header with Icon */}
                    <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                            <StickyNote className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Note Title"
                                className="w-full text-xl font-bold text-slate-800 placeholder:text-slate-300 bg-transparent border-b border-transparent focus:border-slate-300 outline-none pb-1 transition-colors"
                            />
                            <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                                <Clock className="h-3 w-3" />
                                <span>
                                    {note?.updatedAt
                                        ? `Last updated ${formatDistanceToNow(new Date(note.updatedAt))} ago`
                                        : 'New note'
                                    }
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Separator */}
                    <div className="border-t border-slate-100" />

                    {/* Content Textarea */}
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Start writing your note..."
                        className="w-full min-h-[450px] text-slate-700 placeholder:text-slate-400 bg-transparent outline-none resize-none leading-relaxed text-sm"
                    />
                </div>

                {/* SIDEBAR - Link Management */}
                {!isNew && (
                    <div className="space-y-4">
                        {/* Linked Contexts Card */}
                        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <Link2 className="h-4 w-4 text-slate-400" />
                                    Linked Contexts
                                </h3>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setIsLinkOpen(!isLinkOpen)}
                                    className="text-xs"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Link
                                </Button>
                            </div>

                            {/* Linked Items List */}
                            {note?.links && note.links.length > 0 ? (
                                <div className="space-y-2">
                                    {note.links.map(link => (
                                        <div
                                            key={link.id}
                                            className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-white transition-all group"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                {link.project ? (
                                                    <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600 shrink-0">
                                                        <FolderKanban className="h-3.5 w-3.5" />
                                                    </div>
                                                ) : (
                                                    <div className="p-1.5 rounded-lg bg-orange-100 text-orange-600 shrink-0">
                                                        <Zap className="h-3.5 w-3.5" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-700 truncate">
                                                        {link.project?.name || link.hackathon?.name}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 uppercase font-medium tracking-wide">
                                                        {link.project ? 'Project' : 'Hackathon'}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleUnlink(link.id)}
                                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                                title="Unlink"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    <StickyNote className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                                    <p className="text-sm text-slate-400">No linked contexts</p>
                                </div>
                            )}

                            {/* Link Selection Panel */}
                            {isLinkOpen && (
                                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    {/* Type Toggle - Matching HackathonDetailClient style */}
                                    <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                                        <button
                                            className={cn(
                                                "flex-1 text-xs py-2 px-3 rounded-md font-medium transition-all flex items-center justify-center gap-1.5",
                                                linkType === 'project'
                                                    ? 'bg-white shadow text-slate-900'
                                                    : 'text-slate-500 hover:text-slate-700'
                                            )}
                                            onClick={() => setLinkType('project')}
                                        >
                                            <FolderKanban className="h-3 w-3" />
                                            Project
                                        </button>
                                        <button
                                            className={cn(
                                                "flex-1 text-xs py-2 px-3 rounded-md font-medium transition-all flex items-center justify-center gap-1.5",
                                                linkType === 'hackathon'
                                                    ? 'bg-white shadow text-slate-900'
                                                    : 'text-slate-500 hover:text-slate-700'
                                            )}
                                            onClick={() => setLinkType('hackathon')}
                                        >
                                            <Zap className="h-3 w-3" />
                                            Hackathon
                                        </button>
                                    </div>

                                    {/* Select Dropdown */}
                                    <select
                                        className="w-full p-2.5 rounded-lg border border-slate-200 text-sm text-slate-700 bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                        value={selectedTargetId}
                                        onChange={(e) => setSelectedTargetId(e.target.value)}
                                    >
                                        <option value="">Select {linkType}...</option>
                                        {availableTargets?.map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>

                                    {/* Link Button */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() => setIsLinkOpen(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="flex-1"
                                            onClick={handleLink}
                                            disabled={!selectedTargetId}
                                        >
                                            <Link2 className="h-3 w-3 mr-1" />
                                            Link
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
