'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';

interface Nugget {
  id: string;
  content: string;
  status: string;
  metadata: any;
  createdAt: Date;
}

export default function NuggetStorePage() {
  const [nuggets, setNuggets] = useState<Nugget[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNuggets();
  }, []);

  const fetchNuggets = async () => {
    try {
      const response = await fetch('/api/admin/nuggets');
      if (response.ok) {
        const data = await response.json();
        setNuggets(data);
      }
    } catch (error) {
      console.error('Error fetching nuggets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNuggets = nuggets.filter((nugget) =>
    nugget.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-gray-900">Nugget Store</h1>
        <Button>Create Nugget</Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search nuggets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Nuggets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNuggets.map((nugget) => (
          <Link
            key={nugget.id}
            href={`/admin/console/nuggets/${nugget.id}`}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-gray-900 line-clamp-2">
                {nugget.content.substring(0, 100)}...
              </h3>
              <span
                className={`px-2 py-1 rounded text-xs ${
                  nugget.status === 'ready'
                    ? 'bg-green-100 text-green-800'
                    : nugget.status === 'processing'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {nugget.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Created: {new Date(nugget.createdAt).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>

      {filteredNuggets.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No nuggets found</p>
        </div>
      )}
    </div>
  );
}
