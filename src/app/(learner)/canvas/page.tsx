'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from '@/hooks/useSession';
import dynamicImport from 'next/dynamic';

// Route segment config - prevent static generation
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

// Dynamically import LearnerCanvas to prevent SSR issues
const LearnerCanvas = dynamicImport(() => import('@/components/learner/LearnerCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading learning session...</p>
      </div>
    </div>
  ),
});

export default function LearnerCanvasPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionIdParam = searchParams.get('sessionId');
  const { session, isLoading, error, getOrCreateSession, getSession } = useSession();

  useEffect(() => {
    const initializeSession = async () => {
      try {
        if (sessionIdParam) {
          // Use provided session ID
          await getSession(sessionIdParam);
        } else {
          // Get or create active session
          await getOrCreateSession('text');
        }
      } catch (err) {
        console.error('Error initializing session:', err);
      }
    };

    if (!session && !isLoading) {
      initializeSession();
    }
  }, [sessionIdParam, session, isLoading, getSession, getOrCreateSession]);

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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No active session found.</p>
        </div>
      </div>
    );
  }

  return <LearnerCanvas sessionId={session.id} />;
}
