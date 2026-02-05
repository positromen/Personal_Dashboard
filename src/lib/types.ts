// NEXUS Data Types - TypeScript Interfaces
// Updated with comprehensive Class Instance Model

// =============================================
// ATTENDANCE STATUS (MANDATORY 5 STATES)
// =============================================
export type AttendanceStatus =
    | 'attended'        // Counts toward attendance
    | 'missed'          // Counts as absence
    | 'cancelled'       // Does NOT affect calculation
    | 'other_activity'  // Does NOT count as absence (seminars, events, hackathons)
    | 'faculty_exchanged'; // Does NOT change attendance rules, only metadata

// =============================================
// CLASS INSTANCE MODEL (MANDATORY)
// =============================================
export interface ClassInstance {
    id: string;
    subjectId: string;
    classType: 'lecture' | 'lab';

    // Faculty tracking
    scheduledFacultyId: string;
    actualFacultyId: string | null;  // null if not exchanged

    // Time tracking
    date: string;  // YYYY-MM-DD
    startTime: string;  // HH:MM
    endTime: string;    // HH:MM

    // Attendance tracking
    status: AttendanceStatus | null;  // null = not marked yet

    // Audit fields
    remarks: string | null;
    otherActivityType: string | null;  // "seminar", "hackathon", "official_duty", etc.
    exchangeNote: string | null;  // "Class exchanged with SE faculty"

    // History
    statusHistory: StatusChange[];

    createdAt: string;
    updatedAt: string;
}

export interface StatusChange {
    from: AttendanceStatus | null;
    to: AttendanceStatus;
    changedAt: string;
    remarks: string | null;
}

// =============================================
// SUBJECT MODEL (ENHANCED)
// =============================================
export interface Subject {
    id: string;
    name: string;
    code: string;
    type: 'lecture' | 'lab';

    // Default faculty
    defaultFacultyId: string;
}

// =============================================
// FACULTY MODEL
// =============================================
export interface Faculty {
    id: string;
    name: string;
    title: string;  // "Dr.", "Prof.", "Mr.", "Ms."
    department: string;
}

// =============================================
// TIMETABLE ENTRY (RECURRING SCHEDULE)
// =============================================
export interface TimetableEntry {
    id: string;
    subjectId: string;
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
    startTime: string;
    endTime: string;
    room: string;
    facultyId: string;
}

// =============================================
// ATTENDANCE RECORD (DEPRECATED - kept for migration)
// =============================================
export interface AttendanceRecord {
    id: string;
    subjectId: string;
    date: string;
    status: 'present' | 'absent' | 'cancelled';
}

// =============================================
// ATTENDANCE STATISTICS
// =============================================
export interface SubjectAttendanceStats {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    classType: 'lecture' | 'lab';
    facultyName: string;

    // Counts
    totalConducted: number;      // Excludes cancelled
    attended: number;
    missed: number;
    cancelled: number;
    otherActivity: number;

    // Percentage
    attendancePercentage: number;

    // Risk
    riskState: RiskState;

    // Intelligence
    classesNeededForSafe: number | null;  // null if already safe
    classesCanMiss: number | null;        // null if already critical
}

export interface OverallAttendanceStats {
    // Lecture stats
    lecturesConducted: number;
    lecturesAttended: number;
    lecturePercentage: number;

    // Lab stats
    labsConducted: number;
    labsAttended: number;
    labPercentage: number;
    labWeight: number;

    // Combined
    combinedPercentage: number;
    overallRiskState: RiskState;
}

// =============================================
// RISK STATES
// =============================================
export type RiskState = 'safe' | 'borderline' | 'critical';

export interface AttendanceRisk {
    subjectId: string;
    currentPercentage: number;
    riskState: RiskState;
    classesNeededToRecover?: number;
    classesCanSkip?: number;
}

// =============================================
// PROJECT TYPES
// =============================================
export type ProjectDomain = 'college' | 'personal' | 'hackathon';
export type ProjectStage = 'planning' | 'building' | 'testing' | 'finalizing' | 'completed';

export interface ProjectLink {
    id: string;
    title: string;
    url: string;
    description?: string;
}

export interface ProjectNote {
    id: string;
    content: string;
    createdAt: string;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    domain: ProjectDomain;
    stage: ProjectStage; // Derived progress source
    status: 'planning' | 'active' | 'on-hold' | 'completed' | 'at-risk';
    priority: 'low' | 'medium' | 'high' | 'critical';
    progress: number; // Keep for backward compatibility/caching, but auto-derived
    deadline?: string; // Optional - can be undefined

    // Content & Links
    links: ProjectLink[];
    notes: ProjectNote[];

    // Relations
    linkedTasks: string[];

    linkedHackathonId?: string;

    // Metadata
    lastActivity: string;
    createdAt: string;
}

// =============================================
// TASK TYPES
// =============================================
export interface Task {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in-progress' | 'blocked' | 'done';
    priority: 'low' | 'medium' | 'high';
    dueDate?: string;

    // Context (Strict Ownership)
    contextType: 'project' | 'hackathon' | 'standalone';
    contextId: string; // ID of Project or Hackathon

    // Metadata
    blockerReason?: string;
    projectId?: string; // @deprecated - use contextId if contextType is project

    createdAt: string;
    completedAt?: string;
    notes?: string;
}

// =============================================
// COMPONENT CRM TYPES
// =============================================
export interface ElectronicComponent {
    id: string;
    name: string;
    category: string;
    quantityOwned: number;
    quantityInUse: number;
    condition: 'new' | 'good' | 'fair' | 'poor' | 'dead';
    source: 'lab' | 'vendor' | 'friend' | 'online' | 'salvaged';
    location?: string;
    notes?: string;
    linkedProjects: string[];
    lastUpdated: string;
}

export interface IncomingComponent {
    id: string;
    componentId?: string;
    name: string;
    quantity: number;
    source: string;
    expectedDelivery: string;
    status: 'ordered' | 'shipped' | 'delivered';
}

// =============================================
// CALENDAR TYPES
// =============================================
export interface CalendarEvent {
    id: string;
    title: string;
    type: 'academic' | 'project' | 'application' | 'personal' | 'hackathon';
    date: string;
    endDate?: string;
    priority: 'low' | 'medium' | 'high';
    linkedTaskId?: string;
    linkedHackathonId?: string;
    externalLink?: string;
    description?: string;
}

// =============================================
// DASHBOARD TYPES
// =============================================
export interface DashboardSummary {
    todaysClasses: TimetableEntry[];
    todaysTasks: Task[];
    nearestDeadline: CalendarEvent | null;
    attendanceRisks: AttendanceRisk[];

}

// =============================================
// CONFIGURATION
// =============================================
export interface AttendanceConfig {
    labWeight: number;  // Default: 2
    safeThreshold: number;  // Default: 75
    borderlineThreshold: number;  // Default: 65
}

export const DEFAULT_ATTENDANCE_CONFIG: AttendanceConfig = {
    labWeight: 2,
    safeThreshold: 75,
    borderlineThreshold: 65,
};

// =============================================
// HACKATHON TYPES (Intelligence Layer)
// =============================================
export type HackathonMode = 'online' | 'offline' | 'hybrid';
export type HackathonStatus = 'upcoming' | 'registered' | 'in_progress' | 'submitted' | 'completed' | 'missed';

export interface Hackathon {
    id: string;
    name: string;
    organizer: string;
    mode: HackathonMode;
    theme: string;
    teamSize: number;

    // Dates
    registrationDeadline: string;
    submissionDeadline: string;
    eventStartDate: string;
    eventEndDate: string;

    // User's Project
    projectTitle: string;
    projectDescription: string;

    // Status
    status: HackathonStatus;

    // External Links
    registrationLink?: string;
    submissionPortal?: string;
    discordSlack?: string;

    // Generic Content
    links: ProjectLink[];
    notes: ProjectNote[];

    // Linked Entities (Bidirectional)
    linkedProjectId: string | null;
    linkedTasks: string[];

    // Audit
    createdAt: string;
    updatedAt: string;
}

// Default hackathon tasks when registered
export const DEFAULT_HACKATHON_TASKS = [
    'Idea finalization',
    'Tech stack selection',
    'Prototype implementation',
    'Testing & validation',
    'Final submission',
];
