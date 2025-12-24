import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learner - AI Microlearning LMS',
  description: 'Learning interface',
};

// Force dynamic rendering for learner routes
export const dynamic = 'force-dynamic';

export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
