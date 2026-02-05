'use client';

// NEXUS Hackathon Detail Workspace
// Uses Server Actions for database operations

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TaskCard } from '@/components/TaskCard';
import LinkedNotesSection from '@/app/notes/LinkedNotesSection';
import { Hackathon, HackathonMode, Task } from '@/lib/types';
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
    Link2
} from 'lucide-react';
import {
    updateHackathon,
    addLink,
    addNote,
    linkProjectToHackathon,
    unlinkProjectFromHackathon,
    createProject
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

    // =============================================
    // STATE
    // =============================================
    const [formData, setFormData] = useState<Hackathon>(hackathon);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
                            <div className={cn(
                                "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                                formData.status === 'registered' ? "bg-blue-100 text-blue-700" :
                                    formData.status === 'in_progress' ? "bg-amber-100 text-amber-700" :
                                        formData.status === 'submitted' ? "bg-green-100 text-green-700" :
                                            "bg-slate-100 text-slate-600"
                            )}>
                                {formData.status?.replace('_', ' ') || 'upcoming'}
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
        </div>
    );
}
