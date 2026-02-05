'use server';

import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { ApplicationStatus, ApplicationType } from '@/lib/applicationTypes';

// =============================================
// QUERIES
// =============================================

export async function getApplications() {
    const applications = await prisma.application.findMany({
        include: {
            updates: {
                orderBy: { timestamp: 'desc' },
                take: 1 // Get latest update only for list view
            }
        },
        orderBy: { lastUpdated: 'desc' }
    });

    return applications;
}

export async function getApplication(id: string) {
    const application = await prisma.application.findUnique({
        where: { id },
        include: {
            updates: {
                orderBy: { timestamp: 'desc' }
            },
            noteLinks: {
                include: {
                    note: true
                }
            },
            calendarEvents: {
                orderBy: { date: 'asc' }
            }
        }
    });

    return application;
}

// =============================================
// MUTATIONS
// =============================================

interface CreateApplicationData {
    companyName: string;
    role: string;
    type: ApplicationType;
    companyLink?: string;
    applicationLink?: string;
    status?: ApplicationStatus;
    appliedDate?: Date;
}

export async function createApplication(data: CreateApplicationData) {
    const application = await prisma.application.create({
        data: {
            companyName: data.companyName,
            role: data.role,
            type: data.type,
            companyLink: data.companyLink || null,
            applicationLink: data.applicationLink || null,
            status: data.status || 'discovered',
            appliedDate: data.appliedDate || null,
            updates: {
                create: {
                    updateType: 'STATUS_CHANGE',
                    content: `Application created with status: ${data.status || 'discovered'}`
                }
            }
        }
    });

    revalidatePath('/applications');
    return application;
}

interface UpdateApplicationData {
    companyName?: string;
    role?: string;
    type?: ApplicationType;
    companyLink?: string;
    applicationLink?: string;
    appliedDate?: Date | null;
}

export async function updateApplication(id: string, data: UpdateApplicationData) {
    const application = await prisma.application.update({
        where: { id },
        data: {
            ...data,
            // Create an update log for the edit
            updates: {
                create: {
                    updateType: 'NOTE',
                    content: 'Application details updated'
                }
            }
        }
    });

    revalidatePath('/applications');
    revalidatePath(`/applications/${id}`);
    return application;
}

export async function updateApplicationStatus(id: string, newStatus: ApplicationStatus, note?: string) {
    // Get current status
    const current = await prisma.application.findUnique({
        where: { id },
        select: { status: true }
    });

    if (!current) throw new Error('Application not found');

    const oldStatus = current.status;

    // Update status and create log
    const application = await prisma.application.update({
        where: { id },
        data: {
            status: newStatus,
            appliedDate: newStatus === 'applied' && !current ? new Date() : undefined,
            updates: {
                create: {
                    updateType: 'STATUS_CHANGE',
                    content: note || `Status changed: ${formatStatus(oldStatus)} → ${formatStatus(newStatus)}`
                }
            }
        }
    });

    revalidatePath('/applications');
    revalidatePath(`/applications/${id}`);
    return application;
}

export async function addApplicationUpdate(id: string, content: string) {
    const update = await prisma.applicationUpdate.create({
        data: {
            applicationId: id,
            updateType: 'NOTE',
            content
        }
    });

    // Touch the application to update lastUpdated
    await prisma.application.update({
        where: { id },
        data: {} // This triggers updatedAt
    });

    revalidatePath(`/applications/${id}`);
    return update;
}

export async function deleteApplication(id: string) {
    await prisma.application.delete({
        where: { id }
    });

    revalidatePath('/applications');
}

// =============================================
// HELPERS
// =============================================

function formatStatus(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// =============================================
// CALENDAR INTEGRATION
// =============================================

export async function addInterviewEvent(applicationId: string, date: Date, description?: string) {
    const application = await prisma.application.findUnique({
        where: { id: applicationId },
        select: { companyName: true, role: true }
    });

    if (!application) throw new Error('Application not found');

    const event = await prisma.calendarEvent.create({
        data: {
            title: `Interview: ${application.companyName} - ${application.role}`,
            date,
            type: 'APPLICATION',
            priority: 'HIGH',
            autoGenerated: true,
            sourceType: 'application',
            eventKind: 'interview',
            applicationId,
            description
        }
    });

    // Also add an update log
    await prisma.applicationUpdate.create({
        data: {
            applicationId,
            updateType: 'NOTE',
            content: `Interview scheduled for ${date.toLocaleDateString()}`
        }
    });

    revalidatePath(`/applications/${applicationId}`);
    revalidatePath('/calendar');
    return event;
}
