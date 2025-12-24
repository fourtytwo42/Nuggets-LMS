'use client';

import { useEffect, useState } from 'react';

export interface ProgressData {
  masteryMap: Record<string, number>;
  knowledgeGaps: string[];
}

interface ProgressPanelProps {
  sessionId: string;
  onProgressUpdate?: (progress: ProgressData) => void;
}

export default function ProgressPanel({ sessionId, onProgressUpdate }: ProgressPanelProps) {
  const [progress, setProgress] = useState<ProgressData>({
    masteryMap: {},
    knowledgeGaps: [],
  });

  useEffect(() => {
    fetchProgress();
  }, [sessionId]);

  const fetchProgress = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        return;
      }

      // Get progress data from session progress endpoint
      const progressResponse = await fetch(`/api/learning/sessions/${sessionId}/progress`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (progressResponse.ok) {
        const progressData = await progressResponse.json();

        // Convert concepts array to masteryMap
        const masteryMap: Record<string, number> = {};
        if (progressData.concepts) {
          progressData.concepts.forEach((concept: { concept: string; masteryLevel: number }) => {
            masteryMap[concept.concept] = concept.masteryLevel;
          });
        }

        setProgress({
          masteryMap,
          knowledgeGaps: progressData.knowledgeGaps || [],
        });

        if (onProgressUpdate) {
          onProgressUpdate({
            masteryMap,
            knowledgeGaps: progressData.knowledgeGaps || [],
          });
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
      // Fallback to empty progress on error
      setProgress({
        masteryMap: {},
        knowledgeGaps: [],
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Progress</h2>

      {/* Mastery Levels */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Mastery Levels</h3>
        <div className="space-y-3">
          {Object.entries(progress.masteryMap).map(([concept, mastery]) => (
            <div key={concept}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{concept}</span>
                <span className="text-gray-600">{mastery}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${mastery}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Knowledge Gaps */}
      {progress.knowledgeGaps.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Knowledge Gaps</h3>
          <div className="flex flex-wrap gap-2">
            {progress.knowledgeGaps.map((gap) => (
              <span
                key={gap}
                className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
              >
                {gap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
