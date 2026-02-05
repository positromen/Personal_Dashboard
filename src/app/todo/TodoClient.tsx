'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconBox } from '@/components/ui/IconBox';
import { TaskCard } from '@/components/TaskCard';
import {
    CheckSquare,
    Plus,
    Calendar,
    Clock,
    CheckCircle2,
    Trash2
} from 'lucide-react';
import { cn, getDaysUntil, getToday } from '@/lib/utils';
import { Task } from '@/lib/types';
import { createTask, updateTask } from '@/server/execution/actions'; // Server Actions
import { deleteTask } from '@/server/container/actions';

// Simplified types for context selection
interface ProjectOption {
    id: string;
    name: string;
}

interface HackathonOption {
    id: string;
    name: string;
}

// Props from Server
interface TodoClientProps {
    initialTasks: Task[];
    projects: ProjectOption[];
    hackathons: HackathonOption[];
}

export function TodoClient({ initialTasks, projects, hackathons }: TodoClientProps) {
    const router = useRouter();
    const tasks = initialTasks; // Use prop directly (refreshed via router)

    const [showAddForm, setShowAddForm] = useState(false);
    const [filter, setFilter] = useState<'all' | 'today' | 'pending' | 'done'>('all');

    // New task form state
    const [newTitle, setNewTitle] = useState('');
    const [newPriority, setNewPriority] = useState<Task['priority']>('medium');
    const [newDueDate, setNewDueDate] = useState('');

    // Context Selection
    const [contextType, setContextType] = useState<'none' | 'project' | 'hackathon'>('none');
    const [contextId, setContextId] = useState('');

    const [isPending, setIsPending] = useState(false); // For loading state

    // Filter tasks
    const filteredTasks = tasks.filter(task => {
        if (filter === 'today') return task.dueDate === getToday() && task.status !== 'done';
        if (filter === 'pending') return task.status !== 'done';
        if (filter === 'done') return task.status === 'done';
        return true;
    });

    // Sort tasks
    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (b.status === 'done' && a.status !== 'done') return -1;
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
    });

    const handleAddTask = async () => {
        if (!newTitle.trim()) return;
        setIsPending(true);

        try {
            await createTask({
                title: newTitle,
                priority: newPriority,
                dueDate: newDueDate || undefined,
                projectId: contextType === 'project' ? contextId : undefined,
                hackathonId: contextType === 'hackathon' ? contextId : undefined,
                description: undefined
            });

            setNewTitle('');
            setNewPriority('medium');
            setNewDueDate('');
            setContextType('none');
            setContextId('');
            setShowAddForm(false);

            // Refresh Server Component to fetch new data
            router.refresh();
        } catch (error) {
            console.error("Failed to add task:", error);
            alert("Failed to add task. See console.");
        } finally {
            setIsPending(false);
        }
    };

    const handleStatusToggle = async (taskId: string, currentStatus: Task['status']) => {
        const newStatus = currentStatus === 'done' ? 'pending' : 'completed'; // Map 'done' -> 'completed' for Server
        // Note: Server accepts 'state' enum/string. 
        // Our 'updateTask' schema expects 'state'.

        setIsPending(true);
        try {
            await updateTask({
                id: taskId,
                state: newStatus === 'completed' ? 'completed' : 'pending'
            });
            router.refresh();
        } catch (error) {
            console.error(error);
        } finally {
            setIsPending(false);
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm('Are you sure you want to delete this task?')) return;

        setIsPending(true);
        try {
            await deleteTask(taskId);
            router.refresh();
        } catch (error) {
            console.error('Failed to delete task:', error);
            alert('Failed to delete task');
        } finally {
            setIsPending(false);
        }
    };

    // Stats
    const pendingCount = tasks.filter(t => t.status !== 'done').length;
    const todayCount = tasks.filter(t => t.dueDate === getToday() && t.status !== 'done').length;
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const overdueCount = tasks.filter(t => t.dueDate && getDaysUntil(t.dueDate) < 0 && t.status !== 'done').length;

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-24">
            {/* 1. STATS ROW */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <IconBox icon={CheckSquare} size="md" />
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Pending</p>
                            <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <IconBox icon={Calendar} size="md" className="bg-blue-100" iconClassName="text-blue-600" />
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Focus Today</p>
                            <p className="text-2xl font-bold text-blue-600">{todayCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <IconBox icon={CheckCircle2} size="md" className="bg-green-100" iconClassName="text-green-600" />
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Done</p>
                            <p className="text-2xl font-bold text-green-600">{doneCount}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="flex items-center gap-3 p-4">
                        <IconBox icon={Clock} size="md" className="bg-red-100" iconClassName="text-red-600" />
                        <div>
                            <p className="text-xs text-slate-500 uppercase font-bold">Overdue</p>
                            <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 2. ADD TASK FORM */}
            <Card className={cn("border-2 border-dashed transition-all", showAddForm ? "border-slate-300" : "border-slate-200 hover:border-slate-300")}>
                <CardContent className="p-0">
                    {!showAddForm ? (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full h-12 flex items-center justify-center gap-2 text-slate-500 font-medium hover:text-slate-700"
                        >
                            <Plus className="h-5 w-5" />
                            <span>Capture new task...</span>
                        </button>
                    ) : (
                        <div className="p-6 space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex flex-col md:flex-row gap-4">
                                <input
                                    type="text"
                                    placeholder="What needs to be done?"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="flex-1 px-4 py-2 text-lg font-medium border-b-2 border-slate-200 focus:border-slate-800 outline-none bg-transparent"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Priority</label>
                                    <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')} className="w-full px-3 py-2 rounded border border-slate-200 text-sm bg-white">
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Due Date</label>
                                    <input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-200 text-sm bg-white" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Context</label>
                                    <select value={contextType} onChange={(e) => { setContextType(e.target.value as 'none' | 'project' | 'hackathon'); setContextId(''); }} className="w-full px-3 py-2 rounded border border-slate-200 text-sm bg-white">
                                        <option value="none">No Context</option>
                                        <option value="project">Project</option>
                                        <option value="hackathon">Hackathon</option>
                                    </select>
                                </div>
                                {contextType !== 'none' && (
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-400 uppercase">Select {contextType}</label>
                                        <select value={contextId} onChange={(e) => setContextId(e.target.value)} className="w-full px-3 py-2 rounded border border-slate-200 text-sm bg-white">
                                            <option value="">Choose...</option>
                                            {contextType === 'project' ? projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>) : hackathons.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                                <Button onClick={handleAddTask} disabled={isPending}>{isPending ? 'Saving...' : 'Add Task'}</Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 3. FILTER TABS */}
            <div className="flex items-center gap-1 border-b border-slate-200">
                {(['all', 'today', 'pending', 'done'] as const).map(f => (
                    <button key={f} onClick={() => setFilter(f)} className={cn("px-4 py-2 text-sm font-medium border-b-2 transition-all relative top-[2px]", filter === f ? "border-slate-800 text-slate-800" : "border-transparent text-slate-400 hover:text-slate-600")}>
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* 4. TASK LIST */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedTasks.length === 0 ? (
                    <div className="col-span-2 py-12 text-center text-slate-400 italic">No tasks found.</div>
                ) : (
                    sortedTasks.map(task => {
                        let contextName = undefined;
                        if (task.contextType === 'project') contextName = projects.find(p => p.id === task.contextId)?.name;
                        else if (task.contextType === 'hackathon') contextName = hackathons.find(h => h.id === task.contextId)?.name;

                        return (
                            <div key={task.id} className="flex gap-3 group">
                                <div className="pt-2 flex flex-col gap-1">
                                    <button
                                        onClick={() => handleStatusToggle(task.id, task.status)}
                                        disabled={isPending}
                                        className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all", task.status === 'done' ? "bg-green-500 border-green-500 text-white" : "border-slate-300 hover:border-blue-400 text-transparent hover:text-blue-200")}
                                        title={task.status === 'done' ? 'Mark as pending' : 'Mark as done'}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteTask(task.id)}
                                        disabled={isPending}
                                        className="h-6 w-6 rounded flex items-center justify-center text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete task"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <TaskCard task={task} contextName={contextName} showContext={true} />
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
            {isPending && <div className="fixed bottom-4 right-4 bg-slate-900 text-white px-4 py-2 rounded shadow-lg animate-pulse">Syncing...</div>}
        </div>
    );
}
