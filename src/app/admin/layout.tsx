import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Console - AI Microlearning LMS',
  description: 'Administration interface',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
