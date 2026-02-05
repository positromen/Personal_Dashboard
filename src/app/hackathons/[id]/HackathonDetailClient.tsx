'use client';

// NEXUS Hackathon Detail Workspace
// Uses Server Actions for database operations

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TaskCard } from '@/components/TaskCard';
import LinkedNotesSection from '@/app/notes/LinkedNotesSection';
import { Hackathon, HackathonMode, HackathonStatus, RoundStatus, Task } from '@/lib/types';
import { cn, formatDate, getToday } from '@/lib/utils';
import {
    ChevronLeft,
    Pencil,
    Save,
    X,
    Plus,
    ExternalLink,
    Trash2,
    Calendar as CalendarIcon,
    Users,
    Globe,
    MapPin,
    Laptop,
    Zap,
    Link2,
    TrendingUp,
    Target,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle,
    Send
} from 'lucide-react';
import {
    updateHackathon,
    addLink,
    addNote,
    linkProjectToHackathon,
    unlinkProjectFromHackathon,
    createProject,
    updateHackathonStatus,
    addHackathonRound,
    updateHackathonRound,
    submitHackathonRound,
    updateRoundResult,
    deleteHackathonRound
} from '@/server/container/actions';
import { createTask } from '@/server/execution/actions';

interface LinkedNoteItem {
    id: string;
    noteId: string;
    note: { id: string; title: string | null; content: string; updatedAt: Date };
}

interface NoteSummary {
    id: string;
    title: string | null;
    content: string;
}

interface HackathonDetailProps {
    hackathon: Hackathon;
    projects: Array<{ id: string; name: string; originHackathonId: string | null }>;
    linkedNotes?: LinkedNoteItem[];
    allNotes?: NoteSummary[];
}

export function HackathonDetailClient({ hackathon, projects, linkedNotes = [], allNotes = [] }: HackathonDetailProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    // =============================================
    // STATE
    // =============================================
    const [formData, setFormData] = useState<Hackathon>(hackathon);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Status editing state
    const [showStatusModal, setShowStatusModal] = useState(false);

    // Rounds management state
    const [showAddRoundModal, setShowAddRoundModal] = useState(false);
    const [showRoundActionModal, setShowRoundActionModal] = useState<string | null>(null);
    const [newRound, setNewRound] = useState({ name: '', deadline: '', description: '', submissionLink: '' });

    // Staging for NEW items
    const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
    const [pendingLinks, setPendingLinks] = useState<{ title: string; url: string; description: string }[]>([]);
    const [pendingNotes, setPendingNotes] = useState<string[]>([]);

    // Form Toggle States
    const [addLinkOpen, setAddLinkOpen] = useState(false);
    // Note: addNoteOpen is managed by LinkedNotesSection component
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const [addProjectOpen, setAddProjectOpen] = useState(false);

    // Temp Form Data
    const [tempLink, setTempLink] = useState({ title: '', url: '', description: '' });
    const [tempTask, setTempTask] = useState<{ title: string; priority: 'low' | 'medium' | 'high'; dueDate: string }>({ title: '', priority: 'medium', dueDate: '' });
    const [selectedProjectId, setSelectedProjectId] = useState('');

    // Sync prop changes (if revalidated)
    useEffect(() => {
        if (!isEditing) {
            setFormData(hackathon);
        }
    }, [hackathon, isEditing]);

    // =============================================
    // ACTIONS
    // =============================================
    const handleEdit = () => {
        setIsEditing(true);
        setPendingTasks([]);
        setPendingLinks([]);
        setPendingNotes([]);
    };

    const handleCancel = () => {
        if (confirm("Discard all unsaved changes?")) {
            setFormData(hackathon);
            setIsEditing(false);
            setPendingTasks([]);
            setPendingLinks([]);
            setPendingNotes([]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Update Hackathon Fields
            await updateHackathon({
                id: formData.id,
                name: formData.name,
                organizer: formData.organizer,
                mode: formData.mode,
                theme: formData.theme,
                teamSize: formData.teamSize,
                registrationDeadline: formData.registrationDeadline,
                submissionDeadline: formData.submissionDeadline,
                eventStartDate: formData.eventStartDate,
                eventEndDate: formData.eventEndDate,
                projectTitle: formData.projectTitle,
                projectDescription: formData.projectDescription,
                registrationLink: formData.registrationLink,
                submissionPortal: formData.submissionPortal,
                discordSlack: formData.discordSlack,
            });

            // 2. Commit Pending Tasks
            for (const t of pendingTasks) {
                await createTask({
                    title: t.title,
                    priority: t.priority,
                    dueDate: t.dueDate,
                    hackathonId: formData.id,
                    description: t.description || undefined,
                    state: 'pending'
                });
            }

            // 3. Commit Pending Links
            for (const l of pendingLinks) {
                await addLink(formData.id, l.title, l.url, l.description);
            }

            // 4. Commit Pending Notes
            for (const n of pendingNotes) {
                await addNote(formData.id, n);
            }

            setIsEditing(false);
            setPendingTasks([]);
            setPendingLinks([]);
            setPendingNotes([]);
            router.refresh();
        } catch (e) {
            console.error("Save Failed:", e);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const mutate = (updates: Partial<Hackathon>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    // STATUS HANDLING
    const handleStatusChange = (newStatus: HackathonStatus) => {
        startTransition(async () => {
            await updateHackathonStatus(hackathon.id, newStatus);
            setShowStatusModal(false);
        });
    };

    // ROUNDS HANDLING
    const handleAddRound = () => {
        if (!newRound.name || !newRound.deadline) return;
        startTransition(async () => {
            await addHackathonRound(hackathon.id, {
                name: newRound.name,
                deadline: newRound.deadline,
                description: newRound.description,
                submissionLink: newRound.submissionLink
            });
            setNewRound({ name: '', deadline: '', description: '', submissionLink: '' });
            setShowAddRoundModal(false);
        });
    };

    const handleSubmitRound = (roundId: string) => {
        startTransition(async () => {
            await submitHackathonRound(hackathon.id, roundId);
            setShowRoundActionModal(null);
        });
    };

    const handleRoundResult = (roundId: string, result: 'cleared' | 'not_cleared', feedback?: string) => {
        startTransition(async () => {
            await updateRoundResult(hackathon.id, roundId, result, feedback);
            setShowRoundActionModal(null);
        });
    };

    const handleDeleteRound = (roundId: string) => {
        if (!confirm('Delete this round?')) return;
        startTransition(async () => {
            await deleteHackathonRound(hackathon.id, roundId);
        });
    };

    const getRoundStatusIcon = (status: RoundStatus) => {
        switch (status) {
            case 'upcoming': return <Clock className="h-4 w-4 text-slate-500" />;
            case 'in_progress': return <AlertCircle className="h-4 w-4 text-amber-500" />;
            case 'submitted': return <Send className="h-4 w-4 text-blue-500" />;
            case 'cleared': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'not_cleared': return <XCircle className="h-4 w-4 text-red-500" />;
            case 'skipped': return <X className="h-4 w-4 text-slate-400" />;
            default: return <Clock className="h-4 w-4 text-slate-500" />;
        }
    };

    const getRoundStatusColor = (status: RoundStatus) => {
        switch (status) {
            case 'upcoming': return 'bg-slate-100 text-slate-600';
            case 'in_progress': return 'bg-amber-100 text-amber-700';
            case 'submitted': return 'bg-blue-100 text-blue-700';
            case 'cleared': return 'bg-green-100 text-green-700';
            case 'not_cleared': return 'bg-red-100 text-red-700';
            case 'skipped': return 'bg-slate-100 text-slate-500';
            default: return 'bg-slate-100 text-slate-600';
        }
    };

    const getDaysToDeadline = (deadline: string) => {
        if (!deadline) return null;
        const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 3600 * 24));
        return days;
    };

    // LINKS
    const removeLink = (linkId: string) => {
        mutate({ links: (formData.links || []).filter(l => l.id !== linkId) });
    };

    // Commit new link
    const commitLink = () => {
        if (!tempLink.title.trim() || !tempLink.url.trim()) return;
        const newLink = {
            id: 'temp-link-' + Date.now(),
            title: tempLink.title,
            url: tempLink.url,
            description: tempLink.description
        };
        setPendingLinks(prev => [...prev, newLink]);
        setTempLink({ title: '', url: '', description: '' });
        setAddLinkOpen(false);
    };

    // TASKS
    const commitTask = () => {
        if (!tempTask.title.trim()) return;
        const newTask: Task = {
            id: 'temp-' + Date.now(),
            title: tempTask.title,
            description: formData.name,
            status: 'pending',
            priority: tempTask.priority,
            dueDate: tempTask.dueDate || formData.submissionDeadline,
            contextType: 'hackathon',
            contextId: formData.id,
            createdAt: getToday()
        };
        setPendingTasks(prev => [...prev, newTask]);
        setTempTask({ title: '', priority: 'medium', dueDate: '' });
        setAddTaskOpen(false);
    };

    // LINK PROJECT
    const handleLinkProject = async () => {
        if (!selectedProjectId) return;
        try {
            await linkProjectToHackathon(formData.id, selectedProjectId);
            setAddProjectOpen(false);
            setSelectedProjectId('');
            router.refresh();
        } catch (e) {
            console.error('Failed to link project:', e);
            alert('Failed to link project');
        }
    };

    const handleUnlinkProject = async () => {
        if (!confirm('Unlink this project from the hackathon?')) return;
        try {
            await unlinkProjectFromHackathon(formData.id);
            router.refresh();
        } catch (e) {
            console.error('Failed to unlink project:', e);
            alert('Failed to unlink project');
        }
    };

    const handleCreateAndLinkProject = async () => {
        if (!confirm("Create a new project linked to this hackathon?")) return;
        try {
            const newProject = await createProject({
                name: formData.projectTitle || formData.name,
                description: formData.projectDescription || `Project for ${formData.name}`,
                domain: 'hackathon',
                deadline: formData.submissionDeadline
            });

            await linkProjectToHackathon(formData.id, newProject.id);
            router.refresh();
        } catch (e) {
            console.error("Failed to create/link project:", e);
            alert("Failed to create project");
        }
    };

    // Available projects (not already linked to another hackathon)
    const availableProjects = projects.filter(p => !p.originHackathonId || p.originHackathonId === formData.id);

    // Mode Icon Helper
    const ModeIcon = formData.mode === 'online' ? Laptop : formData.mode === 'offline' ? MapPin : Globe;

    return (
        <div className={cn("max-w-4xl mx-auto space-y-12 pb-24 transition-opacity duration-200", isEditing ? "pt-8" : "")}>
            {/* ALERT BAR FOR EDIT MODE */}
            {isEditing && (
                <div className="fixed top-16 left-64 right-0 bg-amber-50 border-b border-amber-200 p-2 text-center text-sm font-medium text-amber-800 z-40 flex items-center justify-center gap-2">
                    <Pencil className="h-4 w-4" />
                    You are in Edit Mode. Changes are not saved until you click Save.
                </div>
            )}

            {/* TOOLBAR */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => router.push('/hackathons')}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back to List
                </Button>

                {!isEditing ? (
                    <Button onClick={handleEdit} className="bg-slate-800 hover:bg-slate-700">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Hackathon
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={handleCancel} className="text-red-600 hover:bg-red-50 hover:text-red-700">
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                            <Save className="h-4 w-4 mr-2" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                )}
            </div>

            {/* DETAILS CARD */}
            <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-6">
                {isEditing ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Event Name</label>
                                <input
                                    className="w-full text-xl font-bold border-b border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                    value={formData.name}
                                    onChange={e => mutate({ name: e.target.value })}
                                />
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Organizer</label>
                                <input
                                    className="w-full border-b border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                    value={formData.organizer || ''}
                                    onChange={e => mutate({ organizer: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Mode</label>
                                <select
                                    className="w-full border-b border-slate-300 focus:border-blue-500 focus:outline-none py-1 bg-transparent"
                                    value={formData.mode}
                                    onChange={e => mutate({ mode: e.target.value as HackathonMode })}
                                    title="Hackathon mode"
                                >
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                    <option value="hybrid">Hybrid</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Team Size</label>
                                <input
                                    type="number"
                                    className="w-full border-b border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                    value={formData.teamSize}
                                    onChange={e => mutate({ teamSize: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Theme</label>
                                <input
                                    className="w-full border-b border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                    value={formData.theme || ''}
                                    onChange={e => mutate({ theme: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Event Start</label>
                                <input
                                    type="date"
                                    className="w-full border-b border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                    value={formData.eventStartDate || ''}
                                    onChange={e => mutate({ eventStartDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Event End</label>
                                <input
                                    type="date"
                                    className="w-full border-b border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                    value={formData.eventEndDate || ''}
                                    onChange={e => mutate({ eventEndDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Registration Deadline</label>
                                <input
                                    type="date"
                                    className="w-full border-b border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                    value={formData.registrationDeadline || ''}
                                    onChange={e => mutate({ registrationDeadline: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Submission Deadline</label>
                                <input
                                    type="date"
                                    className="w-full border-b border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                    value={formData.submissionDeadline || ''}
                                    onChange={e => mutate({ submissionDeadline: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                ) : (
                    // READ ONLY
                    <div className="space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">{formData.name}</h1>
                                <p className="text-slate-500 font-medium">by {formData.organizer || 'Unknown Organizer'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={cn(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                    formData.status === 'discovered' ? "bg-slate-100 text-slate-600" :
                                    formData.status === 'applied' ? "bg-blue-100 text-blue-700" :
                                    formData.status === 'under_review' ? "bg-yellow-100 text-yellow-700" :
                                    formData.status === 'shortlisted' ? "bg-purple-100 text-purple-700" :
                                    formData.status === 'team_formation' ? "bg-cyan-100 text-cyan-700" :
                                    formData.status === 'in_progress' ? "bg-amber-100 text-amber-700" :
                                    formData.status === 'submission' ? "bg-indigo-100 text-indigo-700" :
                                    formData.status === 'results_pending' ? "bg-orange-100 text-orange-700" :
                                    formData.status === 'selected' ? "bg-green-100 text-green-700" :
                                    formData.status === 'not_selected' ? "bg-red-100 text-red-700" :
                                    formData.status === 'withdrawn' ? "bg-gray-100 text-gray-700" :
                                    "bg-slate-100 text-slate-600"
                                )}>
                                    {formData.status?.replace('_', ' ') || 'discovered'}
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setShowStatusModal(true)}
                                    className="text-slate-500 hover:text-slate-700 p-1"
                                    title="Update Status"
                                >
                                    <TrendingUp className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-slate-600 pt-2">
                            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                <ModeIcon className="h-4 w-4 text-slate-400" />
                                {(formData.mode || 'online').charAt(0).toUpperCase() + (formData.mode || 'online').slice(1)} Mode
                            </span>
                            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                <Users className="h-4 w-4 text-slate-400" />
                                Max {formData.teamSize} Members
                            </span>
                            <span className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                <CalendarIcon className="h-4 w-4 text-slate-400" />
                                {formData.eventStartDate ? `Starts ${formatDate(formData.eventStartDate)}` : 'No start date'}
                            </span>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 mt-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Theme</h3>
                            <p className="text-slate-800 italic">{formData.theme || "No specific theme"}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* ROUNDS TRACKING */}
            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Target className="h-4 w-4" /> Rounds & Timeline
                    </h3>
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setShowAddRoundModal(true)}
                        className="text-xs"
                    >
                        <Plus className="h-3 w-3 mr-1" /> Add Round
                    </Button>
                </div>

                {(!formData.rounds || formData.rounds.length === 0) ? (
                    <div className="p-6 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center">
                        <Target className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500 text-sm">No rounds added yet</p>
                        <p className="text-slate-400 text-xs mt-1">Add rounds to track your hackathon progress</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {formData.rounds.map((round, index) => {
                            const daysLeft = getDaysToDeadline(round.deadline);
                            const isCurrentRound = index === formData.currentRound;
                            return (
                                <div 
                                    key={round.id}
                                    className={cn(
                                        "p-4 bg-white rounded-lg border transition-all",
                                        isCurrentRound ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200",
                                        round.status === 'cleared' && "bg-green-50/50",
                                        round.status === 'not_cleared' && "bg-red-50/50 opacity-75"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3">
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                                                round.status === 'cleared' ? "bg-green-100 text-green-700" :
                                                round.status === 'not_cleared' ? "bg-red-100 text-red-700" :
                                                round.status === 'submitted' ? "bg-blue-100 text-blue-700" :
                                                isCurrentRound ? "bg-blue-500 text-white" :
                                                "bg-slate-100 text-slate-600"
                                            )}>
                                                {round.roundNumber}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-semibold text-slate-900">{round.name}</h4>
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1",
                                                        getRoundStatusColor(round.status as RoundStatus)
                                                    )}>
                                                        {getRoundStatusIcon(round.status as RoundStatus)}
                                                        {round.status?.replace('_', ' ')}
                                                    </span>
                                                    {isCurrentRound && round.status !== 'cleared' && round.status !== 'not_cleared' && (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500 text-white">
                                                            Current
                                                        </span>
                                                    )}
                                                </div>
                                                {round.description && (
                                                    <p className="text-sm text-slate-500 mt-1">{round.description}</p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <CalendarIcon className="h-3 w-3" />
                                                        Deadline: {formatDate(round.deadline)}
                                                    </span>
                                                    {daysLeft !== null && round.status !== 'cleared' && round.status !== 'not_cleared' && round.status !== 'submitted' && (
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded",
                                                            daysLeft < 0 ? "bg-red-100 text-red-700" :
                                                            daysLeft <= 2 ? "bg-amber-100 text-amber-700" :
                                                            "bg-slate-100 text-slate-600"
                                                        )}>
                                                            {daysLeft < 0 ? `${Math.abs(daysLeft)} days overdue` :
                                                             daysLeft === 0 ? 'Due today' :
                                                             `${daysLeft} days left`}
                                                        </span>
                                                    )}
                                                    {round.submittedAt && (
                                                        <span className="flex items-center gap-1 text-blue-600">
                                                            <Send className="h-3 w-3" />
                                                            Submitted: {formatDate(round.submittedAt)}
                                                        </span>
                                                    )}
                                                    {round.result && (
                                                        <span className={cn(
                                                            "font-medium",
                                                            round.status === 'cleared' ? "text-green-600" : "text-red-600"
                                                        )}>
                                                            Result: {round.result}
                                                        </span>
                                                    )}
                                                </div>
                                                {round.feedback && (
                                                    <p className="text-xs text-slate-500 mt-2 italic bg-slate-50 p-2 rounded">
                                                        Feedback: {round.feedback}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {round.submissionLink && (
                                                <a 
                                                    href={round.submissionLink} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Open Submission Portal"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowRoundActionModal(round.id)}
                                                className="text-slate-400 hover:text-slate-600 p-2"
                                                title="Round Actions"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteRound(round.id)}
                                                className="text-slate-400 hover:text-red-600 p-2"
                                                title="Delete Round"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* LINKED PROJECT */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Zap className="h-4 w-4" /> Linked Project
                    </h3>
                </div>

                {formData.linkedProjectId ? (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-white border border-slate-200 hover:border-blue-300 transition-all">
                        <div
                            onClick={() => router.push(`/projects/${formData.linkedProjectId}`)}
                            className="flex-1 cursor-pointer group"
                        >
                            <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                {formData.projectTitle || 'Linked Project'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                {formData.projectDescription || 'No description'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push(`/projects/${formData.linkedProjectId}`)}
                                className="p-2 text-slate-400 hover:text-blue-500"
                                title="View Project"
                            >
                                <ExternalLink className="h-4 w-4" />
                            </button>
                            <button
                                onClick={handleUnlinkProject}
                                className="p-2 text-slate-400 hover:text-red-500"
                                title="Unlink Project"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-slate-400 italic">No project linked.</div>
                )}

                {!formData.linkedProjectId && (
                    <div className="mt-4 space-y-4">
                        {!addProjectOpen ? (
                            <div className="flex gap-4">
                                <Button variant="secondary" size="sm" onClick={() => setAddProjectOpen(true)} className="flex-1 border border-dashed border-slate-300">
                                    <Link2 className="h-3 w-3 mr-2" /> Link Existing Project
                                </Button>
                                <Button variant="secondary" size="sm" onClick={handleCreateAndLinkProject} className="flex-1 border border-dashed border-slate-300">
                                    <Plus className="h-3 w-3 mr-2" /> Create & Link New Project
                                </Button>
                            </div>
                        ) : (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-3">
                                    <select
                                        className="flex-1 px-3 py-2 rounded border border-slate-300 text-sm"
                                        value={selectedProjectId}
                                        onChange={e => setSelectedProjectId(e.target.value)}
                                        title="Select project to link"
                                    >
                                        <option value="">Select a project...</option>
                                        {availableProjects.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setAddProjectOpen(false)}>Cancel</Button>
                                    <Button size="sm" onClick={handleLinkProject} disabled={!selectedProjectId}>Link Project</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <hr className="border-slate-100" />

            {/* LINKS SECTION */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        Important Links
                    </h3>
                </div>

                <div className="space-y-2">
                    {formData.registrationLink && (
                        <a href={formData.registrationLink} target="_blank" className="flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200 text-sm hover:border-blue-300 text-blue-600">
                            <Link2 className="h-4 w-4" /> Registration Page
                        </a>
                    )}
                    {formData.links && formData.links.map(link => (
                        <div key={link.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 hover:border-slate-300">
                            <a href={link.url} target="_blank" className="flex items-center gap-3 text-sm text-slate-700 hover:text-blue-600 group">
                                <ExternalLink className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                                <span className="font-medium">{link.title}</span>
                                {link.description && <span className="text-slate-400">- {link.description}</span>}
                            </a>
                            {isEditing && (
                                <button onClick={() => removeLink(link.id)} className="text-slate-400 hover:text-red-500 p-2" title="Remove link">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    {(!formData.links?.length && !formData.registrationLink) && (
                        <div className="text-sm text-slate-400 italic">No links added.</div>
                    )}
                </div>

                {isEditing && (
                    <div className="mt-4">
                        {!addLinkOpen ? (
                            <Button variant="secondary" size="sm" onClick={() => setAddLinkOpen(true)} className="w-full border border-dashed border-slate-300">
                                <Plus className="h-3 w-3 mr-2" /> Add Link
                            </Button>
                        ) : (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 animate-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        placeholder="Title"
                                        className="px-3 py-2 rounded border border-slate-300 text-sm"
                                        value={tempLink.title}
                                        onChange={e => setTempLink(p => ({ ...p, title: e.target.value }))}
                                    />
                                    <input
                                        placeholder="URL"
                                        className="px-3 py-2 rounded border border-slate-300 text-sm"
                                        value={tempLink.url}
                                        onChange={e => setTempLink(p => ({ ...p, url: e.target.value }))}
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setAddLinkOpen(false)}>Cancel</Button>
                                    <Button size="sm" onClick={commitLink}>Add</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            <hr className="border-slate-100" />

            {/* NOTES SECTION */}
            {/* LINKED NOTES SECTION */}
            <LinkedNotesSection
                targetType="hackathon"
                targetId={formData.id}
                linkedNotes={linkedNotes}
                allNotes={allNotes}
            />

            <hr className="border-slate-100" />

            {/* TASKS SECTION */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        Linked Tasks
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {((hackathon as Hackathon & { tasks?: Task[] }).tasks || []).concat(pendingTasks).map((task: Task) => (
                        <TaskCard key={task.id} task={task} showContext={false} />
                    ))}
                    {((hackathon as Hackathon & { tasks?: Task[] }).tasks || []).length === 0 && pendingTasks.length === 0 && (
                        <div className="text-sm text-slate-400 italic col-span-2">No tasks linked.</div>
                    )}
                </div>

                {isEditing && (
                    <div className="mt-4">
                        {!addTaskOpen ? (
                            <Button variant="secondary" size="sm" onClick={() => setAddTaskOpen(true)} className="w-full border border-dashed border-slate-300">
                                <Plus className="h-3 w-3 mr-2" /> Add Task
                            </Button>
                        ) : (
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3 animate-in slide-in-from-top-2">
                                <div className="flex items-center gap-3">
                                    <input
                                        placeholder="Task Title"
                                        className="flex-1 px-3 py-2 rounded border border-slate-300 text-sm"
                                        value={tempTask.title}
                                        onChange={e => setTempTask(p => ({ ...p, title: e.target.value }))}
                                    />
                                    <select
                                        className="px-3 py-2 rounded border border-slate-300 text-sm"
                                        value={tempTask.priority}
                                        onChange={e => setTempTask(p => ({ ...p, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                                        title="Task priority"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="ghost" onClick={() => setAddTaskOpen(false)}>Cancel</Button>
                                    <Button size="sm" onClick={commitTask}>Add Task</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* STATUS UPDATE MODAL */}
            {showStatusModal && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Update Hackathon Status</h3>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {(['discovered', 'applied', 'under_review', 'shortlisted', 'team_formation', 'in_progress', 'submission', 'results_pending', 'selected', 'not_selected', 'withdrawn'] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => handleStatusChange(status)}
                                    disabled={isPending}
                                    className={cn(
                                        "w-full text-left px-4 py-3 rounded-lg border transition-all",
                                        formData.status === status
                                            ? "bg-blue-50 border-blue-200 text-blue-900"
                                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700",
                                        isPending && "opacity-50 cursor-not-allowed"
                                    )}
                                >
                                    <div className="font-medium capitalize">
                                        {status.replace('_', ' ')}
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        {status === 'discovered' && 'Found this hackathon'}
                                        {status === 'applied' && 'Application submitted'}
                                        {status === 'under_review' && 'Application being reviewed'}
                                        {status === 'shortlisted' && 'Made it to the next round'}
                                        {status === 'team_formation' && 'Looking for or forming team'}
                                        {status === 'in_progress' && 'Currently participating'}
                                        {status === 'submission' && 'Project submitted, awaiting results'}
                                        {status === 'results_pending' && 'Results being announced'}
                                        {status === 'selected' && 'Won or placed in hackathon'}
                                        {status === 'not_selected' && 'Did not win this time'}
                                        {status === 'withdrawn' && 'Withdrew from hackathon'}
                                    </div>
                                </button>
                            ))}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button 
                                variant="ghost" 
                                onClick={() => setShowStatusModal(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD ROUND MODAL */}
            {showAddRoundModal && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Add New Round</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Round Name *</label>
                                <input
                                    type="text"
                                    value={newRound.name}
                                    onChange={(e) => setNewRound(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g., Round 1, Semi-Finals, Finals"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Deadline *</label>
                                <input
                                    type="date"
                                    value={newRound.deadline}
                                    onChange={(e) => setNewRound(prev => ({ ...prev, deadline: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                <input
                                    type="text"
                                    value={newRound.description}
                                    onChange={(e) => setNewRound(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Brief description of this round"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Submission Link</label>
                                <input
                                    type="url"
                                    value={newRound.submissionLink}
                                    onChange={(e) => setNewRound(prev => ({ ...prev, submissionLink: e.target.value }))}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <Button 
                                variant="ghost" 
                                onClick={() => {
                                    setShowAddRoundModal(false);
                                    setNewRound({ name: '', deadline: '', description: '', submissionLink: '' });
                                }}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handleAddRound}
                                disabled={isPending || !newRound.name || !newRound.deadline}
                            >
                                Add Round
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ROUND ACTION MODAL */}
            {showRoundActionModal && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
                        {(() => {
                            const round = formData.rounds?.find(r => r.id === showRoundActionModal);
                            if (!round) return null;
                            return (
                                <>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                        {round.name} - Actions
                                    </h3>
                                    <div className="space-y-3">
                                        {round.status === 'upcoming' && (
                                            <button
                                                onClick={() => {
                                                    startTransition(async () => {
                                                        await updateHackathonRound(hackathon.id, round.id, { status: 'in_progress' });
                                                        setShowRoundActionModal(null);
                                                    });
                                                }}
                                                disabled={isPending}
                                                className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-amber-50 hover:border-amber-200 transition-all"
                                            >
                                                <div className="flex items-center gap-2 font-medium text-amber-700">
                                                    <AlertCircle className="h-4 w-4" />
                                                    Start Round
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">Mark this round as in progress</p>
                                            </button>
                                        )}
                                        
                                        {(round.status === 'upcoming' || round.status === 'in_progress') && (
                                            <button
                                                onClick={() => handleSubmitRound(round.id)}
                                                disabled={isPending}
                                                className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-blue-50 hover:border-blue-200 transition-all"
                                            >
                                                <div className="flex items-center gap-2 font-medium text-blue-700">
                                                    <Send className="h-4 w-4" />
                                                    Mark as Submitted
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">Mark this round&apos;s submission as complete</p>
                                            </button>
                                        )}
                                        
                                        {round.status === 'submitted' && (
                                            <>
                                                <button
                                                    onClick={() => handleRoundResult(round.id, 'cleared')}
                                                    disabled={isPending}
                                                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-green-50 hover:border-green-200 transition-all"
                                                >
                                                    <div className="flex items-center gap-2 font-medium text-green-700">
                                                        <CheckCircle2 className="h-4 w-4" />
                                                        Cleared / Qualified
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">Passed this round and moving to next</p>
                                                </button>
                                                <button
                                                    onClick={() => handleRoundResult(round.id, 'not_cleared')}
                                                    disabled={isPending}
                                                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-200 hover:bg-red-50 hover:border-red-200 transition-all"
                                                >
                                                    <div className="flex items-center gap-2 font-medium text-red-700">
                                                        <XCircle className="h-4 w-4" />
                                                        Not Cleared
                                                    </div>
                                                    <p className="text-xs text-slate-500 mt-1">Did not qualify for next round</p>
                                                </button>
                                            </>
                                        )}
                                        
                                        {(round.status === 'cleared' || round.status === 'not_cleared') && (
                                            <div className="p-4 bg-slate-50 rounded-lg text-center">
                                                <p className="text-slate-600 text-sm">
                                                    This round is complete with result: <strong>{round.result}</strong>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex justify-end gap-2 mt-6">
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setShowRoundActionModal(null)}
                                            disabled={isPending}
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
