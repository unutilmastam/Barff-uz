import { type Metadata } from 'next';
import { JobList } from '@/components/JobList';

export const metadata: Metadata = { title: 'Bugungi ish' };

export default function HomePage() {
  return <JobList />;
}
