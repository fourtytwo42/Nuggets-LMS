'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  totalNuggets: number;
  activeSessions: number;
  totalLearners: number;
  averageMastery: number;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalNuggets: 0,
    activeSessions: 0,
    totalLearners: 0,
    averageMastery: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Nuggets</h3>
          <p className="text-3xl font-bold text-blue-600">{analytics.totalNuggets}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Active Sessions</h3>
          <p className="text-3xl font-bold text-green-600">{analytics.activeSessions}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Learners</h3>
          <p className="text-3xl font-bold text-purple-600">{analytics.totalLearners}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Average Mastery</h3>
          <p className="text-3xl font-bold text-yellow-600">{analytics.averageMastery}%</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Usage Trends</h2>
        <p className="text-gray-500">Chart visualization would go here</p>
      </div>
    </div>
  );
}
