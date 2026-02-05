import { Layout } from '@/components/layout/Layout';
import { getApplications } from '@/server/container/applicationActions';
import ApplicationsClient from './ApplicationsClient';

export const dynamic = 'force-dynamic';

export default async function ApplicationsPage() {
    const applications = await getApplications();

    return (
        <Layout title="Applications" subtitle="Track internship and placement applications">
            <ApplicationsClient applications={applications} />
        </Layout>
    );
}
