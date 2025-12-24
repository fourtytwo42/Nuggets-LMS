import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learner - AI Microlearning LMS',
  description: 'Learning interface',
};

export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
