// NEXUS Local Storage Management
// Updated with ACTUAL B.Tech CS Year-3 Semester-VI Timetable
// Rashtriya Raksha University - TIME-TABLE 2025-26 (Even)

import {
    Subject,
    Faculty,
    TimetableEntry,
    ClassInstance,
    AttendanceRecord,
    Project,
    Task,

    CalendarEvent,
    AttendanceConfig,
    DEFAULT_ATTENDANCE_CONFIG,
    Hackathon,
    DEFAULT_HACKATHON_TASKS,
    RiskState,
    ProjectStage,
    ProjectLink,
} from './types';
import { generateId, getToday } from './utils';

// =============================================
// STORAGE KEYS
// =============================================
const STORAGE_KEYS = {
    subjects: 'nexus_subjects',
    faculty: 'nexus_faculty',
    timetable: 'nexus_timetable',
    classInstances: 'nexus_class_instances',
    attendanceRecords: 'nexus_attendance',
    projects: 'nexus_projects',
    tasks: 'nexus_tasks',

    calendarEvents: 'nexus_calendar',
    attendanceConfig: 'nexus_attendance_config',
    hackathons: 'nexus_hackathons',
    initialized: 'nexus_initialized_v9', // Added project detail refinement
};

// =============================================
// GENERIC STORAGE HELPERS
// =============================================
function getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch {
        return defaultValue;
    }
}

function setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        console.error('Failed to save to localStorage:', e);
    }
}

// =============================================
// FACULTY
// =============================================
export function getFaculty(): Faculty[] {
    return getItem<Faculty[]>(STORAGE_KEYS.faculty, []);
}

export function saveFaculty(faculty: Faculty[]): void {
    setItem(STORAGE_KEYS.faculty, faculty);
}

export function getFacultyById(id: string): Faculty | undefined {
    return getFaculty().find(f => f.id === id);
}

// =============================================
// SUBJECTS
// =============================================
export function getSubjects(): Subject[] {
    return getItem<Subject[]>(STORAGE_KEYS.subjects, []);
}

export function saveSubjects(subjects: Subject[]): void {
    setItem(STORAGE_KEYS.subjects, subjects);
}

export function getSubjectById(id: string): Subject | undefined {
    return getSubjects().find(s => s.id === id);
}

// =============================================
// TIMETABLE
// =============================================
export function getTimetable(): TimetableEntry[] {
    return getItem<TimetableEntry[]>(STORAGE_KEYS.timetable, []);
}

export function saveTimetable(timetable: TimetableEntry[]): void {
    setItem(STORAGE_KEYS.timetable, timetable);
}

export function getTimetableForDay(day: string): TimetableEntry[] {
    return getTimetable().filter(e => e.day === day.toLowerCase());
}

// =============================================
// CLASS INSTANCES
// =============================================
export function getClassInstances(): ClassInstance[] {
    return getItem<ClassInstance[]>(STORAGE_KEYS.classInstances, []);
}

export function saveClassInstances(instances: ClassInstance[]): void {
    setItem(STORAGE_KEYS.classInstances, instances);
}

export function getClassInstancesForDate(date: string): ClassInstance[] {
    return getClassInstances().filter(c => c.date === date);
}

export function getClassInstancesForSubject(subjectId: string): ClassInstance[] {
    return getClassInstances().filter(c => c.subjectId === subjectId);
}

export function addClassInstance(instance: ClassInstance): void {
    const instances = getClassInstances();
    instances.push(instance);
    saveClassInstances(instances);
}

export function updateClassInstance(id: string, updates: Partial<ClassInstance>): void {
    const instances = getClassInstances();
    const index = instances.findIndex(c => c.id === id);
    if (index !== -1) {
        instances[index] = {
            ...instances[index],
            ...updates,
            updatedAt: new Date().toISOString(),
        };
        saveClassInstances(instances);
    }
}

export function markClassAttendance(
    id: string,
    status: ClassInstance['status'],
    options?: {
        remarks?: string;
        otherActivityType?: string;
        actualFacultyId?: string;
        exchangeNote?: string;
    }
): void {
    const instances = getClassInstances();
    const index = instances.findIndex(c => c.id === id);
    if (index !== -1) {
        const instance = instances[index];

        const statusHistory = [...(instance.statusHistory || [])];
        statusHistory.push({
            from: instance.status,
            to: status!,
            changedAt: new Date().toISOString(),
            remarks: options?.remarks || null,
        });

        instances[index] = {
            ...instance,
            status,
            statusHistory,
            remarks: options?.remarks || instance.remarks,
            otherActivityType: options?.otherActivityType || instance.otherActivityType,
            actualFacultyId: options?.actualFacultyId || instance.actualFacultyId,
            exchangeNote: options?.exchangeNote || instance.exchangeNote,
            updatedAt: new Date().toISOString(),
        };
        saveClassInstances(instances);
    }
}

export function generateClassInstancesForDate(date: string): ClassInstance[] {
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const timetable = getTimetableForDay(dayOfWeek);
    const existingInstances = getClassInstancesForDate(date);
    const subjects = getSubjects();

    const newInstances: ClassInstance[] = [];

    timetable.forEach(entry => {
        const exists = existingInstances.some(
            i => i.subjectId === entry.subjectId &&
                i.startTime === entry.startTime &&
                i.endTime === entry.endTime
        );

        if (!exists) {
            const subject = subjects.find(s => s.id === entry.subjectId);
            if (subject) {
                const instance: ClassInstance = {
                    id: generateId(),
                    subjectId: entry.subjectId,
                    classType: subject.type,
                    scheduledFacultyId: entry.facultyId,
                    actualFacultyId: null,
                    date,
                    startTime: entry.startTime,
                    endTime: entry.endTime,
                    status: null,
                    remarks: null,
                    otherActivityType: null,
                    exchangeNote: null,
                    statusHistory: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                newInstances.push(instance);
                addClassInstance(instance);
            }
        }
    });

    return [...existingInstances, ...newInstances];
}

// =============================================
// ATTENDANCE RECORDS (LEGACY)
// =============================================
export function getAttendanceRecords(): AttendanceRecord[] {
    return getItem<AttendanceRecord[]>(STORAGE_KEYS.attendanceRecords, []);
}

export function saveAttendanceRecords(records: AttendanceRecord[]): void {
    setItem(STORAGE_KEYS.attendanceRecords, records);
}

export function addAttendanceRecord(record: AttendanceRecord): void {
    const records = getAttendanceRecords();
    const filtered = records.filter(
        r => !(r.subjectId === record.subjectId && r.date === record.date)
    );
    filtered.push(record);
    saveAttendanceRecords(filtered);
}

// =============================================
// ATTENDANCE CONFIG
// =============================================
export function getAttendanceConfig(): AttendanceConfig {
    return getItem<AttendanceConfig>(STORAGE_KEYS.attendanceConfig, DEFAULT_ATTENDANCE_CONFIG);
}

export function saveAttendanceConfig(config: AttendanceConfig): void {
    setItem(STORAGE_KEYS.attendanceConfig, config);
}

// =============================================
// PROJECTS
// =============================================
export function getProjects(): Project[] {
    return getItem<Project[]>(STORAGE_KEYS.projects, []);
}

// Calculate progress based on stage
export function calculateProgress(stage: ProjectStage): number {
    switch (stage) {
        case 'planning': return 25;
        case 'building': return 50;
        case 'testing': return 75;
        case 'finalizing': return 90;
        case 'completed': return 100;
        default: return 0;
    }
}

export function saveProjects(projects: Project[]): void {
    setItem(STORAGE_KEYS.projects, projects);
}

export function addProject(project: Project): void {
    const projects = getProjects();
    projects.push(project);
    saveProjects(projects);
}

export function updateProject(id: string, updates: Partial<Project>): void {
    const projects = getProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index !== -1) {
        const updatedProject = { ...projects[index], ...updates };

        // Auto-recalculate progress if stage changed
        if (updates.stage) {
            updatedProject.progress = calculateProgress(updates.stage);
        }

        // Auto-update status if stage is completed
        if (updates.stage === 'completed' && updatedProject.status !== 'completed') {
            updatedProject.status = 'completed';
        }

        projects[index] = updatedProject;
        saveProjects(projects);
    }
}

// Project Content Helpers
export function updateProjectStage(id: string, stage: ProjectStage): void {
    updateProject(id, { stage });
}

export function addProjectNote(projectId: string, content: string): void {
    const projects = getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
        if (!project.notes) project.notes = [];
        project.notes.unshift({ // Newest first
            id: generateId(),
            content,
            createdAt: new Date().toISOString()
        });
        saveProjects(projects);
    }
}

export function addProjectLink(projectId: string, link: Omit<ProjectLink, 'id'>): void {
    const projects = getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
        if (!project.links) project.links = [];
        project.links.push({
            id: generateId(),
            ...link
        });
        saveProjects(projects);
    }
}

export function deleteProjectLink(projectId: string, linkId: string): void {
    const projects = getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
        project.links = project.links.filter(l => l.id !== linkId);
        saveProjects(projects);
    }
}

// =============================================
// TASKS
// =============================================
export function getTasks(): Task[] {
    return getItem<Task[]>(STORAGE_KEYS.tasks, []);
}

export function saveTasks(tasks: Task[]): void {
    setItem(STORAGE_KEYS.tasks, tasks);
}

export function addTask(task: Task): void {
    const tasks = getTasks();
    tasks.push(task);
    saveTasks(tasks);

    // Auto-Link to Context
    if (task.contextType === 'project') {
        linkTaskToProject(task.contextId, task.id);
    } else if (task.contextType === 'hackathon') {
        linkTaskToHackathon(task.contextId, task.id);
    }
}

export function updateTask(id: string, updates: Partial<Task>): void {
    const tasks = getTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        const oldStatus = tasks[index].status;
        const newStatus = updates.status;

        tasks[index] = { ...tasks[index], ...updates };
        saveTasks(tasks);

        // If status changed, recalculate parent progress
        if (oldStatus !== newStatus && (newStatus === 'done' || oldStatus === 'done')) {
            const task = tasks[index];
            if (task.contextType === 'project') {
                recalculateProjectProgress(task.contextId);
            } else if (task.contextType === 'hackathon') {
                // Hackathon progress might be manual or task based, strict prompt says "Derived from Registration... Submission tasks... Linked Project"
                // For now, if linked to project, update project
                const hackathon = getHackathons().find(h => h.id === task.contextId);
                if (hackathon && hackathon.linkedProjectId) {
                    recalculateProjectProgress(hackathon.linkedProjectId);
                }
            }
        }
    }
}

// Helper: Link Task to Project
function linkTaskToProject(projectId: string, taskId: string) {
    const projects = getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
        if (!project.linkedTasks.includes(taskId)) {
            project.linkedTasks.push(taskId);
            saveProjects(projects);
            recalculateProjectProgress(projectId); // Recalc on new task (0% contribution initially but affects total)
        }
    }
}

// Helper: Link Task to Hackathon
function linkTaskToHackathon(hackathonId: string, taskId: string) {
    const hackathons = getHackathons();
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon) {
        // Ensure Hackathon has linkedTasks array (schema update might be needed if not present)
        // types.ts Hackathon interface doesn't explicitly have linkedTasks yet?
        // Let's check types.ts. It has 'links' (ProjectLink[]). No 'linkedTasks'.
        // I need to add linkedTasks to Hackathon interface in types.ts FIRST.
        // Assuming I will do that.
        // For now, I'll skip explicit Hackathon.linkedTasks update if field missing, 
        // BUT strict requirement says "Hackathon -> shows all linked tasks".
        // I will implement looking up tasks by contextId instead of storing IDs in Hackathon?
        // "Task MUST belong to exactly ONE... Project OR Hackathon".
        // So I can filter tasks by contextId.
        // BUT Project has `linkedTasks` array. 
        // Prompt says "Task auto-links to that Project... Task auto-links to that Hackathon".
        // Bidirectional visibility.
        // I'll rely on `contextId` query for visibility mostly, but Project has explicit array. 
        // If Hackathon has linked project, task links to project.

        if (hackathon.linkedProjectId) {
            linkTaskToProject(hackathon.linkedProjectId, taskId);
        }
    }
}

// Helper: Recalculate Project Progress
export function recalculateProjectProgress(projectId: string) {
    const projects = getProjects();
    const projectIndex = projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) return;

    // Note: Direct task query by contextId is kept for reference, but we use linkedTasks for accuracy
    // getTasks().filter(t => t.contextId === projectId && t.contextType === 'project');
    // This approach misses Hackathon tasks linked to project. Better to use project.linkedTasks.

    const project = projects[projectIndex];
    if (!project.linkedTasks || project.linkedTasks.length === 0) return;

    const linkedTaskObjects = getTasks().filter(t => project.linkedTasks.includes(t.id));
    const total = linkedTaskObjects.length;
    if (total === 0) return;

    const completed = linkedTaskObjects.filter(t => t.status === 'done').length;
    const progress = Math.round((completed / total) * 100);

    if (project.progress !== progress) {
        project.progress = progress;
        project.lastActivity = new Date().toISOString();
        projects[projectIndex] = project;
        saveProjects(projects);
    }
}

export function deleteTask(id: string): void {
    const tasks = getTasks().filter(t => t.id !== id);
    saveTasks(tasks);
}

// =============================================
// CALENDAR EVENTS
// =============================================
export function getCalendarEvents(): CalendarEvent[] {
    return getItem<CalendarEvent[]>(STORAGE_KEYS.calendarEvents, []);
}

export function saveCalendarEvents(events: CalendarEvent[]): void {
    setItem(STORAGE_KEYS.calendarEvents, events);
}

export function addCalendarEvent(event: CalendarEvent): void {
    const events = getCalendarEvents();
    events.push(event);
    saveCalendarEvents(events);
}

// =============================================
// HACKATHON INTELLIGENCE LAYER
// =============================================
export function getHackathons(): Hackathon[] {
    return getItem<Hackathon[]>(STORAGE_KEYS.hackathons, []);
}

export function saveHackathons(hackathons: Hackathon[]): void {
    setItem(STORAGE_KEYS.hackathons, hackathons);
}

export function addHackathon(hackathon: Hackathon): void {
    const hackathons = getHackathons();
    hackathons.push(hackathon);
    saveHackathons(hackathons);
}

export function updateHackathon(id: string, updates: Partial<Hackathon>): void {
    const hackathons = getHackathons();
    const index = hackathons.findIndex(h => h.id === id);
    if (index !== -1) {
        hackathons[index] = { ...hackathons[index], ...updates, updatedAt: new Date().toISOString() };
        saveHackathons(hackathons);
    }
}

export function deleteHackathon(id: string): void {
    const hackathons = getHackathons().filter(h => h.id !== id);
    saveHackathons(hackathons);
}

// Compute hackathon risk state based on submission deadline
export function computeHackathonRisk(submissionDeadline: string): { riskState: RiskState; daysRemaining: number } {
    const today = new Date(getToday());
    const deadline = new Date(submissionDeadline);
    const diffTime = deadline.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let riskState: RiskState;
    if (daysRemaining >= 7) {
        riskState = 'safe';
    } else if (daysRemaining >= 3) {
        riskState = 'borderline';
    } else {
        riskState = 'critical';
    }

    return { riskState, daysRemaining };
}

// Auto-derive priority from deadline proximity
function derivePriorityFromDeadline(deadline: string): 'low' | 'medium' | 'high' | 'critical' {
    const { daysRemaining } = computeHackathonRisk(deadline);
    if (daysRemaining <= 2) return 'critical';
    if (daysRemaining <= 5) return 'high';
    if (daysRemaining <= 14) return 'medium';
    return 'low';
}

// =============================================
// HACKATHON REGISTRATION (AUTO-GENERATION)
// When hackathon is marked as "registered":
// 1. Create linked Project
// 2. Create default Tasks
// 3. Create Calendar Events
// =============================================
export function registerForHackathon(hackathonId: string): { projectId: string; taskIds: string[]; eventIds: string[] } {
    const hackathons = getHackathons();
    const hackathon = hackathons.find(h => h.id === hackathonId);

    if (!hackathon) {
        throw new Error('Hackathon not found');
    }

    const today = getToday();
    const projectId = generateId();
    const priority = derivePriorityFromDeadline(hackathon.submissionDeadline);

    // 1. Create linked Project
    const project: Project = {
        id: projectId,
        name: hackathon.projectTitle || hackathon.name,
        description: hackathon.projectDescription || `Hackathon: ${hackathon.name} by ${hackathon.organizer}`,
        domain: 'hackathon',
        stage: 'planning', // Default stage
        status: 'active',
        priority,
        progress: 25, // Derived from planning stage
        deadline: hackathon.submissionDeadline,
        links: [],
        notes: [],
        linkedTasks: [],
        linkedHackathonId: hackathonId,
        lastActivity: today,
        createdAt: today,
    };
    addProject(project);

    // 2. Create default Tasks
    const taskIds: string[] = [];
    DEFAULT_HACKATHON_TASKS.forEach((taskTitle, index) => {
        const taskId = generateId();
        const task: Task = {
            id: taskId,
            title: taskTitle,
            description: `${hackathon.name} - ${taskTitle}`,
            status: 'pending',
            priority: index === DEFAULT_HACKATHON_TASKS.length - 1 ? 'high' : 'medium',
            dueDate: hackathon.submissionDeadline,
            contextType: 'project',
            contextId: projectId,
            createdAt: today,
        };
        addTask(task);
        taskIds.push(taskId);
    });

    // Linked tasks are auto-updated by addTask -> linkTaskToProject

    // 3. Create Calendar Events
    const eventIds: string[] = [];

    // Registration deadline (if in future)
    const regDeadline = new Date(hackathon.registrationDeadline);
    if (regDeadline > new Date(today)) {
        const regEventId = generateId();
        const regEvent: CalendarEvent = {
            id: regEventId,
            title: `📝 ${hackathon.name} - Registration Deadline`,
            type: 'hackathon',
            date: hackathon.registrationDeadline,
            priority: 'high',
            linkedHackathonId: hackathonId,
            description: `Registration deadline for ${hackathon.name}`,
        };
        addCalendarEvent(regEvent);
        eventIds.push(regEventId);
    }

    // Submission deadline
    const subEventId = generateId();
    const subEvent: CalendarEvent = {
        id: subEventId,
        title: `🚀 ${hackathon.name} - Submission Deadline`,
        type: 'hackathon',
        date: hackathon.submissionDeadline,
        priority: 'high',
        linkedHackathonId: hackathonId,
        description: `Final submission deadline for ${hackathon.name}`,
    };
    addCalendarEvent(subEvent);
    eventIds.push(subEventId);

    // Event start date
    const startEventId = generateId();
    const startEvent: CalendarEvent = {
        id: startEventId,
        title: `⚡ ${hackathon.name} - Event Start`,
        type: 'hackathon',
        date: hackathon.eventStartDate,
        endDate: hackathon.eventEndDate,
        priority: 'high',
        linkedHackathonId: hackathonId,
        description: `${hackathon.name} event from ${hackathon.eventStartDate} to ${hackathon.eventEndDate}`,
    };
    addCalendarEvent(startEvent);
    eventIds.push(startEventId);

    // Update hackathon with linked project and status
    updateHackathon(hackathonId, {
        status: 'applied',
        linkedProjectId: projectId,
    });

    return { projectId, taskIds, eventIds };
}

// =============================================
// HACKATHON SUBMISSION (Status Transition)
// Marks linked project as completed
// =============================================
export function submitHackathon(hackathonId: string): void {
    const hackathons = getHackathons();
    const hackathon = hackathons.find(h => h.id === hackathonId);

    if (!hackathon) return;

    // Update hackathon status
    updateHackathon(hackathonId, { status: 'submission' });

    // Mark linked project as completed
    if (hackathon.linkedProjectId) {
        updateProject(hackathon.linkedProjectId, {
            status: 'completed',
            progress: 100,
            lastActivity: getToday(),
        });
    }
}

// =============================================
// HACKATHON MISSED (Status Transition)
// Marks linked project as on-hold/stalled
// =============================================
export function markHackathonMissed(hackathonId: string): void {
    const hackathons = getHackathons();
    const hackathon = hackathons.find(h => h.id === hackathonId);

    if (!hackathon) return;

    // Update hackathon status
    updateHackathon(hackathonId, { status: 'not_selected' });

    // Mark linked project as on-hold
    if (hackathon.linkedProjectId) {
        updateProject(hackathon.linkedProjectId, {
            status: 'on-hold',
            lastActivity: getToday(),
        });
    }
}

// Hackathon Content Helpers
export function addHackathonNote(hackathonId: string, content: string): void {
    const hackathons = getHackathons();
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon) {
        if (!hackathon.notes) hackathon.notes = [];
        hackathon.notes.unshift({
            id: generateId(),
            content,
            createdAt: new Date().toISOString()
        });
        saveHackathons(hackathons);
    }
}

export function addHackathonLink(hackathonId: string, link: Omit<ProjectLink, 'id'>): void {
    const hackathons = getHackathons();
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon) {
        if (!hackathon.links) hackathon.links = [];
        hackathon.links.push({
            id: generateId(),
            ...link
        });
        saveHackathons(hackathons);
    }
}

export function deleteHackathonLink(hackathonId: string, linkId: string): void {
    const hackathons = getHackathons();
    const hackathon = hackathons.find(h => h.id === hackathonId);
    if (hackathon) {
        if (hackathon.links) {
            hackathon.links = hackathon.links.filter(l => l.id !== linkId);
            saveHackathons(hackathons);
        }
    }
}

// =============================================
// INITIALIZATION WITH ACTUAL RRU TIMETABLE
// B.Tech (CS) Year-3, Semester-VI, Classroom H-003
// TIME-TABLE 2025-26 (Even) 05/01/2026 to 04/05/2026
// =============================================
export function initializeSampleData(): void {
    if (typeof window === 'undefined') return;

    if (localStorage.getItem(STORAGE_KEYS.initialized) === 'true') return;

    // =============================================
    // FACULTY DATA (From Timetable)
    // =============================================
    const faculty: Faculty[] = [
        { id: 'fac-np', name: 'Nitin Padaniya', title: 'Dr.', department: 'IT & Cyber Security' },
        { id: 'fac-vv', name: 'Vaishali Vadhvana', title: 'Ms.', department: 'IT & Cyber Security' },
        { id: 'fac-pr', name: 'Prakruti Parmar', title: 'Ms.', department: 'IT & Cyber Security' },
        { id: 'fac-rs', name: 'Richa Sharma', title: 'Ms.', department: 'IT & Cyber Security' },
    ];
    saveFaculty(faculty);

    // =============================================
    // SUBJECTS DATA (From Timetable Legend)
    // =============================================
    const subjects: Subject[] = [
        // Lectures (4 core subjects - SS and DS are optional, not taken)
        { id: 'sub-iot', name: 'Internet of Things', code: 'G6AD27IOT', type: 'lecture', defaultFacultyId: 'fac-np' },
        { id: 'sub-lt', name: 'Language Translators', code: 'G6A28LNT', type: 'lecture', defaultFacultyId: 'fac-vv' },
        { id: 'sub-wsva', name: 'Web Security & Vulnerability Assessment', code: 'G6B30WSV', type: 'lecture', defaultFacultyId: 'fac-pr' },
        { id: 'sub-isms', name: 'Information Security Management Systems', code: 'G6B33ISM', type: 'lecture', defaultFacultyId: 'fac-rs' },

        // Labs
        { id: 'sub-iot-lab', name: 'IoT Lab', code: 'G6AD27IOT-L', type: 'lab', defaultFacultyId: 'fac-np' },
        { id: 'sub-lt-lab', name: 'Language Translators Lab', code: 'G6A28LNT-L', type: 'lab', defaultFacultyId: 'fac-vv' },
        { id: 'sub-wsva-lab', name: 'WAPT Lab (Digital Forensics)', code: 'G6B30WSV-L', type: 'lab', defaultFacultyId: 'fac-pr' },
        { id: 'sub-isms-lab', name: 'ISMS Lab (Digital Forensics)', code: 'G6B33ISM-L', type: 'lab', defaultFacultyId: 'fac-rs' },
    ];
    saveSubjects(subjects);

    // =============================================
    // TIMETABLE DATA (From User Cleaned Schedule)
    // Time Slots:
    // 1: 09:15-10:00, 2: 10:00-10:45, 3: 10:45-11:30
    // 4: 11:30-12:15, 5: 12:15-13:00
    // LUNCH: 13:00-14:00
    // 6: 14:00-14:45, 7: 14:45-15:30, 8: 15:30-16:15, 9: 16:15-17:00
    // FRIDAY: No classes | SATURDAY/SUNDAY: Holiday
    // =============================================
    const timetable: TimetableEntry[] = [
        // ==================== MONDAY ====================
        // 10:00-10:45: WAPT (Lecture)
        { id: 'tt-mon-1', subjectId: 'sub-wsva', day: 'monday', startTime: '10:00', endTime: '10:45', room: 'H-003', facultyId: 'fac-pr' },
        // 10:45-11:30: LT (Lecture)
        { id: 'tt-mon-2', subjectId: 'sub-lt', day: 'monday', startTime: '10:45', endTime: '11:30', room: 'H-003', facultyId: 'fac-vv' },
        // 11:30-12:15: IoT (Lecture)
        { id: 'tt-mon-3', subjectId: 'sub-iot', day: 'monday', startTime: '11:30', endTime: '12:15', room: 'H-003', facultyId: 'fac-np' },
        // 14:00-14:45: WS&VA (Lecture)
        { id: 'tt-mon-4', subjectId: 'sub-wsva', day: 'monday', startTime: '14:00', endTime: '14:45', room: 'H-003', facultyId: 'fac-pr' },

        // ==================== TUESDAY ====================
        // 09:15-10:45: IoT Lab A (1.5 hrs)
        { id: 'tt-tue-1', subjectId: 'sub-iot-lab', day: 'tuesday', startTime: '09:15', endTime: '10:45', room: 'IoT Lab A', facultyId: 'fac-np' },
        // 11:30-12:15: ISMS (Lecture)
        { id: 'tt-tue-2', subjectId: 'sub-isms', day: 'tuesday', startTime: '11:30', endTime: '12:15', room: 'H-003', facultyId: 'fac-rs' },
        // 12:15-13:00: WAPT (Lecture)
        { id: 'tt-tue-3', subjectId: 'sub-wsva', day: 'tuesday', startTime: '12:15', endTime: '13:00', room: 'H-003', facultyId: 'fac-pr' },
        // 14:00-15:30: LT Practical (Lab - 1.5 hrs)
        { id: 'tt-tue-4', subjectId: 'sub-lt-lab', day: 'tuesday', startTime: '14:00', endTime: '15:30', room: 'H-003', facultyId: 'fac-vv' },

        // ==================== WEDNESDAY ====================
        // 09:15-10:00: IoT (Lecture)
        { id: 'tt-wed-1', subjectId: 'sub-iot', day: 'wednesday', startTime: '09:15', endTime: '10:00', room: 'H-003', facultyId: 'fac-np' },
        // 10:00-10:45: LT (Lecture)
        { id: 'tt-wed-2', subjectId: 'sub-lt', day: 'wednesday', startTime: '10:00', endTime: '10:45', room: 'H-003', facultyId: 'fac-vv' },
        // 10:45-11:30: WAPT (Lecture)
        { id: 'tt-wed-3', subjectId: 'sub-wsva', day: 'wednesday', startTime: '10:45', endTime: '11:30', room: 'H-003', facultyId: 'fac-pr' },
        // 11:30-12:15: ISMS (Lecture)
        { id: 'tt-wed-4', subjectId: 'sub-isms', day: 'wednesday', startTime: '11:30', endTime: '12:15', room: 'H-003', facultyId: 'fac-rs' },
        // 15:30-17:00: ISMS Lab (1.5 hrs)
        { id: 'tt-wed-5', subjectId: 'sub-isms-lab', day: 'wednesday', startTime: '15:30', endTime: '17:00', room: 'AI Lab', facultyId: 'fac-rs' },

        // ==================== THURSDAY ====================
        // 09:15-10:45: IoT Lab (1.5 hrs)
        { id: 'tt-thu-1', subjectId: 'sub-iot-lab', day: 'thursday', startTime: '09:15', endTime: '10:45', room: 'IoT Lab', facultyId: 'fac-np' },
        // 10:45-11:30: LT (Lecture)
        { id: 'tt-thu-2', subjectId: 'sub-lt', day: 'thursday', startTime: '10:45', endTime: '11:30', room: 'H-003', facultyId: 'fac-vv' },
        // 11:30-12:15: IoT (Lecture)
        { id: 'tt-thu-3', subjectId: 'sub-iot', day: 'thursday', startTime: '11:30', endTime: '12:15', room: 'H-003', facultyId: 'fac-np' },
        // 12:15-13:00: ISMS (Lecture)
        { id: 'tt-thu-4', subjectId: 'sub-isms', day: 'thursday', startTime: '12:15', endTime: '13:00', room: 'H-003', facultyId: 'fac-rs' },

        // ==================== FRIDAY ====================
        // No classes on Friday
        // ==================== SATURDAY/SUNDAY ====================
        // Holiday
    ];
    saveTimetable(timetable);

    // =============================================
    // EMPTY CLASS INSTANCES
    // =============================================
    saveClassInstances([]);

    // =============================================
    // SAMPLE PROJECTS
    // =============================================
    const today = getToday();
    const projects: Project[] = [
        {
            id: 'proj-1',
            name: 'Semester Project',
            description: 'B.Tech CS Year-3 Semester-VI Project Work',
            domain: 'college',
            stage: 'planning',
            status: 'active',
            priority: 'high',
            progress: 25,
            deadline: '2026-04-15',
            links: [],
            notes: [],
            linkedTasks: [],
            lastActivity: today,
            createdAt: '2026-01-05',
        },
        {
            id: 'proj-2',
            name: 'Digital Forensics Case Study',
            description: 'WAPT/SS and ISMS course project',
            domain: 'college',
            stage: 'planning',
            status: 'planning',
            priority: 'medium',
            progress: 25,
            deadline: '2026-03-20',
            links: [],
            notes: [],
            linkedTasks: [],
            lastActivity: '2026-01-20',
            createdAt: '2026-01-15',
        },
    ];
    saveProjects(projects);

    // =============================================
    // Sample Tasks
    if (!getTasks().length) {
        const projects = getProjects();
        const hackathons = getHackathons();
        const project1 = projects[0];
        const hackathon1 = hackathons[0];

        if (project1 && hackathon1) {
            const sampleTasks: Task[] = [
                {
                    id: generateId(),
                    title: 'Review System Architecture',
                    description: 'Analyze current monolith vs microservices trade-offs',
                    status: 'done',
                    priority: 'high',
                    dueDate: '2024-02-01',
                    contextType: 'project',
                    contextId: project1.id,
                    createdAt: getToday(),
                    completedAt: getToday()
                },
                {
                    id: generateId(),
                    title: 'Implement Task Graph',
                    description: 'Create bidirectional linking between tasks and projects',
                    status: 'in-progress',
                    priority: 'high',
                    dueDate: '2024-02-05',
                    contextType: 'project',
                    contextId: project1.id,
                    createdAt: getToday()
                },
                {
                    id: generateId(),
                    title: 'Submit Hackathon Proposal',
                    description: 'Draft abstract and submit via portal',
                    status: 'pending',
                    priority: 'medium',
                    dueDate: '2024-02-10',
                    contextType: 'hackathon',
                    contextId: hackathon1.id,
                    createdAt: getToday()
                }
            ];

            sampleTasks.forEach(task => addTask(task));

            // Register for hackathon (triggering auto-tasks)
            try {
                registerForHackathon(hackathon1.id);
            } catch (e) { console.error(e); }
        }
    }


    // CALENDAR EVENTS
    // =============================================
    const events: CalendarEvent[] = [
        {
            id: 'evt-1',
            title: 'Mid-Semester Examination',
            type: 'academic',
            date: '2026-02-20',
            priority: 'high',
        },
        {
            id: 'evt-2',
            title: 'Semester End: 04/05/2026',
            type: 'academic',
            date: '2026-05-04',
            priority: 'high',
        },
        {
            id: 'evt-3',
            title: 'Project Submission',
            type: 'project',
            date: '2026-04-15',
            priority: 'high',
            linkedTaskId: 'proj-1',
        },
        {
            id: 'evt-4',
            title: 'Digital Forensics Case Study Due',
            type: 'project',
            date: '2026-03-20',
            priority: 'medium',
            linkedTaskId: 'proj-2',
        },
    ];
    saveCalendarEvents(events);

    localStorage.setItem(STORAGE_KEYS.initialized, 'true');
}

// =============================================
// CLEAR ALL DATA
// =============================================
export function clearAllData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
    });
}
