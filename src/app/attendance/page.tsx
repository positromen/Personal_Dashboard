// NEXUS Attendance Page - Server Component
// Fetches initial data and renders AttendanceClient

import { getToday } from '@/lib/utils';
import {
    getClassInstancesForDate,
    getSubjectAttendanceStats,
    getOverallAttendanceStats,
    getRecommendations,
    getFaculty,
    getSubjects,
} from '@/server/attendance/queries';
import { generateClassInstancesForDate } from '@/server/attendance/actions';
import AttendanceClient from './AttendanceClient';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
    const today = getToday();

    // Generate class instances for today (idempotent)
    await generateClassInstancesForDate(today);

    // Fetch all initial data
    const [instances, subjectStats, overallStats, recommendations, faculty, subjects] = await Promise.all([
        getClassInstancesForDate(today),
        getSubjectAttendanceStats(),
        getOverallAttendanceStats(),
        getRecommendations(),
        getFaculty(),
        getSubjects(),
    ]);

    const facultyList = faculty.map(f => ({
        id: f.id,
        name: f.name,
        title: f.title,
    }));

    const subjectList = subjects.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code,
        type: s.type,
        defaultFacultyId: s.defaultFacultyId,
    }));

    return (
        <AttendanceClient
            initialDate={today}
            initialInstances={instances}
            initialSubjectStats={subjectStats}
            initialOverallStats={overallStats}
            initialRecommendations={recommendations}
            facultyList={facultyList}
            subjectList={subjectList}
        />
    );
}
