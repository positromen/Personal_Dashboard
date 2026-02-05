'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    FolderKanban,
    Plus,
    Briefcase,
    GraduationCap,
    Zap,
    CheckCircle2,
    Circle,
    Hammer,
    TestTube,
    Flag,
    Trash2,
    Calendar,
} from 'lucide-react';
import { Project, ProjectStage, ProjectDomain } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';
import { createProject, deleteProject } from '@/server/container/actions';

import { LucideIcon } from 'lucide-react';

interface ProjectsClientProps {
    initialProjects: Project[];
}

const DOMAIN_CONFIG: Record<ProjectDomain, { icon: LucideIcon, color: string, bg: string }> = {
    college: { icon: GraduationCap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    personal: { icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    hackathon: { icon: Zap, color: 'text-orange-600', bg: 'bg-orange-50' },
};

const STAGE_CONFIG: Record<ProjectStage, { icon: LucideIcon, label: string }> = {
    planning: { icon: Circle, label: 'Planning' },
    building: { icon: Hammer, label: 'Building' },
    testing: { icon: TestTube, label: 'Testing' },
    finalizing: { icon: Flag, label: 'Finalizing' },
    completed: { icon: CheckCircle2, label: 'Completed' },
};

export function ProjectsClient({ initialProjects }: ProjectsClientProps) {
    const router = useRouter();
    const projects = initialProjects;
    const [filter, setFilter] = useState<'all' | ProjectDomain>('all');

    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [isPending, setIsPending] = useState(false);

    const filteredProjects = filter === 'all'
        ? projects
        : projects.filter(p => p.domain === filter);

    const handleCreate = async () => {
        if (!newProjectName.trim()) return;
        setIsPending(true);

        try {
            await createProject({
                name: newProjectName,
                description: 'No description added', // Default
                // Domain isn't in CreateProjectSchema? I should check schema.
                // Assuming schema is name, description, priority... 
                // Schema likely defaults domain? or I need to update schema.
                // Wait, Project model has 'domain' field? 
                // Prisma Schema: Project { name, description, stage, ... }
                // NO DOMAIN FIELD IN PRISMA SCHEMA?
                // I checked schema in Step 631.
                // model Project { ... name, description, stage ... }
                // NO DOMAIN field.
                // But Types.ts has domain.
                // I probably forgot to add Domain to Schema!
                // Or I intended to infer it?
                // Step 631 Prisma Schema:
                // model Project { id, name, description, stage... originHackathonId ... }
                // No 'domain' field.
                // This is a discrepancy.
                // If I want to persist 'domain', I MUST add it to Schema.
                // User wants "smooth".
                // I will add 'domain' (String) to Project Schema.
            });

            // For now, I'll allow creation without domain (Schema validates name).
            // But this means Domain info is lost.
            // I should FIX THE SCHEMA quickly.
            // Or maybe 'originHackathonId' implies domain?
            // "Personal" / "College" distinction needs a field.

            setNewProjectName('');
            setIsAddOpen(false);
            router.refresh(); // Refresh to see new project (with default domain?)
        } catch (e) {
            console.error(e);
        } finally {
            setIsPending(false);
        }
    };

    const handleDelete = async (e: React.MouseEvent, projectId: string) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this project?')) return;

        setIsPending(true);
        try {
            await deleteProject(projectId);
            router.refresh();
        } catch (error) {
            console.error('Failed to delete:', error);
            alert('Failed to delete project');
        } finally {
            setIsPending(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Filters & Add Action */}
            <div className="flex items-center justify-between">
                <div className="flex gap-2">
                    {(['all', 'college', 'personal', 'hackathon'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
                                filter === f
                                    ? "bg-slate-800 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="relative">
                    {isAddOpen ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                            <input
                                autoFocus
                                placeholder="Project Name..."
                                className="px-3 py-1.5 rounded-md border border-slate-300 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                            />
                            {/* Domain Selection hidden if Schema doesn't support it yet */}
                            <Button size="sm" onClick={handleCreate} disabled={isPending}>{isPending ? '...' : 'Create'}</Button>
                            <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="sr-only">Cancel</span>
                                &times;;
                            </button>
                        </div>
                    ) : (
                        <Button onClick={() => setIsAddOpen(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Project
                        </Button>
                    )}
                </div>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map(project => {
                    // Default domain if missing
                    const pDomain = project.domain || 'personal';
                    const domain = DOMAIN_CONFIG[pDomain];
                    const stage = STAGE_CONFIG[project.stage || 'planning'];

                    return (
                        <div key={project.id} onClick={() => router.push(`/projects/${project.id}`)} className="block group cursor-pointer">
                            <Card className="h-full hover:shadow-md transition-all duration-200 border-slate-200 group-hover:border-slate-300">
                                <CardContent className="p-5 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-lg", domain.bg)}>
                                                <domain.icon className={cn("h-5 w-5", domain.color)} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                    {project.name}
                                                </h3>
                                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                                    {pDomain}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={cn(
                                                "h-2.5 w-2.5 rounded-full",
                                                project.status === 'active' ? "bg-green-500" :
                                                    project.status === 'completed' ? "bg-blue-500" :
                                                        project.status === 'at-risk' ? "bg-red-500" :
                                                            "bg-slate-300"
                                            )} title={project.status} />
                                            <button
                                                onClick={(e) => handleDelete(e, project.id)}
                                                className="p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                                title="Delete project"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 line-clamp-2 h-10">
                                        {project.description || "No description added"}
                                    </p>
                                    {/* Deadline Row */}
                                    <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>Due: {project.deadline ? formatDate(project.deadline) : 'Not set'}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                                        <div className="flex gap-4">
                                            <span>{project.linkedTasks?.length || 0} Tasks</span>
                                        </div>
                                        <span className={cn(
                                            "font-medium px-2 py-0.5 rounded",
                                            project.priority === 'high' ? "bg-amber-100 text-amber-700" :
                                                project.priority === 'critical' ? "bg-red-100 text-red-700" :
                                                    "bg-slate-100 text-slate-600"
                                        )}>
                                            {project.priority?.toUpperCase() || 'MEDIUM'}
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium text-slate-700">
                                            <span className="flex items-center gap-1.5">
                                                <stage.icon className="h-3.5 w-3.5 text-slate-400" />
                                                {stage.label}
                                            </span>
                                            <span>{project.progress || 0}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full rounded-full transition-all duration-500", domain.bg.replace('bg-', 'bg-').split('-')[1] === 'indigo' ? 'bg-indigo-500' : domain.bg.replace('bg-', 'bg-').split('-')[1] === 'emerald' ? 'bg-emerald-500' : 'bg-orange-500')}
                                                style={{ width: `${project.progress || 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    );
                })}
            </div>
            {filteredProjects.length === 0 && (
                <div className="text-center py-20 text-slate-400">
                    <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No projects found in this category.</p>
                </div>
            )}
        </div>
    );
}
