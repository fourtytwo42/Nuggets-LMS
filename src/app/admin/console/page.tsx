'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import {
  AcademicCapIcon,
  FolderPlusIcon,
  LinkIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface DashboardData {
  summary: {
    totalNuggets: number;
    activeSessions: number;
    processingJobs: number;
  };
  recentActivity: {
    nuggets: Array<{
      id: string;
      content: string;
      status: string;
      createdAt: Date;
    }>;
    sessions: Array<{
      id: string;
      learnerName: string;
      learnerEmail: string;
      mode: string;
      startedAt: Date;
    }>;
    jobs: Array<{
      id: string;
      type: string;
      source: string;
      status: string;
      createdAt: Date;
      completedAt: Date | null;
      errorMessage: string | null;
    }>;
  };
  costOverview: {
    totalThisMonth: number;
    trend: string;
  };
}

export default function AdminConsolePage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  useEffect(() => {
    fetchDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
      case 'completed':
        return 'text-green-600';
      case 'processing':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

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
            <Link
              href="/admin/console"
              className="py-4 px-2 border-b-2 border-blue-600 text-blue-600"
            >
              Overview
            </Link>
            <Link
              href="/admin/console/ingestion"
              className="py-4 px-2 border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            >
              Content Ingestion
            </Link>
            <Link
              href="/admin/console/nuggets"
              className="py-4 px-2 border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            >
              Nugget Store
            </Link>
            <Link
              href="/admin/console/settings"
              className="py-4 px-2 border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            >
              Settings
            </Link>
            <Link
              href="/admin/console/analytics"
              className="py-4 px-2 border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            >
              Analytics
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Nuggets</h3>
            <p className="text-3xl font-bold text-blue-600">{dashboardData.summary.totalNuggets}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Sessions</h3>
            <p className="text-3xl font-bold text-green-600">
              {dashboardData.summary.activeSessions}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Jobs</h3>
            <p className="text-3xl font-bold text-yellow-600">
              {dashboardData.summary.processingJobs}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Nuggets */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Nuggets</h2>
                <Link href="/admin/console/nuggets">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {dashboardData.recentActivity.nuggets.length > 0 ? (
                  dashboardData.recentActivity.nuggets.map((nugget) => (
                    <Link
                      key={nugget.id}
                      href={`/admin/console/nuggets/${nugget.id}`}
                      className="block p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                    >
                      <p className="text-sm text-gray-900 line-clamp-2 mb-1">{nugget.content}</p>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-medium ${getStatusColor(nugget.status)}`}>
                          {nugget.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(nugget.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent nuggets</p>
                )}
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Sessions</h2>
                <Link href="/admin/console/analytics">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {dashboardData.recentActivity.sessions.length > 0 ? (
                  dashboardData.recentActivity.sessions.map((session) => (
                    <div key={session.id} className="p-3 bg-gray-50 rounded">
                      <p className="text-sm font-medium text-gray-900">{session.learnerName}</p>
                      <p className="text-xs text-gray-600 mb-1">{session.learnerEmail}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {session.mode === 'voice' ? '🔊 Voice' : '💬 Text'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(session.startedAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent sessions</p>
                )}
              </div>
            </div>

            {/* Recent Jobs */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Recent Jobs</h2>
                <Link href="/admin/console/ingestion">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {dashboardData.recentActivity.jobs.length > 0 ? (
                  dashboardData.recentActivity.jobs.map((job) => (
                    <div key={job.id} className="p-3 bg-gray-50 rounded">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate flex-1 mr-2">
                          {job.source}
                        </p>
                        <span className={`text-xs font-medium ${getStatusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">{job.type}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(job.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {job.errorMessage && (
                        <div className="mt-2 flex items-start space-x-1">
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mt-0.5" />
                          <p className="text-xs text-red-600">{job.errorMessage}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No recent jobs</p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Cost Overview */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost Overview</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 mb-1">This Month</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${dashboardData.costOverview.totalThisMonth.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Trend</p>
                  <p className="text-sm font-medium text-gray-900 capitalize">
                    {dashboardData.costOverview.trend}
                  </p>
                </div>
                <Link href="/admin/console/analytics">
                  <Button variant="outline" size="sm" className="w-full">
                    View Detailed Analytics
                  </Button>
                </Link>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link href="/admin/console/ingestion">
                  <Button variant="outline" className="w-full justify-start">
                    <FolderPlusIcon className="h-5 w-5 mr-2" />
                    Add Watched Folder
                  </Button>
                </Link>
                <Link href="/admin/console/ingestion">
                  <Button variant="outline" className="w-full justify-start">
                    <LinkIcon className="h-5 w-5 mr-2" />
                    Add Monitored URL
                  </Button>
                </Link>
                <Link href="/admin/console/ingestion">
                  <Button variant="outline" className="w-full justify-start">
                    <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                    View Recent Errors
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
