'use client';

// AddManualEventModal - For adding ACADEMIC or PERSONAL events
// Only manual events can be created here. Auto-generated events come from Hackathons/Projects.

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus } from 'lucide-react';
import { createManualEvent } from '@/server/calendar/actions';

export function AddManualEventModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [form, setForm] = useState({
        title: '',
        date: '',
        type: 'ACADEMIC' as 'ACADEMIC' | 'PERSONAL',
        priority: 'NORMAL' as 'NORMAL' | 'HIGH' | 'CRITICAL',
        description: ''
    });

    const handleSubmit = () => {
        if (!form.title || !form.date) return;

        startTransition(async () => {
            await createManualEvent({
                title: form.title,
                date: form.date,
                type: form.type,
                priority: form.priority,
                description: form.description || undefined
            });
            setIsOpen(false);
            setForm({
                title: '',
                date: '',
                type: 'ACADEMIC',
                priority: 'NORMAL',
                description: ''
            });
        });
    };

    return (
        <>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)}>
                <Plus className="h-4 w-4" />
            </Button>

            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={() => setIsOpen(false)}
                >
                    <div
                        className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-slate-800 mb-4">
                            Add Manual Event
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Add exams, personal deadlines, or college events.
                            <br />
                            <span className="text-xs text-slate-400">
                                Hackathon and project deadlines are auto-generated.
                            </span>
                        </p>

                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Title *
                                </label>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                    placeholder="e.g., Mid-Semester Exam"
                                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    value={form.date}
                                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Type
                                </label>
                                <select
                                    value={form.type}
                                    onChange={e => setForm(p => ({ ...p, type: e.target.value as 'ACADEMIC' | 'PERSONAL' }))}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="ACADEMIC">Academic (Exam, Assignment)</option>
                                    <option value="PERSONAL">Personal</option>
                                </select>
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Priority
                                </label>
                                <select
                                    value={form.priority}
                                    onChange={e => setForm(p => ({ ...p, priority: e.target.value as 'NORMAL' | 'HIGH' | 'CRITICAL' }))}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="NORMAL">Normal</option>
                                    <option value="HIGH">High</option>
                                    <option value="CRITICAL">Critical</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Description (optional)
                                </label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Add any notes..."
                                    rows={2}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 py-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isPending || !form.title || !form.date}
                                className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 rounded-lg text-white font-medium transition-colors"
                            >
                                {isPending ? 'Adding...' : 'Add Event'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
