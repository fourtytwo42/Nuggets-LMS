'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';

interface WatchedFolder {
  id: string;
  path: string;
  enabled: boolean;
  fileTypes: string[];
  recursive: boolean;
}

interface MonitoredURL {
  id: string;
  url: string;
  enabled: boolean;
  checkInterval: number;
  lastChecked: Date | null;
}

interface IngestionJob {
  id: string;
  type: string;
  source: string;
  status: string;
  nuggetCount: number | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  metadata: any;
}

export default function IngestionManagementPage() {
  const [folders, setFolders] = useState<WatchedFolder[]>([]);
  const [urls, setUrls] = useState<MonitoredURL[]>([]);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showURLModal, setShowURLModal] = useState(false);
  const [showJobDetailsModal, setShowJobDetailsModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<IngestionJob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [jobFilter, setJobFilter] = useState<{ status?: string; type?: string }>({});
  const [jobPage, setJobPage] = useState(1);
  const [jobPagination, setJobPagination] = useState({
    total: 0,
    totalPages: 0,
    page: 1,
    pageSize: 20,
  });

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  useEffect(() => {
    fetchFolders();
    fetchURLs();
    fetchJobs();
  }, []);

  // Poll for job updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, [jobFilter, jobPage]);

  const fetchFolders = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/admin/ingestion/folders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setFolders(Array.isArray(data.folders) ? data.folders : []);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchURLs = async () => {
    try {
      const token = getToken();
      const response = await fetch('/api/admin/ingestion/urls', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUrls(Array.isArray(data.urls) ? data.urls : []);
      }
    } catch (error) {
      console.error('Error fetching URLs:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams({
        page: jobPage.toString(),
        pageSize: '20',
      });
      if (jobFilter.status) {
        params.append('status', jobFilter.status);
      }
      if (jobFilter.type) {
        params.append('type', jobFilter.type);
      }

      const response = await fetch(`/api/admin/ingestion/jobs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(Array.isArray(data.jobs) ? data.jobs : []);
        setJobPagination(data.pagination || { total: 0, totalPages: 0, page: 1, pageSize: 20 });
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  };

  const handleAddFolder = async (path: string, fileTypes: string[], recursive: boolean) => {
    try {
      const token = getToken();
      const response = await fetch('/api/admin/ingestion/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ path, fileTypes, recursive }),
      });

      if (response.ok) {
        await fetchFolders();
        setShowFolderModal(false);
      }
    } catch (error) {
      console.error('Error adding folder:', error);
    }
  };

  const handleAddURL = async (url: string, checkInterval: number) => {
    try {
      const token = getToken();
      const response = await fetch('/api/admin/ingestion/urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url, checkInterval }),
      });

      if (response.ok) {
        await fetchURLs();
        setShowURLModal(false);
      }
    } catch (error) {
      console.error('Error adding URL:', error);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      const token = getToken();
      const response = await fetch(`/api/admin/ingestion/jobs/${jobId}/retry`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchJobs();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to retry job');
      }
    } catch (error) {
      console.error('Error retrying job:', error);
      alert('Failed to retry job');
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this job?')) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/ingestion/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchJobs();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to cancel job');
      }
    } catch (error) {
      console.error('Error cancelling job:', error);
      alert('Failed to cancel job');
    }
  };

  const openJobDetails = (job: IngestionJob) => {
    setSelectedJob(job);
    setShowJobDetailsModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Content Ingestion Management</h1>
      </div>

      {/* Ingestion Jobs */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Ingestion Jobs</h2>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <Select
              value={jobFilter.status || ''}
              onChange={(e) => {
                setJobFilter({ ...jobFilter, status: e.target.value || undefined });
                setJobPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <Select
              value={jobFilter.type || ''}
              onChange={(e) => {
                setJobFilter({ ...jobFilter, type: e.target.value || undefined });
                setJobPage(1);
              }}
            >
              <option value="">All Types</option>
              <option value="file">File</option>
              <option value="url">URL</option>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => {
                setJobFilter({});
                setJobPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Jobs Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nuggets
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Array.isArray(jobs) && jobs.length > 0 ? (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                        {job.source}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                        {job.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(job.status)}`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {job.nuggetCount ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => openJobDetails(job)}>
                          Details
                        </Button>
                        {job.status === 'failed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRetryJob(job.id)}
                          >
                            Retry
                          </Button>
                        )}
                        {job.status === 'pending' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCancelJob(job.id)}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                    No jobs found
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {jobPagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-700">
                Showing {(jobPage - 1) * jobPagination.pageSize + 1} to{' '}
                {Math.min(jobPage * jobPagination.pageSize, jobPagination.total)} of{' '}
                {jobPagination.total} jobs
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setJobPage((p) => Math.max(1, p - 1))}
                  disabled={jobPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setJobPage((p) => Math.min(jobPagination.totalPages, p + 1))}
                  disabled={jobPage === jobPagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Watched Folders */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Watched Folders</h2>
          <Button onClick={() => setShowFolderModal(true)}>Add Folder</Button>
        </div>
        <div className="space-y-2">
          {Array.isArray(folders) && folders.length > 0 ? (
            folders.map((folder) => (
              <div
                key={folder.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded"
              >
                <div>
                  <p className="font-medium">{folder.path}</p>
                  <p className="text-sm text-gray-600">
                    Types: {folder.fileTypes.join(', ')} | Recursive:{' '}
                    {folder.recursive ? 'Yes' : 'No'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    folder.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {folder.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No watched folders configured</p>
          )}
        </div>
      </div>

      {/* Monitored URLs */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Monitored URLs</h2>
          <Button onClick={() => setShowURLModal(true)}>Add URL</Button>
        </div>
        <div className="space-y-2">
          {Array.isArray(urls) && urls.length > 0 ? (
            urls.map((url) => (
              <div
                key={url.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded"
              >
                <div>
                  <p className="font-medium">{url.url}</p>
                  <p className="text-sm text-gray-600">
                    Check interval: {url.checkInterval} minutes | Last checked:{' '}
                    {url.lastChecked ? new Date(url.lastChecked).toLocaleString() : 'Never'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    url.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {url.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No monitored URLs configured</p>
          )}
        </div>
      </div>

      {/* Add Folder Modal */}
      {showFolderModal && (
        <AddFolderModal onClose={() => setShowFolderModal(false)} onAdd={handleAddFolder} />
      )}

      {/* Add URL Modal */}
      {showURLModal && <AddURLModal onClose={() => setShowURLModal(false)} onAdd={handleAddURL} />}

      {/* Job Details Modal */}
      {showJobDetailsModal && selectedJob && (
        <JobDetailsModal
          job={selectedJob}
          onClose={() => {
            setShowJobDetailsModal(false);
            setSelectedJob(null);
          }}
          onRetry={handleRetryJob}
          onCancel={handleCancelJob}
        />
      )}
    </div>
  );
}

function AddFolderModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (path: string, fileTypes: string[], recursive: boolean) => void;
}) {
  const [path, setPath] = useState('');
  const [fileTypes, setFileTypes] = useState('pdf,docx,txt');
  const [recursive, setRecursive] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(
      path,
      fileTypes.split(',').map((t) => t.trim()),
      recursive
    );
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Watched Folder">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Folder Path</label>
          <Input value={path} onChange={(e) => setPath(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File Types (comma-separated)
          </label>
          <Input value={fileTypes} onChange={(e) => setFileTypes(e.target.value)} required />
        </div>
        <div className="flex items-center">
          <input
            type="checkbox"
            id="recursive"
            checked={recursive}
            onChange={(e) => setRecursive(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="recursive" className="text-sm text-gray-700">
            Watch subdirectories
          </label>
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add Folder</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddURLModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (url: string, checkInterval: number) => void;
}) {
  const [url, setUrl] = useState('');
  const [checkInterval, setCheckInterval] = useState(5);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(url, checkInterval);
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Add Monitored URL">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
          <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Check Interval (minutes)
          </label>
          <Input
            type="number"
            value={checkInterval}
            onChange={(e) => setCheckInterval(parseInt(e.target.value))}
            min={1}
            required
          />
        </div>
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Add URL</Button>
        </div>
      </form>
    </Modal>
  );
}

function JobDetailsModal({
  job,
  onClose,
  onRetry,
  onCancel,
}: {
  job: IngestionJob;
  onClose: () => void;
  onRetry: (jobId: string) => void;
  onCancel: (jobId: string) => void;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Job Details" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
          <p className="text-sm text-gray-900">{job.source}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <p className="text-sm text-gray-900">{job.type}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(job.status)}`}>
              {job.status}
            </span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuggets Created</label>
            <p className="text-sm text-gray-900">{job.nuggetCount ?? '-'}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Created At</label>
            <p className="text-sm text-gray-900">{new Date(job.createdAt).toLocaleString()}</p>
          </div>

          {job.startedAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Started At</label>
              <p className="text-sm text-gray-900">{new Date(job.startedAt).toLocaleString()}</p>
            </div>
          )}

          {job.completedAt && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completed At</label>
              <p className="text-sm text-gray-900">{new Date(job.completedAt).toLocaleString()}</p>
            </div>
          )}
        </div>

        {job.errorMessage && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Error Message</label>
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{job.errorMessage}</p>
          </div>
        )}

        {job.metadata && Object.keys(job.metadata).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Metadata</label>
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
              {JSON.stringify(job.metadata, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4 border-t">
          {job.status === 'failed' && <Button onClick={() => onRetry(job.id)}>Retry Job</Button>}
          {job.status === 'pending' && (
            <Button variant="destructive" onClick={() => onCancel(job.id)}>
              Cancel Job
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
