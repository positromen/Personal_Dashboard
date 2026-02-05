import { z } from 'zod';

// =============================================
// ENUMS
// =============================================
export const TaskStateEnum = z.enum(['pending', 'in_progress', 'blocked', 'completed', 'cancelled']);
export const TaskPriorityEnum = z.enum(['low', 'medium', 'high']);
export const ProjectStageEnum = z.enum(['planning', 'building', 'testing', 'finalizing', 'completed']);
export const HackathonModeEnum = z.enum(['online', 'offline', 'hybrid']);
export const HackathonStatusEnum = z.enum(['upcoming', 'registered', 'in_progress', 'submitted', 'completed', 'missed']);

// =============================================
// TASK SCHEMAS
// =============================================
export const CreateTaskSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    priority: TaskPriorityEnum.default('medium'),
    state: TaskStateEnum.optional(),
    dueDate: z.string().optional(), // ISO String

    // Strict Context (One of these must be present usually, but validated by logic or discriminated union)
    // We allow optional here and validate logic in Server Action
    projectId: z.string().optional(),
    hackathonId: z.string().optional(),
}).refine(() => {
    // Standalone is allowed (Task.contextType = 'standalone' in old model), 
    // but strict model says "parent_type".
    // If we want strict context, we can enforce it.
    // User speicified "Standalone (rare, personal only)".
    // So both undefined is valid.
    // Logic handled in Server Action
    return true;
});

export const UpdateTaskSchema = z.object({
    id: z.string(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    state: TaskStateEnum.optional(),
    priority: TaskPriorityEnum.optional(),
    dueDate: z.string().optional().nullable(),
});

// =============================================
// PROJECT SCHEMAS
// =============================================
export const CreateProjectSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    domain: z.enum(['college', 'personal', 'hackathon']).default('personal'),
    deadline: z.string().optional(),
});

export const UpdateProjectSchema = z.object({
    id: z.string(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    stage: ProjectStageEnum.optional(),
    deadline: z.string().optional().nullable(),
});

// =============================================
// HACKATHON SCHEMAS
// =============================================
export const CreateHackathonSchema = z.object({
    name: z.string().min(1),
    organizer: z.string().optional(),
    mode: HackathonModeEnum,
    theme: z.string().optional(),
    teamSize: z.number().min(1).default(1),
    registrationDeadline: z.string().optional(),
    submissionDeadline: z.string().optional(),
    eventStartDate: z.string().optional(),
    eventEndDate: z.string().optional(),
    projectTitle: z.string().optional(),
    projectDescription: z.string().optional(),
    registrationLink: z.string().optional(),
    submissionPortal: z.string().optional(),
    discordSlack: z.string().optional(),
});
