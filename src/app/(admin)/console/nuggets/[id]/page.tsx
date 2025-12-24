'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

interface Nugget {
  id: string;
  content: string;
  status: string;
  metadata: any;
  imageUrl: string | null;
  audioUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  nuggetSources: Array<{
    id: string;
    sourceType: string;
    sourcePath: string;
    createdAt: Date;
  }>;
}

export default function NuggetEditorPage() {
  const params = useParams();
  const router = useRouter();
  const nuggetId = params.id as string;

  const [nugget, setNugget] = useState<Nugget | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [editedMetadata, setEditedMetadata] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateOptions, setRegenerateOptions] = useState({
    regenerateImage: false,
    regenerateAudio: false,
    regenerateContent: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Get token from localStorage
  const getToken = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  };

  useEffect(() => {
    fetchNugget();
  }, [nuggetId]);

  const fetchNugget = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const token = getToken();

      const response = await fetch(`/api/admin/nuggets/${nuggetId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch nugget');
      }

      const data = await response.json();
      setNugget(data.nugget);
      setEditedContent(data.nugget.content);
      setEditedMetadata(data.nugget.metadata || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch nugget');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nugget) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/nuggets/${nuggetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: editedContent,
          metadata: editedMetadata,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save nugget');
      }

      setSuccess('Nugget saved successfully');
      setTimeout(() => setSuccess(null), 3000);
      await fetchNugget();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save nugget');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRegenerate = async () => {
    if (!nugget) return;

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/nuggets/${nuggetId}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(regenerateOptions),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to regenerate nugget');
      }

      setSuccess('Regeneration jobs queued successfully');
      setTimeout(() => setSuccess(null), 3000);
      setShowRegenerateModal(false);
      setRegenerateOptions({
        regenerateImage: false,
        regenerateAudio: false,
        regenerateContent: false,
      });
      await fetchNugget();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate nugget');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this nugget? This action cannot be undone.')) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`/api/admin/nuggets/${nuggetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete nugget');
      }

      router.push('/admin/console/nuggets');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete nugget');
    }
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!nugget) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Nugget not found'}</p>
          <Link href="/admin/console/nuggets">
            <Button className="mt-4">Back to Nugget Store</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/console/nuggets">
            <Button variant="ghost" size="sm">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Edit Nugget</h1>
          <span
            className={`px-3 py-1 rounded text-sm font-medium ${getStatusColor(nugget.status)}`}
          >
            {nugget.status}
          </span>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setShowRegenerateModal(true)}>
            Regenerate
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Content</h2>
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full h-64 p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter nugget content..."
            />
          </div>

          {/* Metadata Editor */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h2>
            <div className="space-y-4">
              {Object.entries(editedMetadata).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{key}</label>
                  <Input
                    value={String(value)}
                    onChange={(e) =>
                      setEditedMetadata({ ...editedMetadata, [key]: e.target.value })
                    }
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const key = prompt('Enter metadata key:');
                  if (key) {
                    setEditedMetadata({ ...editedMetadata, [key]: '' });
                  }
                }}
              >
                Add Metadata Field
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Media Preview */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Media</h2>
            <div className="space-y-4">
              {nugget.imageUrl ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                  <img
                    src={nugget.imageUrl}
                    alt="Nugget image"
                    className="w-full rounded-md border border-gray-300"
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-500">No image available</p>
              )}

              {nugget.audioUrl ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Audio</label>
                  <audio controls className="w-full">
                    <source src={nugget.audioUrl} />
                    Your browser does not support the audio element.
                  </audio>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No audio available</p>
              )}
            </div>
          </div>

          {/* Source Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Source Information</h2>
            {nugget.nuggetSources && nugget.nuggetSources.length > 0 ? (
              <div className="space-y-2">
                {nugget.nuggetSources.map((source) => (
                  <div key={source.id} className="text-sm">
                    <p className="font-medium text-gray-900">{source.sourceType}</p>
                    <p className="text-gray-600">{source.sourcePath}</p>
                    <p className="text-gray-500 text-xs">
                      {new Date(source.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No source information available</p>
            )}
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timestamps</h2>
            <div className="space-y-2 text-sm">
              <div>
                <p className="font-medium text-gray-700">Created</p>
                <p className="text-gray-600">{new Date(nugget.createdAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Updated</p>
                <p className="text-gray-600">{new Date(nugget.updatedAt).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Regenerate Modal */}
      {showRegenerateModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowRegenerateModal(false)}
          title="Regenerate Nugget"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select what you want to regenerate for this nugget:
            </p>

            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={regenerateOptions.regenerateImage}
                  onChange={(e) =>
                    setRegenerateOptions({
                      ...regenerateOptions,
                      regenerateImage: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Regenerate Image</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={regenerateOptions.regenerateAudio}
                  onChange={(e) =>
                    setRegenerateOptions({
                      ...regenerateOptions,
                      regenerateAudio: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Regenerate Audio</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={regenerateOptions.regenerateContent}
                  onChange={(e) =>
                    setRegenerateOptions({
                      ...regenerateOptions,
                      regenerateContent: e.target.checked,
                    })
                  }
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Regenerate Content</span>
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowRegenerateModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRegenerate}
                disabled={
                  !regenerateOptions.regenerateImage &&
                  !regenerateOptions.regenerateAudio &&
                  !regenerateOptions.regenerateContent
                }
              >
                Regenerate
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
