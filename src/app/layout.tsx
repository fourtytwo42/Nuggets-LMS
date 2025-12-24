import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Microlearning LMS',
  description: 'Zero-human-authoring adaptive microlearning platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
