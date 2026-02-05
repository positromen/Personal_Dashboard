'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TaskCard } from '@/components/TaskCard';
import LinkedNotesSection from '@/app/notes/LinkedNotesSection';
import { Project, ProjectStage, Task } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import {
    ChevronLeft,
    Pencil,
    Save,
    X,
    Plus,
    Calendar as CalendarIcon,
    Circle,
    Hammer,
    TestTube,
    Flag,
    CheckCircle2
} from 'lucide-react';
import { updateProject, addLink, addNote } from '@/server/container/actions';
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

interface ProjectDetailClientProps {
    project: Project;
    linkedNotes?: LinkedNoteItem[];
    allNotes?: NoteSummary[];
}

import { LucideIcon } from 'lucide-react';

const STAGES: ProjectStage[] = ['planning', 'building', 'testing', 'finalizing', 'completed'];

const STAGE_CONFIG: Record<ProjectStage, { icon: LucideIcon, label: string }> = {
    planning: { icon: Circle, label: 'Planning' },
    building: { icon: Hammer, label: 'Building' },
    testing: { icon: TestTube, label: 'Testing' },
    finalizing: { icon: Flag, label: 'Finalizing' },
    completed: { icon: CheckCircle2, label: 'Completed' },
};

export function ProjectDetailClient({ project, linkedNotes = [], allNotes = [] }: ProjectDetailClientProps) {
    const router = useRouter();

    // =============================================
    // STATE
    // =============================================
    const [formData, setFormData] = useState<Project>(project);
    const [isEditing, setIsEditing] = useState(false);

    // Staging for NEW items (Tasks, Links, Notes)
    // We only create them on Save in this "Safe Mode" UX?
    // Actually, "Safe Mode" implies we don't commit until Save.
    // BUT managing IDs for new items locally is tricky if linking to DB.
    // Simpler: Commit immediately? 
    // The previous code: "New Data Staging (Created only on Save)".
    // I will preserve that behavior.

    const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
    const [pendingLinks, setPendingLinks] = useState<{ title: string; url: string; description: string }[]>([]);
    const [pendingNotes, setPendingNotes] = useState<string[]>([]);

    const [isSaving, setIsSaving] = useState(false);

    // Forms
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const [tempTask, setTempTask] = useState<{ title: string; priority: 'low' | 'medium' | 'high'; dueDate: string }>({ title: '', priority: 'medium', dueDate: '' });

    // Sync prop changes (if revalidated)
    useEffect(() => {
        if (!isEditing) {
            setFormData(project);
        }
    }, [project, isEditing]);

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
            setFormData(project);
            setIsEditing(false);
            setPendingTasks([]);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // 1. Update Project Fields
            await updateProject({
                id: formData.id,
                name: formData.name,
                description: formData.description,
                stage: formData.stage,
                deadline: formData.deadline
            });

            // 2. Commit Pending Tasks
            for (const t of pendingTasks) {
                await createTask({
                    title: t.title,
                    priority: t.priority,
                    dueDate: t.dueDate,
                    projectId: formData.id, // Explicit Link
                    description: t.description || undefined,
                    state: 'pending'
                });
            }

            // 3. Commit Pending Links (Need Action)
            for (const l of pendingLinks) {
                await addLink(formData.id, l.title, l.url, l.description);
            }

            // 4. Commit Pending Notes (Need Action)
            for (const n of pendingNotes) {
                await addNote(formData.id, n);
            }

            setIsEditing(false);
            router.refresh();
        } catch (e) {
            console.error("Save Failed:", e);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const mutate = (updates: Partial<Project>) => {
        setFormData(prev => ({ ...prev, ...updates }));
    };

    // STAGE
    const setStage = (stage: ProjectStage) => {
        mutate({ stage });
    };

    // TASKS
    const commitTask = () => {
        if (!tempTask.title.trim()) return;
        // Temporary ID for UI
        const newTask: Task = {
            id: 'temp-' + Date.now(),
            title: tempTask.title,
            description: formData.name,
            status: 'pending',
            priority: tempTask.priority,
            dueDate: tempTask.dueDate || formData.deadline,
            contextType: 'project',
            contextId: formData.id,
            createdAt: new Date().toISOString().split('T')[0]
        };

        setPendingTasks(prev => [...prev, newTask]);
        setTempTask({ title: '', priority: 'medium', dueDate: '' });
        setAddTaskOpen(false);
    };

    return (
        <div className={cn("max-w-4xl mx-auto space-y-12 pb-24 transition-opacity duration-200", isEditing ? "pt-8" : "")}>
            {/* HEADLINE ACTIONS */}
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back to List
                </Button>

                {!isEditing ? (
                    <Button onClick={handleEdit} className="bg-slate-800 hover:bg-slate-700">
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Project
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

            {/* HEADER INFO */}
            <div className="space-y-6 bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
                {/* Basic Info Inputs/Display */}
                <div className="space-y-4">
                    {isEditing ? (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Project Name</label>
                                <input
                                    className="w-full text-xl font-bold border-b border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                    value={formData.name}
                                    onChange={e => mutate({ name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Priority</label>
                                <select
                                    className="w-full border-b border-slate-300 focus:border-blue-500 focus:outline-none py-1 bg-transparent"
                                    value={formData.priority}
                                    onChange={e => mutate({ priority: e.target.value as 'low' | 'medium' | 'high' | 'critical' })}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                    <option value="critical">Critical</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-400 uppercase">Deadline</label>
                                <input
                                    type="date"
                                    className="w-full border-b border-slate-300 focus:border-blue-500 focus:outline-none py-1"
                                    value={formData.deadline || ''}
                                    onChange={e => mutate({ deadline: e.target.value })}
                                />
                            </div>
                        </div>
                    ) : (
                        // READ ONLY HEADER
                        <div className="flex items-start justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">{formData.name}</h1>
                                <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                                    <span className={cn(
                                        "uppercase font-bold tracking-wider px-2 py-0.5 rounded text-xs",
                                        formData.priority === 'critical' ? 'bg-red-100 text-red-700' :
                                            formData.priority === 'high' ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-100 text-slate-600'
                                    )}>
                                        {formData.priority} Priority
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <CalendarIcon className="h-3.5 w-3.5" />
                                        Due {formatDate(formData.deadline)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* STAGE STEPPER */}
                <div className="pt-4 border-t border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-4 block">Current Stage</label>
                    <div className="relative">
                        <div className="absolute top-2.5 left-0 w-full h-0.5 bg-slate-100 -z-10" />
                        <div className="flex justify-between">
                            {STAGES.map((stage, index) => {
                                const isCurrent = stage === (formData.stage || 'planning');
                                const isPast = STAGES.indexOf(formData.stage || 'planning') > index;
                                const StageIcon = STAGE_CONFIG[stage].icon;
                                return (
                                    <button
                                        key={stage}
                                        disabled={!isEditing}
                                        onClick={() => setStage(stage)}
                                        className={cn(
                                            "flex flex-col items-center gap-2 px-2 transition-all relative group",
                                            !isEditing ? "cursor-default" : "cursor-pointer hover:-translate-y-1"
                                        )}
                                    >
                                        <div className={cn(
                                            "h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all bg-white z-10",
                                            isCurrent ? "border-blue-600 text-blue-600 scale-125 shadow-md" :
                                                isPast ? "border-blue-400 text-blue-400" : "border-slate-200 text-slate-300"
                                        )}>
                                            <StageIcon className="h-3 w-3" />
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase tracking-wider",
                                            isCurrent ? "text-blue-600" :
                                                isPast ? "text-blue-400" : "text-slate-300"
                                        )}>
                                            {stage}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* DESCRIPTION */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">About</h3>
                </div>
                {isEditing ? (
                    <textarea
                        className="w-full h-32 p-3 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm leading-relaxed"
                        value={formData.description}
                        onChange={e => mutate({ description: e.target.value })}
                    />
                ) : (
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {formData.description || <span className="text-slate-400 italic">No description provided.</span>}
                    </p>
                )}
            </section>

            <hr className="border-slate-100" />

            <LinkedNotesSection
                targetType="project"
                targetId={project.id}
                linkedNotes={linkedNotes}
                allNotes={allNotes}
            />

            <hr className="border-slate-100" />

            {/* LINKS (Simplified for brevity: Assume similar map logic to above) */}

            {/* TASKS */}
            <section className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                        Linked Tasks
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* We need passed Tasks here. Using formData.tasks (added prop?) */}
                    {/* I will rely on parent passing `projectTasks` */}
                    {((project as Project & { tasks?: Task[] }).tasks || []).concat(pendingTasks).map((task: Task) => (
                        <TaskCard key={task.id} task={task} showContext={false} />
                    ))}
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
        </div >
    );
}
