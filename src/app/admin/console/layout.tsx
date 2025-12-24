'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminConsoleLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/admin/console') {
      return pathname === '/admin/console';
    }
    return pathname.startsWith(path);
  };

  const getTabClass = (path: string) => {
    const active = isActive(path);
    return `py-4 px-2 border-b-2 ${
      active
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-600 hover:text-gray-900'
    }`;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <Link href="/admin/console" className={getTabClass('/admin/console')}>
              Overview
            </Link>
            <Link
              href="/admin/console/ingestion"
              className={getTabClass('/admin/console/ingestion')}
            >
              Content Ingestion
            </Link>
            <Link href="/admin/console/nuggets" className={getTabClass('/admin/console/nuggets')}>
              Nugget Store
            </Link>
            <Link href="/admin/console/settings" className={getTabClass('/admin/console/settings')}>
              Settings
            </Link>
            <Link
              href="/admin/console/analytics"
              className={getTabClass('/admin/console/analytics')}
            >
              Analytics
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      {children}
    </div>
  );
}
