'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

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

export default function IngestionManagementPage() {
  const [folders, setFolders] = useState<WatchedFolder[]>([]);
  const [urls, setUrls] = useState<MonitoredURL[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showURLModal, setShowURLModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFolders();
    fetchURLs();
  }, []);

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/admin/ingestion/folders');
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      }
    } catch (error) {
      console.error('Error fetching folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchURLs = async () => {
    try {
      const response = await fetch('/api/admin/ingestion/urls');
      if (response.ok) {
        const data = await response.json();
        setUrls(data);
      }
    } catch (error) {
      console.error('Error fetching URLs:', error);
    }
  };

  const handleAddFolder = async (path: string, fileTypes: string[], recursive: boolean) => {
    try {
      const response = await fetch('/api/admin/ingestion/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch('/api/admin/ingestion/urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

      {/* Watched Folders */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Watched Folders</h2>
          <Button onClick={() => setShowFolderModal(true)}>Add Folder</Button>
        </div>
        <div className="space-y-2">
          {folders.map((folder) => (
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
          ))}
          {folders.length === 0 && (
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
          {urls.map((url) => (
            <div key={url.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
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
          ))}
          {urls.length === 0 && (
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
