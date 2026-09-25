import { type Metadata } from 'next';
import { JobDetail } from '@/components/JobDetail';

export const metadata: Metadata = { title: 'Yetkazma' };

export default async function DeliveryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <JobDetail id={id} />;
}
