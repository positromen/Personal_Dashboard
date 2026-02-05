import { Task } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { Calendar, AlertCircle, Circle, CheckCircle2, Play, PauseCircle } from 'lucide-react';
import Link from 'next/link';

interface TaskCardProps {
    task: Task;
    contextName?: string; // Pre-resolved name of Project/Hackathon
    showContext?: boolean; // Whether to show the top context row (useful for To-Do page)
}

export function TaskCard({ task, contextName, showContext = true }: TaskCardProps) {
    // State Config
    const stateConfig = {
        'pending': { color: 'bg-slate-200', text: 'text-slate-500', icon: Circle, label: 'Pending' },
        'in-progress': { color: 'bg-blue-500', text: 'text-blue-600', icon: Play, label: 'In Progress' },
        'blocked': { color: 'bg-red-500', text: 'text-red-600', icon: PauseCircle, label: 'Blocked' },
        'done': { color: 'bg-green-500', text: 'text-green-600', icon: CheckCircle2, label: 'Done' }
    };

    const config = stateConfig[task.status];
    const ContextIcon = task.contextType === 'project' ? 'Project' : task.contextType === 'hackathon' ? 'Hackathon' : 'Personal';

    // Due Date relative text could be refined, using basic formatting for now
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done';

    return (
        <div className="group bg-white rounded-lg border border-slate-200 hover:shadow-md transition-all overflow-hidden flex flex-col">

            {/* 1. CONTEXT ROW (Optional) */}
            {showContext && (
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <Link
                        href={`/${task.contextType}s/${task.contextId}`}
                        className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1"
                    >
                        <span>{contextName || "Loading..."}</span>
                        <span className="text-slate-300">·</span>
                        <span>{ContextIcon}</span>
                    </Link>
                </div>
            )}

            {/* 2. MAIN CONTENT */}
            <div className="p-4 flex-1">
                {/* ID / Debug (Optional) or Checklist check */}

                {/* TITLE */}
                <h4 className={cn(
                    "font-bold text-slate-800 mb-2 line-clamp-2 leading-tight",
                    task.status === 'done' && "line-through text-slate-400"
                )}>
                    {task.title}
                </h4>

                {/* 3. META ROW */}
                <div className="flex items-center gap-4 text-xs text-slate-500">

                    {/* Due Date */}
                    {task.dueDate && (
                        <div className={cn(
                            "flex items-center gap-1.5",
                            isOverdue ? "text-red-500 font-medium" : "text-slate-400"
                        )}>
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(task.dueDate)}</span>
                        </div>
                    )}

                    {/* Priority */}
                    <div className={cn(
                        "flex items-center gap-1.5 font-medium uppercase tracking-wide text-[10px]",
                        task.priority === 'high' ? "text-amber-600" :
                            task.priority === 'low' ? "text-slate-400" : "text-blue-500"
                    )}>
                        <AlertCircle className="h-3.5 w-3.5" />
                        {task.priority}
                    </div>

                    {/* Status Label (If needed explicitly, though bar shows it) */}
                    <div className={cn("flex items-center gap-1.5 ml-auto", config.text)}>
                        <config.icon className="h-3.5 w-3.5" />
                        <span>{config.label}</span>
                    </div>
                </div>
            </div>

            {/* 4. PROGRESS / STATE BAR */}
            <div className="h-1.5 w-full bg-slate-100 mt-auto">
                <div className={cn("h-full transition-all duration-500", config.color)} style={{ width: '100%' }} />
            </div>
        </div>
    );
}
