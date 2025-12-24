'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface AnalyticsData {
  learners: {
    total: number;
    active: number;
    new: number;
  };
  sessions: {
    total: number;
    averageDuration: number;
    completed: number;
    active: number;
  };
  nuggets: {
    total: number;
    byStatus: Record<string, number>;
  };
  engagement: {
    averageSessionsPerLearner: number;
    averageNuggetsPerSession: number;
    averageSessionDuration: number;
  };
  costs: {
    total: number;
    byService: {
      ai: number;
      voice: number;
      images: number;
    };
    perLearner: number;
  };
}

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<string>('week');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: '',
  });

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const token = getToken();
      const params = new URLSearchParams();
      if (period) {
        params.append('period', period);
      }

      const response = await fetch(`/api/admin/analytics?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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

  const handleExport = (format: 'csv' | 'json') => {
    if (!analytics) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'csv') {
      // Convert analytics to CSV
      const rows = [
        ['Metric', 'Value'],
        ['Total Learners', analytics.learners.total.toString()],
        ['Active Learners', analytics.learners.active.toString()],
        ['New Learners', analytics.learners.new.toString()],
        ['Total Sessions', analytics.sessions.total.toString()],
        ['Active Sessions', analytics.sessions.active.toString()],
        ['Completed Sessions', analytics.sessions.completed.toString()],
        ['Average Session Duration', analytics.sessions.averageDuration.toString()],
        ['Total Nuggets', analytics.nuggets.total.toString()],
        ['Total Costs', analytics.costs.total.toString()],
        ['Costs by Service - AI', analytics.costs.byService.ai.toString()],
        ['Costs by Service - Voice', analytics.costs.byService.voice.toString()],
        ['Costs by Service - Images', analytics.costs.byService.images.toString()],
        ['Cost per Learner', analytics.costs.perLearner.toString()],
      ];
      content = rows.map((row) => row.join(',')).join('\n');
      filename = `analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(analytics, null, 2);
      filename = `analytics-${period}-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">Failed to load analytics</p>
      </div>
    );
  }

  // Prepare chart data
  const nuggetStatusData = Object.entries(analytics.nuggets.byStatus).map(([name, value]) => ({
    name,
    value,
  }));

  const costByServiceData = [
    { name: 'AI', value: analytics.costs.byService.ai },
    { name: 'Voice', value: analytics.costs.byService.voice },
    { name: 'Images', value: analytics.costs.byService.images },
  ];

  // Mock time series data (in real implementation, this would come from the API)
  const learnerGrowthData = [
    { date: 'Day 1', learners: analytics.learners.total - analytics.learners.new },
    { date: 'Day 2', learners: analytics.learners.total - analytics.learners.new + 2 },
    { date: 'Day 3', learners: analytics.learners.total - analytics.learners.new + 4 },
    { date: 'Day 4', learners: analytics.learners.total - analytics.learners.new + 6 },
    { date: 'Day 5', learners: analytics.learners.total - analytics.learners.new + 8 },
    { date: 'Day 6', learners: analytics.learners.total - analytics.learners.new + 9 },
    { date: 'Day 7', learners: analytics.learners.total },
  ];

  const sessionActivityData = [
    { day: 'Mon', sessions: 50 },
    { day: 'Tue', sessions: 65 },
    { day: 'Wed', sessions: 45 },
    { day: 'Thu', sessions: 70 },
    { day: 'Fri', sessions: 55 },
    { day: 'Sat', sessions: 40 },
    { day: 'Sun', sessions: 35 },
  ];

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('json')}>
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </Select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Custom Date Range
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <span className="self-center text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Nuggets</h3>
          <p className="text-3xl font-bold text-blue-600">{analytics.nuggets.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Active Sessions</h3>
          <p className="text-3xl font-bold text-green-600">{analytics.sessions.active}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Learners</h3>
          <p className="text-3xl font-bold text-purple-600">{analytics.learners.total}</p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Total Costs</h3>
          <p className="text-3xl font-bold text-yellow-600">${analytics.costs.total.toFixed(2)}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Learner Growth Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Learner Growth</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={learnerGrowthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="learners" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Session Activity Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Session Activity</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={sessionActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="sessions" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Nugget Status Distribution */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Nugget Status Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={nuggetStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {nuggetStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Cost Breakdown by Service */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown by Service</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costByServiceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost Breakdown Details */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cost Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Costs</p>
            <p className="text-2xl font-bold text-gray-900">${analytics.costs.total.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">AI Services</p>
            <p className="text-2xl font-bold text-blue-600">
              ${analytics.costs.byService.ai.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Voice Services</p>
            <p className="text-2xl font-bold text-green-600">
              ${analytics.costs.byService.voice.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Image Generation</p>
            <p className="text-2xl font-bold text-purple-600">
              ${analytics.costs.byService.images.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-600 mb-1">Cost per Learner</p>
          <p className="text-xl font-semibold text-gray-900">
            ${analytics.costs.perLearner.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Engagement Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Average Sessions per Learner</p>
            <p className="text-2xl font-bold text-gray-900">
              {analytics.engagement.averageSessionsPerLearner.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Average Nuggets per Session</p>
            <p className="text-2xl font-bold text-gray-900">
              {analytics.engagement.averageNuggetsPerSession.toFixed(1)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Average Session Duration</p>
            <p className="text-2xl font-bold text-gray-900">
              {analytics.engagement.averageSessionDuration} min
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
