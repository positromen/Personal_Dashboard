// Application Tracker Types & Constants
// Separate file because 'use server' files can only export async functions

export const APPLICATION_STATUSES = [
    'discovered',
    'applied',
    'under_review',
    'interview_scheduled',
    'selected',
    'rejected',
    'withdrawn'
] as const;

export type ApplicationStatus = typeof APPLICATION_STATUSES[number];

export const APPLICATION_TYPES = ['INTERNSHIP', 'PLACEMENT'] as const;
export type ApplicationType = typeof APPLICATION_TYPES[number];
