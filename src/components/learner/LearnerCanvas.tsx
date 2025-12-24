'use client';

import { useState, useEffect } from 'react';
import { useSessionStore } from '@/stores/session-store';

interface LearnerCanvasProps {
  sessionId: string;
}

export default function LearnerCanvas({ sessionId }: LearnerCanvasProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize canvas
    setIsReady(true);
  }, [sessionId]);

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Initializing canvas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Canvas Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Learning Session</h2>
      </div>

      {/* Canvas Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Content will be rendered here */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <p className="text-gray-600">Learning content will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
