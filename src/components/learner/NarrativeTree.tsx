'use client';

import { useState } from 'react';

export interface NarrativeNode {
  id: string;
  title: string;
  position: { x: number; y: number };
  choices: Array<{
    id: string;
    text: string;
    nextNodeId: string;
  }>;
}

interface NarrativeTreeProps {
  nodes: NarrativeNode[];
  currentNodeId?: string;
  onNodeSelect?: (nodeId: string) => void;
}

export default function NarrativeTree({ nodes, currentNodeId, onNodeSelect }: NarrativeTreeProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(currentNodeId || null);

  const handleNodeClick = (nodeId: string) => {
    setSelectedNode(nodeId);
    if (onNodeSelect) {
      onNodeSelect(nodeId);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Learning Path</h2>
      <div className="space-y-3">
        {nodes.map((node) => (
          <div
            key={node.id}
            onClick={() => handleNodeClick(node.id)}
            className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
              selectedNode === node.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${currentNodeId === node.id ? 'ring-2 ring-blue-400' : ''}`}
          >
            <h3 className="font-medium text-gray-900">{node.title}</h3>
            {node.choices.length > 0 && (
              <p className="text-sm text-gray-600 mt-1">
                {node.choices.length} choice{node.choices.length !== 1 ? 's' : ''} available
              </p>
            )}
          </div>
        ))}
      </div>
      {nodes.length === 0 && (
        <p className="text-gray-500 text-center py-8">No narrative nodes available</p>
      )}
    </div>
  );
}
