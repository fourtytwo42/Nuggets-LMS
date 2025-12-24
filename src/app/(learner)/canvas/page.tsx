'use client';

import { useState, useEffect } from 'react';
import { useSessionStore } from '@/stores/session-store';
import logger from '@/lib/logger';

export default function LearnerCanvasPage() {
  const { sessionId } = useSessionStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize session if needed
    if (!sessionId) {
      // Create session logic would go here
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [sessionId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading learning session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Learning Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Learning Canvas</h1>
              <p className="text-gray-600">Your learning session will appear here.</p>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Progress</h2>
              <p className="text-gray-600">Progress tracking will appear here.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
