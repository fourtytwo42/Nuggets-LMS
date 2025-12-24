'use client';

import { useEffect, useState } from 'react';
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isCheckingRole, setIsCheckingRole] = useState(true);

  // Check user role on mount
  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          const role = userData.role;

          // Redirect admins/instructors to console
          if (role === 'admin' || role === 'instructor') {
            router.push('/admin/console');
            return;
          }

          setUserRole(role);
        } else {
          router.push('/login');
        }
      } catch (err) {
        console.error('Error checking user role:', err);
        router.push('/login');
      } finally {
        setIsCheckingRole(false);
      }
    };

    checkUserRole();
  }, [router]);

  useEffect(() => {
    const initializeSession = async () => {
      // Don't initialize session if user is admin/instructor
      if (userRole === 'admin' || userRole === 'instructor') {
        return;
      }

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

    if (!session && !isLoading && userRole === 'learner' && !isCheckingRole) {
      initializeSession();
    }
  }, [
    sessionIdParam,
    session,
    isLoading,
    userRole,
    isCheckingRole,
    getSession,
    getOrCreateSession,
  ]);

  // Show loading while checking role
  if (isCheckingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't show learner content if user is admin/instructor (they should be redirected)
  if (userRole === 'admin' || userRole === 'instructor') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Redirecting to admin console...</p>
        </div>
      </div>
    );
  }

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
