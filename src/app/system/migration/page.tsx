'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { importLegacyData } from '@/server/migration/actions';
import { UploadCloud, CheckCircle, AlertTriangle } from 'lucide-react';

export default function MigrationPage() {
    const [status, setStatus] = useState<'idle' | 'scanning' | 'migrating' | 'success' | 'error'>('idle');
    const [stats, setStats] = useState({ projects: 0, tasks: 0, hackathons: 0 });
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        // Scan Local Storage
        setStatus('scanning');
        if (typeof window !== 'undefined') {
            const p = JSON.parse(localStorage.getItem('nexus_projects') || '[]');
            const t = JSON.parse(localStorage.getItem('nexus_tasks') || '[]');
            const h = JSON.parse(localStorage.getItem('nexus_hackathons') || '[]');
            setStats({ projects: p.length, tasks: t.length, hackathons: h.length });
            setStatus('idle');
        }
    }, []);

    const handleMigration = async () => {
        try {
            setStatus('migrating');
            setLogs(prev => [...prev, 'Reading Local Storage...']);

            const projects = JSON.parse(localStorage.getItem('nexus_projects') || '[]');
            const tasks = JSON.parse(localStorage.getItem('nexus_tasks') || '[]');
            const hackathons = JSON.parse(localStorage.getItem('nexus_hackathons') || '[]');

            setLogs(prev => [...prev, `Found: ${projects.length} Projects, ${tasks.length} Tasks, ${hackathons.length} Hackathons`]);
            setLogs(prev => [...prev, 'Sending to Server...']);

            const result = await importLegacyData({ projects, tasks, hackathons });

            setLogs(prev => [...prev, `Migration Result: Imported ${result.pCount} Projects, ${result.hCount} Hackathons, ${result.tCount} Tasks`]);
            setLogs(prev => [...prev, 'SUCCESS! Database is now strictly consistent.']);
            setStatus('success');

        } catch (error: unknown) {
            console.error(error);
            setStatus('error');
            setLogs(prev => [...prev, `ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`]);
        }
    };

    return (
        <Layout title="System Migration" subtitle="Upgrade to Execution Graph Logic">
            <div className="max-w-2xl mx-auto py-12 space-y-8">

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0" />
                    <div className="space-y-2">
                        <h3 className="font-bold text-amber-900">Backend Migration Required</h3>
                        <p className="text-sm text-amber-800">
                            We are moving from browser-based storage to a strict SQLite Backend.
                            This process will copy your local data into the database.
                            <br /><br />
                            <strong>No data will be deleted from your browser during this step.</strong>
                        </p>
                    </div>
                </div>

                <Card>
                    <CardContent className="space-y-6 pt-6">
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="p-4 bg-slate-50 rounded border">
                                <div className="text-2xl font-bold">{stats.projects}</div>
                                <div className="text-xs uppercase text-slate-500">Projects</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded border">
                                <div className="text-2xl font-bold">{stats.hackathons}</div>
                                <div className="text-xs uppercase text-slate-500">Hackathons</div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded border">
                                <div className="text-2xl font-bold">{stats.tasks}</div>
                                <div className="text-xs uppercase text-slate-500">Tasks</div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {status === 'success' ? (
                                <div className="text-center space-y-4">
                                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                                    <h3 className="text-2xl font-bold text-green-600">Migration Complete</h3>
                                    <p className="text-slate-500">Your data is now safely in SQLite.</p>
                                    <Button onClick={() => window.location.href = '/'} className="w-full">
                                        Go to Dashboard
                                    </Button>
                                </div>
                            ) : (
                                <Button
                                    onClick={handleMigration}
                                    disabled={status === 'migrating' || stats.tasks === 0}
                                    className="w-full h-12 text-lg"
                                >
                                    {status === 'migrating' ? 'Migrating...' : 'Start Migration'}
                                    <UploadCloud className="ml-2 h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {logs.length > 0 && (
                    <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs space-y-1 h-64 overflow-y-auto">
                        {logs.map((log, i) => <div key={i}>&gt; {log}</div>)}
                    </div>
                )}
            </div>
        </Layout>
    );
}
