'use client';

// NEXUS Attendance Module - Client Component
// Uses Server Actions for all data operations
// Light theme to match dashboard

import { useState, useCallback, useTransition } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconBox } from '@/components/ui/IconBox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    BookOpen,
    FlaskConical,
    Clock,
    User,
    Check,
    X,
    Ban,
    Briefcase,
    RefreshCw,
    AlertTriangle,
    TrendingDown,
} from 'lucide-react';
import {
    generateClassInstancesForDate,
    markAttendance,
    type AttendanceStatus,
    type ReasonType,
} from '@/server/attendance/actions';
import {
    getClassInstancesForDate,
    getSubjectAttendanceStats,
    getOverallAttendanceStats,
    getRecommendations,
    type SubjectAttendanceStats,
    type OverallAttendanceStats,
    type ClassInstanceWithRelations,
    type RiskState,
    type SubjectRecommendation,
} from '@/server/attendance/queries';
import { cn, formatDate } from '@/lib/utils';

// =============================================
// TYPES
// =============================================
interface AttendanceModalState {
    isOpen: boolean;
    classInstance: ClassInstanceWithRelations | null;
    selectedStatus: AttendanceStatus | null;
    notes: string;
    reasonType: ReasonType | null;
    reasonDescription: string;
    actualFacultyId: string;
    actualSubjectId: string; // For subject exchange
}

interface FacultyOption {
    id: string;
    name: string;
    title: string;
}

interface SubjectOption {
    id: string;
    name: string;
    code: string;
    type: string;
    defaultFacultyId: string; // Auto-populate faculty when subject changes
}

// =============================================
// PROPS
// =============================================
interface AttendanceClientProps {
    initialDate: string;
    initialInstances: ClassInstanceWithRelations[];
    initialSubjectStats: SubjectAttendanceStats[];
    initialOverallStats: OverallAttendanceStats;
    initialRecommendations: SubjectRecommendation[];
    facultyList: FacultyOption[];
    subjectList: SubjectOption[]; // For subject exchange
}

// =============================================
// RISK STATE HELPERS (Light Theme)
// =============================================
function getRiskColor(state: RiskState): string {
    switch (state) {
        case 'SAFE': return 'text-green-600';
        case 'BORDERLINE': return 'text-amber-600';
        case 'CRITICAL': return 'text-red-600';
        default: return 'text-slate-500';
    }
}

function getRiskBgColor(state: RiskState): string {
    switch (state) {
        case 'SAFE': return 'bg-green-50 border-green-200';
        case 'BORDERLINE': return 'bg-amber-50 border-amber-200';
        case 'CRITICAL': return 'bg-red-50 border-red-200';
        default: return 'bg-slate-50 border-slate-200';
    }
}

function getStatusLabel(status: string): string {
    switch (status) {
        case 'SCHEDULED': return 'Pending';
        case 'ATTENDED': return 'Present';
        case 'MISSED': return 'Absent';
        case 'CANCELLED': return 'Cancelled';
        case 'OTHER_ACTIVITY': return 'Other';
        default: return status;
    }
}

function getStatusVariant(status: string): "success" | "error" | "warning" | "info" | "neutral" {
    switch (status) {
        case 'ATTENDED': return 'success';
        case 'MISSED': return 'error';
        case 'CANCELLED': return 'neutral';
        case 'OTHER_ACTIVITY': return 'info';
        default: return 'warning';
    }
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function AttendanceClient({
    initialDate,
    initialInstances,
    initialSubjectStats,
    initialOverallStats,
    initialRecommendations,
    facultyList,
    subjectList,
}: AttendanceClientProps) {
    const [currentDate, setCurrentDate] = useState(initialDate);
    const [todaysClasses, setTodaysClasses] = useState<ClassInstanceWithRelations[]>(initialInstances);
    const [subjectStats, setSubjectStats] = useState<SubjectAttendanceStats[]>(initialSubjectStats);
    const [overallStats, setOverallStats] = useState<OverallAttendanceStats>(initialOverallStats);
    const [recommendations, setRecommendations] = useState<SubjectRecommendation[]>(initialRecommendations);
    const [isPending, startTransition] = useTransition();

    // Modal state
    const [modal, setModal] = useState<AttendanceModalState>({
        isOpen: false,
        classInstance: null,
        selectedStatus: null,
        notes: '',
        reasonType: null,
        reasonDescription: '',
        actualFacultyId: '',
        actualSubjectId: '',
    });

    // Refresh data when date changes
    const refreshData = useCallback(async (date: string) => {
        await generateClassInstancesForDate(date);
        const [instances, stats, overall, recs] = await Promise.all([
            getClassInstancesForDate(date),
            getSubjectAttendanceStats(),
            getOverallAttendanceStats(),
            getRecommendations(),
        ]);
        setTodaysClasses(instances);
        setSubjectStats(stats);
        setOverallStats(overall);
        setRecommendations(recs);
    }, []);

    // Navigate dates
    const navigateDate = (delta: number) => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + delta);
        const newDate = date.toISOString().split('T')[0];
        setCurrentDate(newDate);
        startTransition(() => {
            refreshData(newDate);
        });
    };

    // Get day name
    const getDayName = (dateStr: string) => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[new Date(dateStr).getDay()];
    };

    // Open modal for attendance marking
    const openAttendanceModal = (classInstance: ClassInstanceWithRelations) => {
        setModal({
            isOpen: true,
            classInstance,
            selectedStatus: classInstance.status as AttendanceStatus,
            notes: classInstance.notes || '',
            reasonType: classInstance.attendanceReason?.reasonType as ReasonType || null,
            reasonDescription: classInstance.attendanceReason?.description || '',
            actualFacultyId: classInstance.actualFacultyId || classInstance.scheduledFacultyId,
            actualSubjectId: (classInstance as ClassInstanceWithRelations & { actualSubjectId?: string }).actualSubjectId || classInstance.subjectId,
        });
    };

    // Close modal
    const closeModal = () => {
        setModal({
            isOpen: false,
            classInstance: null,
            selectedStatus: null,
            notes: '',
            reasonType: null,
            reasonDescription: '',
            actualFacultyId: '',
            actualSubjectId: '',
        });
    };

    // Submit attendance
    const submitAttendance = async () => {
        if (!modal.classInstance || !modal.selectedStatus) return;

        if (modal.selectedStatus === 'MISSED' && !modal.reasonType) {
            alert('Please select a reason for missing this class');
            return;
        }

        await markAttendance(modal.classInstance.id, modal.selectedStatus, {
            notes: modal.notes || undefined,
            actualFacultyId: modal.actualFacultyId !== modal.classInstance.scheduledFacultyId ? modal.actualFacultyId : undefined,
            actualSubjectId: modal.actualSubjectId !== modal.classInstance.subjectId ? modal.actualSubjectId : undefined,
            reasonType: modal.selectedStatus === 'MISSED' ? modal.reasonType! : undefined,
            reasonDescription: modal.selectedStatus === 'MISSED' ? modal.reasonDescription : undefined,
        });

        closeModal();
        startTransition(() => {
            refreshData(currentDate);
        });
    };

    // Quick mark attendance
    const quickMark = async (classInstance: ClassInstanceWithRelations, status: AttendanceStatus) => {
        if (status === 'MISSED') {
            openAttendanceModal(classInstance);
            setModal(prev => ({ ...prev, selectedStatus: status }));
            return;
        }

        await markAttendance(classInstance.id, status, {});
        startTransition(() => {
            refreshData(currentDate);
        });
    };

    // Separate stats by type
    const lectureStats = subjectStats.filter(s => s.type === 'LECTURE');
    const labStats = subjectStats.filter(s => s.type === 'LAB');

    return (
        <Layout title="Attendance" subtitle="Event-based attendance accounting">
            <div className="space-y-6">
                {/* Overall Stats Card */}
                <div className="flex justify-end">
                    <div className={cn(
                        "px-6 py-4 rounded-lg border",
                        getRiskBgColor(overallStats.overallRiskState)
                    )}>
                        <p className="text-sm text-slate-500">Overall Attendance</p>
                        <p className={cn("text-3xl font-bold", getRiskColor(overallStats.overallRiskState))}>
                            {overallStats.combinedPercentage}%
                        </p>
                    </div>
                </div>

                {/* Date Navigation */}
                <Card>
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <Button variant="ghost" onClick={() => navigateDate(-1)} disabled={isPending}>
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    <span className="text-lg font-semibold text-slate-800">{formatDate(currentDate)}</span>
                                </div>
                                <p className="text-sm text-slate-500">{getDayName(currentDate)}</p>
                            </div>
                            <Button variant="ghost" onClick={() => navigateDate(1)} disabled={isPending}>
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Today's Classes */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <IconBox icon={Clock} />
                            <div>
                                <CardTitle>Day&apos;s Schedule</CardTitle>
                                <CardDescription>
                                    {todaysClasses.length === 0 ? 'No classes scheduled' : `${todaysClasses.length} classes`}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {isPending && (
                            <div className="flex items-center justify-center py-8">
                                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                            </div>
                        )}
                        {!isPending && todaysClasses.length === 0 && (
                            <p className="text-sm text-slate-500 text-center py-8">
                                No classes on {getDayName(currentDate)}
                            </p>
                        )}
                        {!isPending && todaysClasses.length > 0 && (
                            <div className="space-y-3">
                                {todaysClasses.map(instance => (
                                    <div
                                        key={instance.id}
                                        className="flex items-center justify-between p-4 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <IconBox
                                                icon={instance.type === 'LAB' ? FlaskConical : BookOpen}
                                                className={instance.type === 'LAB' ? 'bg-amber-100' : 'bg-blue-100'}
                                                iconClassName={instance.type === 'LAB' ? 'text-amber-600' : 'text-blue-600'}
                                            />
                                            <div>
                                                <p className="font-medium text-slate-800">{instance.subject.name}</p>
                                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                                    <Clock className="w-3 h-3" />
                                                    {instance.startTime} - {instance.endTime}
                                                    <span className="mx-1">•</span>
                                                    <User className="w-3 h-3" />
                                                    {instance.actualFaculty
                                                        ? `${instance.actualFaculty.title} ${instance.actualFaculty.name}`
                                                        : `${instance.scheduledFaculty.title} ${instance.scheduledFaculty.name}`
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <StatusBadge variant={getStatusVariant(instance.status)}>
                                                {getStatusLabel(instance.status)}
                                            </StatusBadge>
                                            {instance.status === 'SCHEDULED' && (
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => quickMark(instance, 'ATTENDED')}
                                                        className="p-2 rounded hover:bg-green-100 text-green-600"
                                                        title="Mark as attended"
                                                    >
                                                        <Check className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => quickMark(instance, 'MISSED')}
                                                        className="p-2 rounded hover:bg-red-100 text-red-600"
                                                        title="Mark as missed"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => quickMark(instance, 'CANCELLED')}
                                                        className="p-2 rounded hover:bg-slate-200 text-slate-600"
                                                        title="Mark as cancelled"
                                                    >
                                                        <Ban className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                            <Button size="sm" variant="secondary" onClick={() => openAttendanceModal(instance)}>
                                                Edit
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Lecture Attendance Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <IconBox icon={BookOpen} />
                            <div>
                                <CardTitle>Lecture Attendance</CardTitle>
                                <CardDescription>
                                    {overallStats.lecturesAttended}/{overallStats.lecturesConducted} attended ({overallStats.lecturePercentage}%)
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Subject</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Code</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Faculty</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Attended</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Missed</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Cancelled</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">%</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Status</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Recommendation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lectureStats.map(stat => {
                                        const rec = recommendations.find(r => r.subjectId === stat.subjectId);
                                        return (
                                            <tr key={stat.subjectId} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-3 px-4 text-sm font-medium text-slate-800">{stat.subjectName}</td>
                                                <td className="py-3 px-4 text-sm text-slate-500 font-mono">{stat.subjectCode}</td>
                                                <td className="py-3 px-4 text-sm text-slate-600">{stat.facultyName}</td>
                                                <td className="py-3 px-4 text-center text-sm text-green-600 font-medium">{stat.attended}</td>
                                                <td className="py-3 px-4 text-center text-sm text-red-600 font-medium">{stat.missed}</td>
                                                <td className="py-3 px-4 text-center text-sm text-slate-500">{stat.cancelled}</td>
                                                <td className={cn("py-3 px-4 text-center text-sm font-bold", getRiskColor(stat.riskState))}>
                                                    {stat.attendancePercentage}%
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <StatusBadge variant={
                                                        stat.riskState === 'SAFE' ? 'success' :
                                                            stat.riskState === 'BORDERLINE' ? 'warning' : 'error'
                                                    }>
                                                        {stat.riskState}
                                                    </StatusBadge>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-slate-600">{rec?.recommendation || '-'}</td>
                                            </tr>
                                        );
                                    })}
                                    {lectureStats.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-sm text-slate-500">
                                                No lecture data yet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Lab Attendance Table */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <IconBox icon={FlaskConical} className="bg-amber-100" iconClassName="text-amber-600" />
                            <div>
                                <CardTitle>Lab Attendance <span className="text-sm font-normal text-slate-500">(Weight: 2×)</span></CardTitle>
                                <CardDescription>
                                    {overallStats.labsAttended}/{overallStats.labsConducted} attended ({overallStats.labPercentage}%)
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Subject</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Code</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Faculty</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Attended</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Missed</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Cancelled</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">%</th>
                                        <th className="text-center py-3 px-4 text-sm font-medium text-slate-600">Status</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-slate-600">Recommendation</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {labStats.map(stat => {
                                        const rec = recommendations.find(r => r.subjectId === stat.subjectId);
                                        return (
                                            <tr key={stat.subjectId} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="py-3 px-4 text-sm font-medium text-slate-800">{stat.subjectName}</td>
                                                <td className="py-3 px-4 text-sm text-slate-500 font-mono">{stat.subjectCode}</td>
                                                <td className="py-3 px-4 text-sm text-slate-600">{stat.facultyName}</td>
                                                <td className="py-3 px-4 text-center text-sm text-green-600 font-medium">{stat.attended}</td>
                                                <td className="py-3 px-4 text-center text-sm text-red-600 font-medium">{stat.missed}</td>
                                                <td className="py-3 px-4 text-center text-sm text-slate-500">{stat.cancelled}</td>
                                                <td className={cn("py-3 px-4 text-center text-sm font-bold", getRiskColor(stat.riskState))}>
                                                    {stat.attendancePercentage}%
                                                </td>
                                                <td className="py-3 px-4 text-center">
                                                    <StatusBadge variant={
                                                        stat.riskState === 'SAFE' ? 'success' :
                                                            stat.riskState === 'BORDERLINE' ? 'warning' : 'error'
                                                    }>
                                                        {stat.riskState}
                                                    </StatusBadge>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-slate-600">{rec?.recommendation || '-'}</td>
                                            </tr>
                                        );
                                    })}
                                    {labStats.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="py-8 text-center text-sm text-slate-500">
                                                No lab data yet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Critical Alerts */}
                {subjectStats.filter(s => s.riskState === 'CRITICAL').length > 0 && (
                    <Card className="border-red-200">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <IconBox icon={AlertTriangle} className="bg-red-100" iconClassName="text-red-600" />
                                <CardTitle className="text-red-700">Critical Attendance Alerts</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {subjectStats.filter(s => s.riskState === 'CRITICAL').map(stat => (
                                    <div key={stat.subjectId} className="flex items-center gap-3 p-3 rounded-lg bg-red-50">
                                        <TrendingDown className="w-5 h-5 text-red-600" />
                                        <span className="font-medium text-slate-800">{stat.subjectName}</span>
                                        <span className="text-red-600">({stat.attendancePercentage}%)</span>
                                        <span className="text-sm text-slate-500">- Must attend all upcoming classes</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Attendance Modal */}
                {modal.isOpen && modal.classInstance && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">Mark Attendance</h3>
                            <div className="mb-4">
                                <p className="text-lg font-medium text-slate-800">{modal.classInstance.subject.name}</p>
                                <p className="text-sm text-slate-500">
                                    {modal.classInstance.startTime} - {modal.classInstance.endTime}
                                </p>
                            </div>

                            {/* Status Selection */}
                            <div className="space-y-3 mb-6">
                                <label className="text-sm font-medium text-slate-600">Status</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'ATTENDED', label: 'Attended', icon: Check, color: 'green' },
                                        { value: 'MISSED', label: 'Missed', icon: X, color: 'red' },
                                        { value: 'CANCELLED', label: 'Cancelled', icon: Ban, color: 'slate' },
                                        { value: 'OTHER_ACTIVITY', label: 'Other Activity', icon: Briefcase, color: 'blue' },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setModal(prev => ({ ...prev, selectedStatus: opt.value as AttendanceStatus }))}
                                            className={cn(
                                                "flex items-center gap-2 p-3 rounded-lg border transition-colors text-sm",
                                                modal.selectedStatus === opt.value
                                                    ? opt.color === 'green' ? 'bg-green-50 border-green-300 text-green-700'
                                                        : opt.color === 'red' ? 'bg-red-50 border-red-300 text-red-700'
                                                            : opt.color === 'blue' ? 'bg-blue-50 border-blue-300 text-blue-700'
                                                                : 'bg-slate-100 border-slate-300 text-slate-700'
                                                    : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                            )}
                                        >
                                            <opt.icon className="w-4 h-4" />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Reason (required for MISSED) */}
                            {modal.selectedStatus === 'MISSED' && (
                                <div className="space-y-3 mb-6">
                                    <label className="text-sm font-medium text-slate-600">
                                        Reason <span className="text-red-500">*</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['SICK', 'EVENT', 'HACKATHON', 'PERSONAL', 'UNKNOWN'].map(reason => (
                                            <button
                                                key={reason}
                                                onClick={() => setModal(prev => ({ ...prev, reasonType: reason as ReasonType }))}
                                                className={cn(
                                                    "p-2 rounded-lg border text-sm transition-colors",
                                                    modal.reasonType === reason
                                                        ? "bg-red-50 border-red-300 text-red-700"
                                                        : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                                                )}
                                            >
                                                {reason}
                                            </button>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Additional details (optional)"
                                        value={modal.reasonDescription}
                                        onChange={(e) => setModal(prev => ({ ...prev, reasonDescription: e.target.value }))}
                                        className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            )}

                            {/* Subject Exchange */}
                            <div className="space-y-3 mb-6">
                                <label className="text-sm font-medium text-slate-600">Subject (if exchanged)</label>
                                <select
                                    value={modal.actualSubjectId}
                                    onChange={(e) => {
                                        const newSubjectId = e.target.value;
                                        // Auto-populate faculty based on selected subject
                                        const selectedSubject = subjectList.find(s => s.id === newSubjectId);
                                        setModal(prev => ({
                                            ...prev,
                                            actualSubjectId: newSubjectId,
                                            actualFacultyId: selectedSubject?.defaultFacultyId || prev.actualFacultyId
                                        }));
                                    }}
                                    className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {subjectList.map(sub => (
                                        <option key={sub.id} value={sub.id}>
                                            {sub.name} ({sub.code})
                                            {sub.id === modal.classInstance?.subjectId && ' (Scheduled)'}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400">Faculty will automatically update when you change the subject</p>
                            </div>

                            {/* Faculty Exchange */}
                            <div className="space-y-3 mb-6">
                                <label className="text-sm font-medium text-slate-600">Faculty (if exchanged)</label>
                                <select
                                    value={modal.actualFacultyId}
                                    onChange={(e) => setModal(prev => ({ ...prev, actualFacultyId: e.target.value }))}
                                    className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {facultyList.map(fac => (
                                        <option key={fac.id} value={fac.id}>
                                            {fac.title} {fac.name}
                                            {fac.id === modal.classInstance?.scheduledFacultyId && ' (Scheduled)'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Notes */}
                            <div className="space-y-3 mb-6">
                                <label className="text-sm font-medium text-slate-600">Notes</label>
                                <textarea
                                    value={modal.notes}
                                    onChange={(e) => setModal(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Optional notes..."
                                    rows={2}
                                    className="w-full p-3 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={closeModal} className="flex-1">
                                    Cancel
                                </Button>
                                <Button
                                    variant="primary"
                                    onClick={submitAttendance}
                                    className="flex-1"
                                    disabled={modal.selectedStatus === 'MISSED' && !modal.reasonType}
                                >
                                    Save
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
