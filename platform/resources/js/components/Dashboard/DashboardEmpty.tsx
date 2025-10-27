/**
 * Dashboard empty state component
 */

import React from 'react';

export const DashboardEmpty: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No Schema Mappings Yet
        </h3>
        <p className="text-gray-600 mb-6 max-w-md">
          Use the Test Data button in the bottom controls to send sample data and create your first schema mapping.
        </p>
        <div className="text-sm text-gray-500">
          Click the test tube icon in the bottom-left controls to get started
        </div>
      </div>
    </div>
  );
};