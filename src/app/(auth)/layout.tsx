import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Authentication - AI Microlearning LMS',
  description: 'Login and registration',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
