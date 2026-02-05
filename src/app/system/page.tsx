import { Layout } from '@/components/layout/Layout';
import { getSystemStats } from '@/server/container/systemActions';
import SystemClient from './SystemClient';

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic';

export default async function SystemPage() {
    const stats = await getSystemStats();

    return (
        <Layout title="System" subtitle="System status and data management">
            <SystemClient initialStats={stats} />
        </Layout>
    );
}
