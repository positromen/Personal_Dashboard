// NEXUS Utility Functions
// Updated with comprehensive attendance calculations

import {
    Subject,
    Faculty,
    ClassInstance,
    RiskState,
    SubjectAttendanceStats,
    OverallAttendanceStats,
    AttendanceConfig,
    DEFAULT_ATTENDANCE_CONFIG
} from './types';

// =============================================
// DATE FORMATTING
// =============================================
export function formatDate(date: string | Date | null | undefined): string {
    if (!date) return 'Not set';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid date';
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function formatTime(time: string): string {
    const [hours, minutes] = time.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
}

export function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

export function getDayOfWeek(): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
}

export function isToday(date: string): boolean {
    return date === getToday();
}

export function getDaysUntil(date: string): number {
    const target = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

// =============================================
// ATTENDANCE CALCULATIONS (STRICT LOGIC)
// =============================================

/**
 * Calculate attendance statistics for a single subject
 */
export function calculateSubjectStats(
    subject: Subject,
    faculty: Faculty | undefined,
    classInstances: ClassInstance[],
    config: AttendanceConfig = DEFAULT_ATTENDANCE_CONFIG
): SubjectAttendanceStats {
    // Filter instances for this subject
    const instances = classInstances.filter(c => c.subjectId === subject.id);

    // Count by status
    const attended = instances.filter(c => c.status === 'attended').length;
    const missed = instances.filter(c => c.status === 'missed').length;
    const cancelled = instances.filter(c => c.status === 'cancelled').length;
    const otherActivity = instances.filter(c => c.status === 'other_activity').length;
    // faculty_exchanged doesn't change counts, just metadata

    // Total conducted = all except cancelled
    // Other activity counts as conducted but NOT as missed
    const totalConducted = attended + missed + otherActivity;

    // Attendance percentage:
    // attended / totalConducted (other_activity does NOT count as absence)
    const attendancePercentage = totalConducted > 0
        ? Math.round((attended / totalConducted) * 100)
        : 100;

    // Calculate risk state
    const riskState = calculateRiskState(attendancePercentage, config);

    // Calculate recovery/buffer intelligence
    const { classesNeededForSafe, classesCanMiss } = calculateRecoveryBuffer(
        attended,
        totalConducted,
        config
    );

    return {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        classType: subject.type,
        facultyName: faculty ? `${faculty.title} ${faculty.name}` : 'Unknown',
        totalConducted,
        attended,
        missed,
        cancelled,
        otherActivity,
        attendancePercentage,
        riskState,
        classesNeededForSafe,
        classesCanMiss,
    };
}

/**
 * Calculate overall attendance across all subjects
 * Separate tracking for lectures and labs
 */
export function calculateOverallStats(
    subjects: Subject[],
    classInstances: ClassInstance[],
    config: AttendanceConfig = DEFAULT_ATTENDANCE_CONFIG
): OverallAttendanceStats {
    let lecturesConducted = 0;
    let lecturesAttended = 0;
    let labsConducted = 0;
    let labsAttended = 0;

    subjects.forEach(subject => {
        const instances = classInstances.filter(c => c.subjectId === subject.id);

        const attended = instances.filter(c => c.status === 'attended').length;
        const missed = instances.filter(c => c.status === 'missed').length;
        const otherActivity = instances.filter(c => c.status === 'other_activity').length;
        const conducted = attended + missed + otherActivity;

        if (subject.type === 'lecture') {
            lecturesConducted += conducted;
            lecturesAttended += attended;
        } else {
            labsConducted += conducted;
            labsAttended += attended;
        }
    });

    // Calculate percentages
    const lecturePercentage = lecturesConducted > 0
        ? Math.round((lecturesAttended / lecturesConducted) * 100)
        : 100;

    const labPercentage = labsConducted > 0
        ? Math.round((labsAttended / labsConducted) * 100)
        : 100;

    // Combined percentage with lab weight
    // (lectures_attended + (labs_attended × lab_weight)) / 
    // (lectures_conducted + (labs_conducted × lab_weight)) × 100
    const weightedAttended = lecturesAttended + (labsAttended * config.labWeight);
    const weightedConducted = lecturesConducted + (labsConducted * config.labWeight);

    const combinedPercentage = weightedConducted > 0
        ? Math.round((weightedAttended / weightedConducted) * 100)
        : 100;

    const overallRiskState = calculateRiskState(combinedPercentage, config);

    return {
        lecturesConducted,
        lecturesAttended,
        lecturePercentage,
        labsConducted,
        labsAttended,
        labPercentage,
        labWeight: config.labWeight,
        combinedPercentage,
        overallRiskState,
    };
}

/**
 * Calculate risk state based on percentage
 */
export function calculateRiskState(
    percentage: number,
    config: AttendanceConfig = DEFAULT_ATTENDANCE_CONFIG
): RiskState {
    if (percentage >= config.safeThreshold) return 'safe';
    if (percentage >= config.borderlineThreshold) return 'borderline';
    return 'critical';
}

/**
 * Calculate recovery and buffer for a subject
 */
export function calculateRecoveryBuffer(
    attended: number,
    conducted: number,
    config: AttendanceConfig = DEFAULT_ATTENDANCE_CONFIG
): { classesNeededForSafe: number | null; classesCanMiss: number | null } {
    const percentage = conducted > 0 ? (attended / conducted) * 100 : 100;

    if (percentage >= config.safeThreshold) {
        // Already safe - calculate how many can be missed
        // Solve: attended / (conducted + x) >= safeThreshold/100
        // attended × 100 >= safeThreshold × (conducted + x)
        // attended × 100 - safeThreshold × conducted >= safeThreshold × x
        // x <= (attended × 100 - safeThreshold × conducted) / safeThreshold
        const canMiss = Math.floor(
            (attended * 100 - config.safeThreshold * conducted) / config.safeThreshold
        );
        return {
            classesNeededForSafe: null,
            classesCanMiss: Math.max(0, canMiss)
        };
    } else {
        // Below safe - calculate how many needed to reach safe
        // Solve: (attended + x) / (conducted + x) >= safeThreshold/100
        // (attended + x) × 100 >= safeThreshold × (conducted + x)
        // attended × 100 + 100x >= safeThreshold × conducted + safeThreshold × x
        // 100x - safeThreshold × x >= safeThreshold × conducted - attended × 100
        // x × (100 - safeThreshold) >= safeThreshold × conducted - attended × 100
        // x >= (safeThreshold × conducted - attended × 100) / (100 - safeThreshold)
        const needed = Math.ceil(
            (config.safeThreshold * conducted - attended * 100) / (100 - config.safeThreshold)
        );
        return {
            classesNeededForSafe: Math.max(0, needed),
            classesCanMiss: null
        };
    }
}

/**
 * Calculate separate lecture/lab recovery and buffer
 */
export function calculateTypeRecoveryBuffer(
    subject: Subject,
    classInstances: ClassInstance[],
    config: AttendanceConfig = DEFAULT_ATTENDANCE_CONFIG
): { classesNeededForSafe: number | null; classesCanMiss: number | null } {
    const instances = classInstances.filter(c => c.subjectId === subject.id);

    const attended = instances.filter(c => c.status === 'attended').length;
    const missed = instances.filter(c => c.status === 'missed').length;
    const otherActivity = instances.filter(c => c.status === 'other_activity').length;
    const conducted = attended + missed + otherActivity;

    return calculateRecoveryBuffer(attended, conducted, config);
}

// =============================================
// LEGACY COMPATIBILITY
// =============================================
export function calculateAttendancePercentage(
    subject: Subject,
    records: { subjectId: string; status: string }[]
): number {
    const subjectRecords = records.filter(r => r.subjectId === subject.id);
    const attended = subjectRecords.filter(r => r.status === 'present' || r.status === 'attended').length;
    const total = subjectRecords.filter(r => r.status !== 'cancelled').length;

    if (total === 0) return 100;
    return Math.round((attended / total) * 100);
}

export function calculateOverallAttendance(
    subjects: Subject[],
    records: { subjectId: string; status: string }[]
): number {
    let totalWeighted = 0;
    let attendedWeighted = 0;

    subjects.forEach(subject => {
        const subjectRecords = records.filter(r => r.subjectId === subject.id);
        const attended = subjectRecords.filter(r => r.status === 'present' || r.status === 'attended').length;
        const total = subjectRecords.filter(r => r.status !== 'cancelled').length;
        const weight = subject.type === 'lab' ? 2 : 1;

        totalWeighted += total * weight;
        attendedWeighted += attended * weight;
    });

    if (totalWeighted === 0) return 100;
    return Math.round((attendedWeighted / totalWeighted) * 100);
}

export function calculateAttendanceRisk(
    subject: Subject,
    records: { subjectId: string; status: string }[],
    minRequired: number = 75
): { subjectId: string; currentPercentage: number; riskState: RiskState; classesNeededToRecover?: number; classesCanSkip?: number } {
    const percentage = calculateAttendancePercentage(subject, records);

    let riskState: RiskState = 'safe';
    let classesNeededToRecover: number | undefined;
    let classesCanSkip: number | undefined;

    if (percentage < 65) {
        riskState = 'critical';
    } else if (percentage < minRequired) {
        riskState = 'borderline';
    }

    const subjectRecords = records.filter(r => r.subjectId === subject.id);
    const attended = subjectRecords.filter(r => r.status === 'present' || r.status === 'attended').length;
    const total = subjectRecords.filter(r => r.status !== 'cancelled').length;

    if (percentage < minRequired) {
        const needed = Math.ceil((minRequired * total - 100 * attended) / (100 - minRequired));
        classesNeededToRecover = Math.max(0, needed);
    } else {
        const canSkip = Math.floor((100 * attended - minRequired * total) / minRequired);
        classesCanSkip = Math.max(0, canSkip);
    }

    return {
        subjectId: subject.id,
        currentPercentage: percentage,
        riskState,
        classesNeededToRecover,
        classesCanSkip,
    };
}

// =============================================
// ID GENERATION
// =============================================
export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================
// RISK STATE COLORS
// =============================================
export function getRiskColor(state: RiskState): string {
    switch (state) {
        case 'safe': return 'text-green-600';
        case 'borderline': return 'text-amber-600';
        case 'critical': return 'text-red-600';
        default: return 'text-slate-600';
    }
}

export function getRiskBgColor(state: RiskState): string {
    switch (state) {
        case 'safe': return 'bg-green-50';
        case 'borderline': return 'bg-amber-50';
        case 'critical': return 'bg-red-50';
        default: return 'bg-slate-50';
    }
}

// =============================================
// EXPORT FUNCTIONS
// =============================================
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                const stringValue = String(value ?? '');
                if (stringValue.includes(',') || stringValue.includes('"')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// =============================================
// PRIORITY SORTING
// =============================================
export function getPriorityWeight(priority: string): number {
    switch (priority) {
        case 'critical': return 4;
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
    }
}

// =============================================
// CLASS NAMES UTILITY
// =============================================
export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}
