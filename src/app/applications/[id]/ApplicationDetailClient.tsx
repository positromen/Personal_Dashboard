'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
    Building2,
    ArrowLeft,
    ExternalLink,
    Link2,
    Clock,
    Send,
    Briefcase,
    GraduationCap,
    Calendar,
    StickyNote,
    Trash2,
    Edit
} from 'lucide-react';
import {
    updateApplicationStatus,
    addApplicationUpdate,
    deleteApplication,
    addInterviewEvent,
    updateApplication
} from '@/server/container/applicationActions';
import { APPLICATION_STATUSES, APPLICATION_TYPES, type ApplicationStatus, type ApplicationType } from '@/lib/applicationTypes';

interface ApplicationDetailClientProps {
    application: {
        id: string;
        companyName: string;
        role: string;
        type: string;
        companyLink: string | null;
        applicationLink: string | null;
        appliedDate: Date | null;
        status: string;
        createdAt: Date;
        lastUpdated: Date;
        updates: {
            id: string;
            updateType: string;
            content: string;
            timestamp: Date;
        }[];
        noteLinks: {
            id: string;
            note: {
                id: string;
                title: string | null;
                content: string;
            };
        }[];
        calendarEvents: {
            id: string;
            title: string;
            date: Date;
            eventKind: string | null;
        }[];
    };
}

// Status styling - calm, non-judgmental
const statusStyles: Record<string, { variant: 'neutral' | 'success' | 'warning' | 'error' | 'info'; label: string }> = {
    discovered: { variant: 'neutral', label: 'Discovered' },
    applied: { variant: 'info', label: 'Applied' },
    under_review: { variant: 'warning', label: 'Under Review' },
    interview_scheduled: { variant: 'info', label: 'Interview Scheduled' },
    selected: { variant: 'success', label: 'Selected' },
    rejected: { variant: 'neutral', label: 'Rejected' },
    withdrawn: { variant: 'neutral', label: 'Withdrawn' }
};

export default function ApplicationDetailClient({ application }: ApplicationDetailClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [newNote, setNewNote] = useState('');
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [interviewDate, setInterviewDate] = useState('');
    const [interviewTime, setInterviewTime] = useState('');
    const [interviewNote, setInterviewNote] = useState('');

    // Edit form state
    const [editForm, setEditForm] = useState({
        companyName: application.companyName,
        role: application.role,
        type: application.type as ApplicationType,
        companyLink: application.companyLink || '',
        applicationLink: application.applicationLink || ''
    });

    const handleStatusChange = (newStatus: ApplicationStatus) => {
        // Special handling for interview_scheduled
        if (newStatus === 'interview_scheduled') {
            setShowStatusModal(false);
            setShowInterviewModal(true);
            return;
        }

        startTransition(async () => {
            await updateApplicationStatus(application.id, newStatus);
            setShowStatusModal(false);
        });
    };

    const handleScheduleInterview = () => {
        if (!interviewDate || !interviewTime) return;

        const dateTime = new Date(`${interviewDate}T${interviewTime}`);

        startTransition(async () => {
            await updateApplicationStatus(application.id, 'interview_scheduled');
            await addInterviewEvent(application.id, dateTime, interviewNote || undefined);
            setShowInterviewModal(false);
            setInterviewDate('');
            setInterviewTime('');
            setInterviewNote('');
        });
    };

    const handleEditSubmit = () => {
        if (!editForm.companyName.trim() || !editForm.role.trim()) return;

        startTransition(async () => {
            await updateApplication(application.id, {
                companyName: editForm.companyName,
                role: editForm.role,
                type: editForm.type,
                companyLink: editForm.companyLink || undefined,
                applicationLink: editForm.applicationLink || undefined
            });
            setShowEditModal(false);
        });
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;

        startTransition(async () => {
            await addApplicationUpdate(application.id, newNote.trim());
            setNewNote('');
        });
    };

    const handleDelete = () => {
        if (!confirm('Are you sure you want to delete this application?')) return;

        startTransition(async () => {
            await deleteApplication(application.id);
            router.push('/applications');
        });
    };

    const formatDate = (date: Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatDateTime = (date: Date) => {
        return new Date(date).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    <Link href="/applications">
                        <Button variant="ghost" size="sm">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>

                    <div className="p-3 rounded-xl bg-slate-100">
                        <Building2 className="h-8 w-8 text-slate-600" />
                    </div>

                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold text-slate-800">{application.companyName}</h1>
                            {application.type === 'INTERNSHIP' ? (
                                <Briefcase className="h-5 w-5 text-blue-500" />
                            ) : (
                                <GraduationCap className="h-5 w-5 text-purple-500" />
                            )}
                        </div>
                        <p className="text-slate-500">{application.role}</p>
                        <div className="flex items-center gap-3 mt-2">
                            <StatusBadge variant={statusStyles[application.status]?.variant || 'default'}>
                                {statusStyles[application.status]?.label || application.status}
                            </StatusBadge>
                            <span className="text-sm text-slate-400">
                                {application.appliedDate ? `Applied ${formatDate(application.appliedDate)}` : 'Not applied yet'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setShowStatusModal(true)}>
                        Change Status
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDelete} title="Delete application">
                        <Trash2 className="h-4 w-4 text-slate-400" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Important Links */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Link2 className="h-4 w-4 text-slate-500" />
                                <CardTitle className="text-sm">Important Links</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {application.companyLink && (
                                    <a
                                        href={application.companyLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all"
                                    >
                                        <ExternalLink className="h-4 w-4 text-indigo-500" />
                                        <span className="text-sm text-slate-700">Company Careers Page</span>
                                    </a>
                                )}
                                {application.applicationLink && (
                                    <a
                                        href={application.applicationLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all"
                                    >
                                        <Send className="h-4 w-4 text-blue-500" />
                                        <span className="text-sm text-slate-700">Application Portal</span>
                                    </a>
                                )}
                                {!application.companyLink && !application.applicationLink && (
                                    <p className="text-sm text-slate-400">No links added yet</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Updates Timeline */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-slate-500" />
                                <CardTitle className="text-sm">Updates Timeline</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Add Note Input */}
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    placeholder="Add an update..."
                                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    onKeyDown={e => e.key === 'Enter' && handleAddNote()}
                                />
                                <Button size="sm" onClick={handleAddNote} disabled={isPending || !newNote.trim()}>
                                    Add
                                </Button>
                            </div>

                            {/* Timeline */}
                            <div className="space-y-3">
                                {application.updates.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-4">No updates yet</p>
                                ) : (
                                    application.updates.map((update, idx) => (
                                        <div key={update.id} className="relative pl-6">
                                            {/* Timeline line */}
                                            {idx !== application.updates.length - 1 && (
                                                <div className="absolute left-[7px] top-4 bottom-0 w-px bg-slate-200" />
                                            )}

                                            {/* Timeline dot */}
                                            <div className={`absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 ${update.updateType === 'STATUS_CHANGE'
                                                ? 'border-indigo-400 bg-indigo-100'
                                                : 'border-slate-300 bg-white'
                                                }`} />

                                            <div className="pb-4">
                                                <p className="text-sm text-slate-700">{update.content}</p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {formatDateTime(update.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                    {/* Calendar Events */}
                    {application.calendarEvents.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-green-500" />
                                    <CardTitle className="text-sm">Upcoming Events</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {application.calendarEvents.map(event => (
                                        <div key={event.id} className="p-2 rounded-lg bg-green-50 border border-green-100">
                                            <p className="text-sm font-medium text-slate-700">{event.title}</p>
                                            <p className="text-xs text-slate-500">{formatDate(event.date)}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Linked Notes */}
                    {application.noteLinks.length > 0 && (
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <StickyNote className="h-4 w-4 text-amber-500" />
                                    <CardTitle className="text-sm">Linked Notes</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {application.noteLinks.map(link => (
                                        <Link key={link.id} href={`/notes/${link.note.id}`}>
                                            <div className="p-2 rounded-lg border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all">
                                                <p className="text-sm font-medium text-slate-700 truncate">
                                                    {link.note.title || 'Untitled Note'}
                                                </p>
                                                <p className="text-xs text-slate-400 truncate">
                                                    {link.note.content.substring(0, 50)}...
                                                </p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Meta Info */}
                    <Card>
                        <CardContent className="pt-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Type</span>
                                    <span className="text-slate-700">{application.type}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Created</span>
                                    <span className="text-slate-700">{formatDate(application.createdAt)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Last Updated</span>
                                    <span className="text-slate-700">{formatDate(application.lastUpdated)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Status Change Modal */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
                        <div className="p-4 border-b">
                            <h2 className="text-lg font-semibold text-slate-800">Change Status</h2>
                        </div>
                        <div className="p-4 space-y-2">
                            {APPLICATION_STATUSES.map(status => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusChange(status)}
                                    disabled={isPending}
                                    className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${application.status === status
                                        ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                                        : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                >
                                    {status.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                    {status === 'interview_scheduled' && (
                                        <span className="text-xs text-slate-400 ml-2">(+ add to calendar)</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="p-4 border-t">
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={() => setShowStatusModal(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Interview Scheduling Modal */}
            {showInterviewModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
                        <div className="p-4 border-b">
                            <h2 className="text-lg font-semibold text-slate-800">Schedule Interview</h2>
                            <p className="text-sm text-slate-500 mt-1">This will be added to your calendar</p>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Interview Date *
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={interviewDate}
                                    onChange={e => setInterviewDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Interview Time *
                                </label>
                                <input
                                    type="time"
                                    required
                                    value={interviewTime}
                                    onChange={e => setInterviewTime(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Notes (optional)
                                </label>
                                <input
                                    type="text"
                                    value={interviewNote}
                                    onChange={e => setInterviewNote(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Round 1, Technical, HR, etc."
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t flex gap-3">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => {
                                    setShowInterviewModal(false);
                                    setInterviewDate('');
                                    setInterviewTime('');
                                    setInterviewNote('');
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleScheduleInterview}
                                disabled={isPending || !interviewDate || !interviewTime}
                            >
                                {isPending ? 'Scheduling...' : 'Schedule'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Application Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
                        <div className="p-4 border-b">
                            <h2 className="text-lg font-semibold text-slate-800">Edit Application</h2>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Company Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.companyName}
                                    onChange={e => setEditForm(prev => ({ ...prev, companyName: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Google, Microsoft, etc."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Role *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.role}
                                    onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Software Engineer Intern"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Type
                                </label>
                                <select
                                    value={editForm.type}
                                    onChange={e => setEditForm(prev => ({ ...prev, type: e.target.value as ApplicationType }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    title="Application type"
                                >
                                    {APPLICATION_TYPES.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Company Careers Link
                                </label>
                                <input
                                    type="url"
                                    value={editForm.companyLink}
                                    onChange={e => setEditForm(prev => ({ ...prev, companyLink: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="https://careers.company.com/..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Application Portal Link
                                </label>
                                <input
                                    type="url"
                                    value={editForm.applicationLink}
                                    onChange={e => setEditForm(prev => ({ ...prev, applicationLink: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="https://apply.company.com/..."
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t flex gap-3">
                            <Button
                                variant="secondary"
                                className="flex-1"
                                onClick={() => setShowEditModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={handleEditSubmit}
                                disabled={isPending || !editForm.companyName.trim() || !editForm.role.trim()}
                            >
                                {isPending ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
