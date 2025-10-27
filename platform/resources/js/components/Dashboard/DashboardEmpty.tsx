/**
 * Dashboard empty state component
 */

import React from 'react';
import { router } from '@inertiajs/react';

export const DashboardEmpty: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Schema Mappings Yet
        </h3>
        <p className="text-gray-600 mb-6 max-w-md">
          Configure schema mappings from the Confirmations page to see them visualized here.
        </p>
        <button
          onClick={() => router.visit('/confirmations')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Go to Confirmations
        </button>
      </div>
    </div>
  );
};