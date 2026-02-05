'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

// =============================================
// TYPES
// =============================================

export type AttendanceStatus = 'SCHEDULED' | 'ATTENDED' | 'MISSED' | 'CANCELLED' | 'OTHER_ACTIVITY';
export type ReasonType = 'SICK' | 'EVENT' | 'HACKATHON' | 'PERSONAL' | 'UNKNOWN';

interface MarkAttendanceOptions {
    notes?: string;
    actualFacultyId?: string;
    actualSubjectId?: string;  // For subject exchange (e.g., LT taught in IoT slot)
    reasonType?: ReasonType;
    reasonDescription?: string;
}


// =============================================
// GENERATE CLASS INSTANCES FOR DATE
// Idempotent: Only creates if not existing
// =============================================

export async function generateClassInstancesForDate(dateStr: string) {
    const date = new Date(dateStr);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

    // Check if instances already exist for this date
    const existingCount = await prisma.classInstance.count({
        where: {
            date: {
                gte: new Date(dateStr),
                lt: new Date(new Date(dateStr).setDate(date.getDate() + 1))
            }
        }
    });

    if (existingCount > 0) {
        // Already generated, skip
        return { generated: 0, message: 'Instances already exist for this date' };
    }

    // Get timetable slots for this day
    const slots = await prisma.timetableSlot.findMany({
        where: { dayOfWeek },
        include: { subject: true }
    });

    if (slots.length === 0) {
        return { generated: 0, message: 'No timetable slots for this day' };
    }

    // Generate instances
    const instances = await prisma.$transaction(
        slots.map(slot =>
            prisma.classInstance.create({
                data: {
                    subjectId: slot.subjectId,
                    date: new Date(dateStr),
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    type: slot.subject.type,
                    scheduledFacultyId: slot.subject.defaultFacultyId,
                    status: 'SCHEDULED'
                }
            })
        )
    );

    revalidatePath('/attendance');
    return { generated: instances.length, message: `Generated ${instances.length} class instances` };
}

// =============================================
// MARK ATTENDANCE
// Core action for recording what happened
// =============================================

export async function markAttendance(
    instanceId: string,
    status: AttendanceStatus,
    options: MarkAttendanceOptions = {}
) {
    // Validate: MISSED requires reason
    if (status === 'MISSED' && !options.reasonType) {
        throw new Error('Reason is required when marking as MISSED');
    }

    // Get current instance
    const instance = await prisma.classInstance.findUnique({
        where: { id: instanceId },
        include: { attendanceReason: true }
    });

    if (!instance) {
        throw new Error('Class instance not found');
    }

    // Update in transaction
    await prisma.$transaction(async (tx) => {
        // Update the instance
        await tx.classInstance.update({
            where: { id: instanceId },
            data: {
                status,
                notes: options.notes ?? instance.notes,
                actualFacultyId: options.actualFacultyId ?? instance.actualFacultyId,
                actualSubjectId: options.actualSubjectId ?? instance.actualSubjectId
            }
        });

        // Handle attendance reason
        if (status === 'MISSED') {
            // Upsert reason
            if (instance.attendanceReason) {
                await tx.attendanceReason.update({
                    where: { classInstanceId: instanceId },
                    data: {
                        reasonType: options.reasonType!,
                        description: options.reasonDescription
                    }
                });
            } else {
                await tx.attendanceReason.create({
                    data: {
                        classInstanceId: instanceId,
                        reasonType: options.reasonType!,
                        description: options.reasonDescription
                    }
                });
            }
        } else if (instance.attendanceReason) {
            // Remove reason if status is no longer MISSED
            await tx.attendanceReason.delete({
                where: { classInstanceId: instanceId }
            });
        }
    });

    revalidatePath('/attendance');
    return { success: true };
}

// =============================================
// RESCHEDULE CLASS
// Creates new instance, marks original as CANCELLED
// =============================================

export async function rescheduleClass(
    instanceId: string,
    newDateStr: string,
    newStartTime: string,
    newEndTime: string
) {
    const original = await prisma.classInstance.findUnique({
        where: { id: instanceId },
        include: { subject: true }
    });

    if (!original) {
        throw new Error('Class instance not found');
    }

    if (original.status !== 'SCHEDULED') {
        throw new Error('Can only reschedule SCHEDULED classes');
    }

    await prisma.$transaction(async (tx) => {
        // Mark original as cancelled
        await tx.classInstance.update({
            where: { id: instanceId },
            data: {
                status: 'CANCELLED',
                notes: `Rescheduled to ${newDateStr}`
            }
        });

        // Create new instance linked to original
        await tx.classInstance.create({
            data: {
                subjectId: original.subjectId,
                date: new Date(newDateStr),
                startTime: newStartTime,
                endTime: newEndTime,
                type: original.type,
                scheduledFacultyId: original.scheduledFacultyId,
                status: 'SCHEDULED',
                rescheduledFromId: instanceId,
                notes: `Rescheduled from ${original.date.toISOString().split('T')[0]}`
            }
        });
    });

    revalidatePath('/attendance');
    return { success: true };
}

// =============================================
// UPDATE FACULTY EXCHANGE
// Records actual faculty while keeping scheduled faculty
// =============================================

export async function updateFacultyExchange(instanceId: string, actualFacultyId: string, notes?: string) {
    await prisma.classInstance.update({
        where: { id: instanceId },
        data: {
            actualFacultyId,
            notes: notes ?? undefined
        }
    });

    revalidatePath('/attendance');
    return { success: true };
}
