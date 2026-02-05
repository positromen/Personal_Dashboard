'use client';

// CalendarGrid - Client component for calendar month view
// Read-only - clicking an event navigates to source, no editing

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { CalendarEventWithContext } from '@/server/calendar/queries';
import { deleteManualEvent } from '@/server/calendar/actions';

interface CalendarGridProps {
    events: CalendarEventWithContext[];
    year: number;
    month: number; // 0-indexed
}

export function CalendarGrid({ events, year, month }: CalendarGridProps) {
    const [selectedEvent, setSelectedEvent] = useState<CalendarEventWithContext | null>(null);
    const [isPending, startTransition] = useTransition();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get days in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    // Generate calendar grid
    const calendarDays: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
        calendarDays.push(i);
    }

    const today = new Date();
    const isToday = (day: number) => {
        return day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();
    };

    const getEventsForDay = (day: number) => {
        return events.filter(e => {
            const eventDate = new Date(e.date);
            return eventDate.getDate() === day &&
                eventDate.getMonth() === month &&
                eventDate.getFullYear() === year;
        });
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'HACKATHON': return 'bg-purple-500';
            case 'PROJECT': return 'bg-green-500';
            case 'ACADEMIC': return 'bg-blue-500';
            default: return 'bg-slate-500';
        }
    };

    const getEventHref = (event: CalendarEventWithContext) => {
        if (event.projectId) return `/projects/${event.projectId}`;
        if (event.hackathonId) return `/hackathons/${event.hackathonId}`;
        return undefined;
    };

    const handleDelete = () => {
        if (!selectedEvent) return;

        startTransition(async () => {
            try {
                await deleteManualEvent(selectedEvent.id);
                setSelectedEvent(null);
                setShowDeleteConfirm(false);
            } catch (error) {
                console.error('Failed to delete event:', error);
                alert('Failed to delete event. Only manually added events can be deleted.');
            }
        });
    };

    return (
        <>
            <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {dayNames.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
                        {day}
                    </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map((day, index) => {
                    const dayEvents = day ? getEventsForDay(day) : [];
                    return (
                        <div
                            key={index}
                            className={cn(
                                "min-h-[80px] p-1 border border-slate-100 rounded",
                                day ? 'bg-white' : 'bg-slate-50',
                                day !== null && isToday(day) && 'ring-2 ring-slate-400'
                            )}
                        >
                            {day && (
                                <>
                                    <span className={cn(
                                        "text-sm",
                                        isToday(day) ? 'font-bold text-slate-900' : 'text-slate-600'
                                    )}>
                                        {day}
                                    </span>
                                    <div className="space-y-0.5 mt-1">
                                        {dayEvents.slice(0, 2).map(event => {
                                            const href = getEventHref(event);
                                            const chip = (
                                                <div
                                                    className={cn(
                                                        "text-xs px-1 py-0.5 rounded truncate text-white cursor-pointer hover:opacity-80 transition-opacity",
                                                        getTypeColor(event.type),
                                                        event.state === 'COMPLETED' && 'opacity-50 line-through',
                                                        event.state === 'MISSED' && 'opacity-50'
                                                    )}
                                                    title={event.title}
                                                    onClick={(e) => {
                                                        if (!href) {
                                                            e.preventDefault();
                                                            setSelectedEvent(event);
                                                        }
                                                    }}
                                                >
                                                    {event.title}
                                                </div>
                                            );

                                            if (href) {
                                                return (
                                                    <Link key={event.id} href={href}>
                                                        {chip}
                                                    </Link>
                                                );
                                            }

                                            return <div key={event.id}>{chip}</div>;
                                        })}
                                        {dayEvents.length > 2 && (
                                            <div className="text-xs text-slate-500 px-1">
                                                +{dayEvents.length - 2} more
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Event Popup (for manual events - with delete option) */}
            {selectedEvent && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    onClick={() => { setSelectedEvent(null); setShowDeleteConfirm(false); }}
                >
                    <div
                        className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className={cn("h-3 w-3 rounded-full", getTypeColor(selectedEvent.type))} />
                                <h3 className="text-lg font-semibold text-slate-800">
                                    {selectedEvent.title}
                                </h3>
                            </div>
                            {/* Only show delete for manual events (not auto-generated) */}
                            {!selectedEvent.autoGenerated && (
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                                    title="Delete event"
                                >
                                    🗑️ Delete
                                </button>
                            )}
                        </div>

                        {/* Delete Confirmation */}
                        {showDeleteConfirm && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-sm text-red-800 mb-2">
                                    Are you sure you want to delete this event?
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleDelete}
                                        disabled={isPending}
                                        className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm rounded font-medium"
                                    >
                                        {isPending ? 'Deleting...' : 'Yes, Delete'}
                                    </button>
                                    <button
                                        onClick={() => setShowDeleteConfirm(false)}
                                        className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm rounded font-medium"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-3 text-sm text-slate-600">
                            <p>
                                <span className="font-medium">Date:</span>{' '}
                                {new Date(selectedEvent.date).toLocaleDateString('en-IN', {
                                    weekday: 'long',
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </p>
                            <p>
                                <span className="font-medium">Type:</span>{' '}
                                {selectedEvent.type}
                            </p>
                            {selectedEvent.description && (
                                <p>
                                    <span className="font-medium">Description:</span>{' '}
                                    {selectedEvent.description}
                                </p>
                            )}
                            {selectedEvent.autoGenerated && (
                                <p className="text-xs text-slate-400 italic">
                                    This event is auto-generated and cannot be deleted.
                                    Delete the source hackathon/project instead.
                                </p>
                            )}
                        </div>

                        <button
                            onClick={() => { setSelectedEvent(null); setShowDeleteConfirm(false); }}
                            className="mt-6 w-full py-2 px-4 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

