import { notFound } from 'next/navigation';
import { Layout } from '@/components/layout/Layout';
import { getApplication } from '@/server/container/applicationActions';
import ApplicationDetailClient from './ApplicationDetailClient';

export const dynamic = 'force-dynamic';

interface ApplicationDetailPageProps {
    params: Promise<{ id: string }>;
}

export default async function ApplicationDetailPage({ params }: ApplicationDetailPageProps) {
    const { id } = await params;
    const application = await getApplication(id);

    if (!application) {
        notFound();
    }

    return (
        <Layout title="Application Details" subtitle={`${application.companyName} - ${application.role}`}>
            <ApplicationDetailClient application={application} />
        </Layout>
    );
}
