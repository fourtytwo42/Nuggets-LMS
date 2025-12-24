'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import Link from 'next/link';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Nugget {
  id: string;
  content: string;
  status: string;
  metadata: any;
  imageUrl: string | null;
  audioUrl: string | null;
  createdAt: Date;
}

export default function NuggetStorePage() {
  const [nuggets, setNuggets] = useState<Nugget[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  useEffect(() => {
    fetchNuggets();
  }, [pagination.page, statusFilter, searchQuery]);

  const fetchNuggets = async () => {
    try {
      setIsLoading(true);
      const token = getToken();
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      });

      if (statusFilter) {
        params.append('status', statusFilter);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/admin/nuggets?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNuggets(data.nuggets);
        setPagination({
          ...pagination,
          total: data.total,
          totalPages: Math.ceil(data.total / pagination.pageSize),
        });
      }
    } catch (error) {
      console.error('Error fetching nuggets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchNuggets();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading && nuggets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Nugget Store</h1>
        <Button>Create Nugget</Button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Input
                  placeholder="Search nuggets by content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="ready">Ready</option>
                <option value="failed">Failed</option>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit">Search</Button>
          </div>
        </form>
      </div>

      {/* Nuggets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {nuggets.map((nugget) => (
          <Link
            key={nugget.id}
            href={`/admin/console/nuggets/${nugget.id}`}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1 mr-2">
                {nugget.content.substring(0, 100)}
                {nugget.content.length > 100 ? '...' : ''}
              </h3>
              <span
                className={`px-2 py-1 rounded text-xs whitespace-nowrap ${getStatusColor(nugget.status)}`}
              >
                {nugget.status}
              </span>
            </div>

            {/* Media Preview */}
            {(nugget.imageUrl || nugget.audioUrl) && (
              <div className="flex space-x-2 mb-2">
                {nugget.imageUrl && <div className="text-xs text-blue-600">📷 Image</div>}
                {nugget.audioUrl && <div className="text-xs text-blue-600">🔊 Audio</div>}
              </div>
            )}

            <p className="text-sm text-gray-600">
              Created: {new Date(nugget.createdAt).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>

      {nuggets.length === 0 && !isLoading && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-500">No nuggets found</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-between items-center bg-white rounded-lg shadow-md p-4">
          <div className="text-sm text-gray-700">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} nuggets
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })
              }
              disabled={pagination.page === 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setPagination({
                  ...pagination,
                  page: Math.min(pagination.totalPages, pagination.page + 1),
                })
              }
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
