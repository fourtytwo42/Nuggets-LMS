'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface Nugget {
  id: string;
  content: string;
  status: string;
  metadata: any;
  imageUrl?: string;
  audioUrl?: string;
}

export default function NuggetEditorPage() {
  const params = useParams();
  const nuggetId = params.id as string;
  const [nugget, setNugget] = useState<Nugget | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  useEffect(() => {
    fetchNugget();
  }, [nuggetId]);

  const fetchNugget = async () => {
    try {
      const response = await fetch(`/api/admin/nuggets/${nuggetId}`);
      if (response.ok) {
        const data = await response.json();
        setNugget(data);
        setEditedContent(data.content);
      }
    } catch (error) {
      console.error('Error fetching nugget:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/admin/nuggets/${nuggetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editedContent }),
      });

      if (response.ok) {
        await fetchNugget();
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving nugget:', error);
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
    return <div className="container mx-auto px-4 py-8">Nugget not found</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Edit Nugget</h1>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit</Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg"
          />
        ) : (
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap">{nugget.content}</p>
          </div>
        )}

        {nugget.imageUrl && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Image</h3>
            <img src={nugget.imageUrl} alt="Nugget image" className="max-w-md rounded-lg" />
          </div>
        )}

        {nugget.audioUrl && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Audio</h3>
            <audio src={nugget.audioUrl} controls className="w-full" />
          </div>
        )}
      </div>
    </div>
  );
}
