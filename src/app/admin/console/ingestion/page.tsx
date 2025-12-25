'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';

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
  const [urls, setUrls] = useState<MonitoredURL[]>([]);
  const [jobs, setJobs] = useState<IngestionJob[]>([]);
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
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchURLs(), fetchJobs()]);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Poll for job updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchJobs();
    }, 5000);

    return () => clearInterval(interval);
  }, [jobFilter, jobPage]);

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

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/ingestion/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchJobs();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete job');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      alert('Failed to delete job');
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
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
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
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetryJob(job.id)}
                            >
                              Retry
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteJob(job.id)}
                            >
                              Delete
                            </Button>
                          </>
                        )}
                        {job.status === 'completed' && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteJob(job.id)}
                          >
                            Delete
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

      {/* File Upload */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Upload Files</h2>
        </div>
        <FileUploadSection onUploadSuccess={() => fetchJobs()} />
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
          onDelete={handleDeleteJob}
        />
      )}
    </main>
  );
}

function FileUploadSection({ onUploadSuccess }: { onUploadSuccess: () => void }) {
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileArray = Array.from(e.target.files);
      setFiles(fileArray);
      setUploadStatus(null);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadStatus({ type: 'error', message: 'Please select at least one file' });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    try {
      const token = getToken();
      if (!token) {
        setUploadStatus({ type: 'error', message: 'Authentication token not found' });
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/admin/ingestion/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadStatus({
        type: 'success',
        message: `Successfully uploaded ${data.uploaded.length} file(s). ${data.errors?.length ? `${data.errors.length} error(s).` : ''}`,
      });

      // Clear selected files
      setFiles([]);
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }

      // Refresh jobs list
      onUploadSuccess();
    } catch (error) {
      setUploadStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Files (PDF, DOCX, TXT, MD, HTML)
        </label>
        <input
          id="file-upload"
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.html,.htm"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <p className="mt-1 text-sm text-gray-500">Maximum file size: 10MB per file</p>
      </div>

      {files.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Selected Files:</p>
          <ul className="list-disc list-inside space-y-1">
            {files.map((file, index) => (
              <li key={index} className="text-sm text-gray-600">
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </li>
            ))}
          </ul>
        </div>
      )}

      {uploadStatus && (
        <div
          className={`rounded-lg p-4 ${
            uploadStatus.type === 'success'
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <p
            className={`text-sm ${
              uploadStatus.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}
          >
            {uploadStatus.message}
          </p>
        </div>
      )}

      <Button onClick={handleUpload} disabled={isUploading || files.length === 0}>
        {isUploading
          ? 'Uploading...'
          : `Upload ${files.length > 0 ? `${files.length} ` : ''}File(s)`}
      </Button>
    </div>
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
