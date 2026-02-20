'use server';

import { prisma } from '@/lib/db';

// =============================================
// TYPES (Derived Statistics)
// =============================================

export type RiskState = 'SAFE' | 'BORDERLINE' | 'CRITICAL';

export interface SubjectAttendanceStats {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    type: 'LECTURE' | 'LAB';
    weight: number;
    facultyName: string;

    // Raw counts
    totalScheduled: number;
    attended: number;
    missed: number;
    cancelled: number;
    otherActivity: number;

    // Derived
    totalConducted: number; // Excludes cancelled
    attendancePercentage: number;
    riskState: RiskState;

    // Recommendations
    classesNeededForSafe: number | null;
    classesCanMiss: number | null;
}

export interface OverallAttendanceStats {
    // Lecture stats
    lecturesConducted: number;
    lecturesAttended: number;
    lecturePercentage: number;

    // Lab stats (weight = 2)
    labsConducted: number;
    labsAttended: number;
    labPercentage: number;
    labWeight: number;

    // Combined weighted
    combinedPercentage: number;
    overallRiskState: RiskState;
}

export interface ClassInstanceWithRelations {
    id: string;
    subjectId: string;
    date: Date;
    startTime: string;
    endTime: string;
    type: string;
    status: string;
    notes: string | null;
    scheduledFacultyId: string;
    actualFacultyId: string | null;
    rescheduledFromId: string | null;
    subject: {
        id: string;
        name: string;
        code: string;
        type: string;
        weight: number;
    };
    scheduledFaculty: {
        id: string;
        name: string;
        title: string;
    };
    actualFaculty: {
        id: string;
        name: string;
        title: string;
    } | null;
    attendanceReason: {
        reasonType: string;
        description: string | null;
    } | null;
}

// =============================================
// CONSTANTS
// =============================================

const SAFE_THRESHOLD = 75;
const BORDERLINE_THRESHOLD = 65;
const LAB_WEIGHT = 2;

// =============================================
// QUERIES
// =============================================

export async function getSubjects() {
    return prisma.subject.findMany({
        include: {
            defaultFaculty: true
        },
        orderBy: { name: 'asc' }
    });
}

export async function getFaculty() {
    return prisma.faculty.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function getTimetableSlots(dayOfWeek?: string) {
    return prisma.timetableSlot.findMany({
        where: dayOfWeek ? { dayOfWeek } : undefined,
        include: {
            subject: {
                include: { defaultFaculty: true }
            }
        },
        orderBy: { startTime: 'asc' }
    });
}

export async function getClassInstancesForDate(dateStr: string): Promise<ClassInstanceWithRelations[]> {
    const date = new Date(dateStr);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    return prisma.classInstance.findMany({
        where: {
            date: {
                gte: date,
                lt: nextDate
            }
        },
        include: {
            subject: true,
            scheduledFaculty: true,
            actualFaculty: true,
            attendanceReason: true
        },
        orderBy: { startTime: 'asc' }
    });
}

export async function getAllClassInstances() {
    return prisma.classInstance.findMany({
        include: {
            subject: true,
            scheduledFaculty: true,
            actualFaculty: true,
            attendanceReason: true
        },
        orderBy: [{ date: 'desc' }, { startTime: 'asc' }]
    });
}

// =============================================
// DERIVED CALCULATIONS (Never stored)
// =============================================

function calculateRiskState(percentage: number): RiskState {
    if (percentage >= SAFE_THRESHOLD) return 'SAFE';
    if (percentage >= BORDERLINE_THRESHOLD) return 'BORDERLINE';
    return 'CRITICAL';
}

function calculateClassesNeededForSafe(attended: number, conducted: number): number | null {
    if (conducted === 0) return null;
    const currentPercentage = (attended / conducted) * 100;
    if (currentPercentage >= SAFE_THRESHOLD) return null;

    // Find minimum additional classes needed
    // (attended + x) / (conducted + x) >= 0.75
    // attended + x >= 0.75 * (conducted + x)
    // attended + x >= 0.75 * conducted + 0.75 * x
    // 0.25 * x >= 0.75 * conducted - attended
    // x >= (0.75 * conducted - attended) / 0.25
    // x >= 3 * conducted - 4 * attended

    const needed = Math.ceil(3 * conducted - 4 * attended);
    return Math.max(0, needed);
}

function calculateClassesCanMiss(attended: number, conducted: number): number | null {
    if (conducted === 0) return null;
    const currentPercentage = (attended / conducted) * 100;
    if (currentPercentage < SAFE_THRESHOLD) return null;

    // Find maximum classes that can be missed while staying at 75%
    // attended / (conducted + x) >= 0.75
    // attended >= 0.75 * (conducted + x)
    // attended / 0.75 >= conducted + x
    // x <= attended / 0.75 - conducted
    // x <= (4 * attended - 3 * conducted) / 3

    const canMiss = Math.floor((4 * attended - 3 * conducted) / 3);
    return Math.max(0, canMiss);
}

export async function getSubjectAttendanceStats(): Promise<SubjectAttendanceStats[]> {
    const subjects = await prisma.subject.findMany({
        include: { defaultFaculty: true }
    });

    const instances = await prisma.classInstance.findMany({
        select: {
            subjectId: true,
            actualSubjectId: true, // Include for subject exchange
            status: true
        }
    });

    const stats: SubjectAttendanceStats[] = subjects.map(subject => {
        // Count instances where this subject was actually taught
        // If actualSubjectId is set, use it; otherwise fall back to subjectId
        const subjectInstances = instances.filter(i => {
            const effectiveSubjectId = i.actualSubjectId || i.subjectId;
            return effectiveSubjectId === subject.id;
        });

        const totalScheduled = subjectInstances.length;
        const attendedRaw = subjectInstances.filter(i => i.status === 'ATTENDED' || i.status === 'OTHER_ACTIVITY').length;
        const missedRaw = subjectInstances.filter(i => i.status === 'MISSED').length;
        const cancelledRaw = subjectInstances.filter(i => i.status === 'CANCELLED').length;
        const otherActivityRaw = subjectInstances.filter(i => i.status === 'OTHER_ACTIVITY').length;

        // Apply weight for display (labs count as 2, lectures as 1)
        const weight = subject.weight;
        const attended = attendedRaw * weight;
        const missed = missedRaw * weight;
        const cancelled = cancelledRaw * weight;
        const otherActivity = otherActivityRaw * weight;

        const totalConductedRaw = totalScheduled - cancelledRaw;
        const totalConducted = totalConductedRaw * weight;
        const attendancePercentage = totalConductedRaw > 0 ? Math.round((attendedRaw / totalConductedRaw) * 100) : 100;
        const riskState = calculateRiskState(attendancePercentage);

        const classesNeededForSafe = calculateClassesNeededForSafe(attendedRaw, totalConductedRaw);
        const classesCanMiss = calculateClassesCanMiss(attendedRaw, totalConductedRaw);

        return {
            subjectId: subject.id,
            subjectName: subject.name,
            subjectCode: subject.code,
            type: subject.type as 'LECTURE' | 'LAB',
            weight: subject.weight,
            facultyName: `${subject.defaultFaculty.title} ${subject.defaultFaculty.name}`,
            totalScheduled,
            attended,
            missed,
            cancelled,
            otherActivity,
            totalConducted,
            attendancePercentage,
            riskState,
            classesNeededForSafe,
            classesCanMiss
        };
    });

    return stats;
}

export async function getOverallAttendanceStats(): Promise<OverallAttendanceStats> {
    const subjectStats = await getSubjectAttendanceStats();

    // Separate lectures and labs
    const lectureStats = subjectStats.filter(s => s.type === 'LECTURE');
    const labStats = subjectStats.filter(s => s.type === 'LAB');

    // Lecture totals
    const lecturesConducted = lectureStats.reduce((sum, s) => sum + s.totalConducted, 0);
    const lecturesAttended = lectureStats.reduce((sum, s) => sum + s.attended, 0);
    const lecturePercentage = lecturesConducted > 0 ? Math.round((lecturesAttended / lecturesConducted) * 100) : 100;

    // Lab totals
    const labsConducted = labStats.reduce((sum, s) => sum + s.totalConducted, 0);
    const labsAttended = labStats.reduce((sum, s) => sum + s.attended, 0);
    const labPercentage = labsConducted > 0 ? Math.round((labsAttended / labsConducted) * 100) : 100;

    // Combined weighted percentage
    // Labs count as 2x
    const weightedConducted = lecturesConducted + (labsConducted * LAB_WEIGHT);
    const weightedAttended = lecturesAttended + (labsAttended * LAB_WEIGHT);
    const combinedPercentage = weightedConducted > 0 ? Math.round((weightedAttended / weightedConducted) * 100) : 100;

    const overallRiskState = calculateRiskState(combinedPercentage);

    return {
        lecturesConducted,
        lecturesAttended,
        lecturePercentage,
        labsConducted,
        labsAttended,
        labPercentage,
        labWeight: LAB_WEIGHT,
        combinedPercentage,
        overallRiskState
    };
}

// =============================================
// RECOMMENDATION ENGINE
// =============================================

export interface SubjectRecommendation {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    type: 'LECTURE' | 'LAB';
    riskState: RiskState;
    attendancePercentage: number;
    recommendation: string;
}

export async function getRecommendations(): Promise<SubjectRecommendation[]> {
    const stats = await getSubjectAttendanceStats();

    return stats.map(stat => {
        let recommendation: string;

        if (stat.riskState === 'SAFE') {
            if (stat.classesCanMiss !== null && stat.classesCanMiss > 0) {
                recommendation = `Can miss ${stat.classesCanMiss} ${stat.type === 'LAB' ? 'lab(s)' : 'class(es)'}`;
            } else {
                recommendation = 'Maintain current attendance';
            }
        } else if (stat.riskState === 'BORDERLINE') {
            if (stat.classesNeededForSafe !== null) {
                recommendation = `Attend next ${stat.classesNeededForSafe} ${stat.type === 'LAB' ? 'lab(s)' : 'class(es)'} to be safe`;
            } else {
                recommendation = 'Attend all upcoming classes';
            }
        } else {
            recommendation = 'CRITICAL: Must attend all upcoming classes';
        }

        return {
            subjectId: stat.subjectId,
            subjectName: stat.subjectName,
            subjectCode: stat.subjectCode,
            type: stat.type,
            riskState: stat.riskState,
            attendancePercentage: stat.attendancePercentage,
            recommendation
        };
    });
}
