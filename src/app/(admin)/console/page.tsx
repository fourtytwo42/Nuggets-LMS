'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AdminConsolePage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Admin Console</h1>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-2 border-b-2 ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <Link
              href="/admin/console/ingestion"
              className="py-4 px-2 border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            >
              Content Ingestion
            </Link>
            <Link
              href="/admin/console/nuggets"
              className="py-4 px-2 border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            >
              Nugget Store
            </Link>
            <Link
              href="/admin/console/settings"
              className="py-4 px-2 border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            >
              Settings
            </Link>
            <Link
              href="/admin/console/analytics"
              className="py-4 px-2 border-b-2 border-transparent text-gray-600 hover:text-gray-900"
            >
              Analytics
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Nuggets</h3>
              <p className="text-3xl font-bold text-blue-600">0</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Active Sessions</h3>
              <p className="text-3xl font-bold text-green-600">0</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Processing Jobs</h3>
              <p className="text-3xl font-bold text-yellow-600">0</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
