import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================
// RRU B.Tech CS Year-3 Semester-VI Timetable
// TIME-TABLE 2025-26 (Even) 05/01/2026 to 04/05/2026
// =============================================

async function main() {
    console.log('🌱 Starting seed...');

    // =============================================
    // FACULTY
    // =============================================
    const facultyData = [
        { id: 'fac-np', name: 'Nitin Padaniya', title: 'Dr.', department: 'IT & Cyber Security' },
        { id: 'fac-vv', name: 'Vaishali Vadhvana', title: 'Ms.', department: 'IT & Cyber Security' },
        { id: 'fac-pr', name: 'Prakruti Parmar', title: 'Ms.', department: 'IT & Cyber Security' },
        { id: 'fac-rs', name: 'Richa Sharma', title: 'Ms.', department: 'IT & Cyber Security' },
    ];

    console.log('📚 Creating faculty...');
    for (const fac of facultyData) {
        await prisma.faculty.upsert({
            where: { id: fac.id },
            update: fac,
            create: fac,
        });
    }
    console.log(`  ✓ ${facultyData.length} faculty members created`);

    // =============================================
    // SUBJECTS
    // =============================================
    const subjectsData = [
        // Lectures (weight = 1)
        { id: 'sub-iot', name: 'Internet of Things', code: 'G6AD27IOT', type: 'LECTURE', weight: 1, defaultFacultyId: 'fac-np' },
        { id: 'sub-lt', name: 'Language Translators', code: 'G6A28LNT', type: 'LECTURE', weight: 1, defaultFacultyId: 'fac-vv' },
        { id: 'sub-wsva', name: 'Web Security & Vulnerability Assessment', code: 'G6B30WSV', type: 'LECTURE', weight: 1, defaultFacultyId: 'fac-pr' },
        { id: 'sub-isms', name: 'Information Security Management Systems', code: 'G6B33ISM', type: 'LECTURE', weight: 1, defaultFacultyId: 'fac-rs' },

        // Labs (weight = 2)
        { id: 'sub-iot-lab', name: 'IoT Lab', code: 'G6AD27IOT-L', type: 'LAB', weight: 2, defaultFacultyId: 'fac-np' },
        { id: 'sub-lt-lab', name: 'Language Translators Lab', code: 'G6A28LNT-L', type: 'LAB', weight: 2, defaultFacultyId: 'fac-vv' },
        { id: 'sub-wsva-lab', name: 'WAPT Lab (Digital Forensics)', code: 'G6B30WSV-L', type: 'LAB', weight: 2, defaultFacultyId: 'fac-pr' },
        { id: 'sub-isms-lab', name: 'ISMS Lab (Digital Forensics)', code: 'G6B33ISM-L', type: 'LAB', weight: 2, defaultFacultyId: 'fac-rs' },
    ];

    console.log('📖 Creating subjects...');
    for (const sub of subjectsData) {
        await prisma.subject.upsert({
            where: { id: sub.id },
            update: sub,
            create: sub,
        });
    }
    console.log(`  ✓ ${subjectsData.length} subjects created`);

    // =============================================
    // TIMETABLE SLOTS
    // Time Slots:
    // 1: 09:15-10:00, 2: 10:00-10:45, 3: 10:45-11:30
    // 4: 11:30-12:15, 5: 12:15-13:00
    // LUNCH: 13:00-14:00
    // 6: 14:00-14:45, 7: 14:45-15:30, 8: 15:30-16:15, 9: 16:15-17:00
    // FRIDAY: No classes | SATURDAY/SUNDAY: Holiday
    // =============================================
    const timetableData = [
        // ==================== MONDAY ====================
        { id: 'tt-mon-1', subjectId: 'sub-wsva', dayOfWeek: 'monday', startTime: '10:00', endTime: '10:45', room: 'H-003' },
        { id: 'tt-mon-2', subjectId: 'sub-lt', dayOfWeek: 'monday', startTime: '10:45', endTime: '11:30', room: 'H-003' },
        { id: 'tt-mon-3', subjectId: 'sub-iot', dayOfWeek: 'monday', startTime: '11:30', endTime: '12:15', room: 'H-003' },
        { id: 'tt-mon-4', subjectId: 'sub-wsva', dayOfWeek: 'monday', startTime: '14:00', endTime: '14:45', room: 'H-003' },

        // ==================== TUESDAY ====================
        { id: 'tt-tue-1', subjectId: 'sub-iot-lab', dayOfWeek: 'tuesday', startTime: '09:15', endTime: '10:45', room: 'IoT Lab A' },
        { id: 'tt-tue-2', subjectId: 'sub-isms', dayOfWeek: 'tuesday', startTime: '11:30', endTime: '12:15', room: 'H-003' },
        { id: 'tt-tue-3', subjectId: 'sub-wsva', dayOfWeek: 'tuesday', startTime: '12:15', endTime: '13:00', room: 'H-003' },
        { id: 'tt-tue-4', subjectId: 'sub-lt-lab', dayOfWeek: 'tuesday', startTime: '14:00', endTime: '15:30', room: 'H-003' },

        // ==================== WEDNESDAY ====================
        { id: 'tt-wed-1', subjectId: 'sub-iot', dayOfWeek: 'wednesday', startTime: '09:15', endTime: '10:00', room: 'H-003' },
        { id: 'tt-wed-2', subjectId: 'sub-lt', dayOfWeek: 'wednesday', startTime: '10:00', endTime: '10:45', room: 'H-003' },
        { id: 'tt-wed-3', subjectId: 'sub-wsva', dayOfWeek: 'wednesday', startTime: '10:45', endTime: '11:30', room: 'H-003' },
        { id: 'tt-wed-4', subjectId: 'sub-isms', dayOfWeek: 'wednesday', startTime: '11:30', endTime: '12:15', room: 'H-003' },
        { id: 'tt-wed-5', subjectId: 'sub-isms-lab', dayOfWeek: 'wednesday', startTime: '15:30', endTime: '17:00', room: 'AI Lab' },

        // ==================== THURSDAY ====================
        { id: 'tt-thu-1', subjectId: 'sub-iot-lab', dayOfWeek: 'thursday', startTime: '09:15', endTime: '10:45', room: 'IoT Lab' },
        { id: 'tt-thu-2', subjectId: 'sub-lt', dayOfWeek: 'thursday', startTime: '10:45', endTime: '11:30', room: 'H-003' },
        { id: 'tt-thu-3', subjectId: 'sub-iot', dayOfWeek: 'thursday', startTime: '11:30', endTime: '12:15', room: 'H-003' },
        { id: 'tt-thu-4', subjectId: 'sub-isms', dayOfWeek: 'thursday', startTime: '12:15', endTime: '13:00', room: 'H-003' },

        // Friday: No classes
        // Saturday/Sunday: Holiday
    ];

    console.log('📅 Creating timetable slots...');
    for (const slot of timetableData) {
        await prisma.timetableSlot.upsert({
            where: { id: slot.id },
            update: slot,
            create: slot,
        });
    }
    console.log(`  ✓ ${timetableData.length} timetable slots created`);

    console.log('✅ Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
