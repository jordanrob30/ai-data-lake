/**
 * Dashboard statistics overlay component
 */

import React from 'react';
import { DashboardStats } from '../../types';

interface DashboardStatsProps {
  stats: DashboardStats;
}

export const DashboardStatsOverlay: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="absolute top-4 left-4 z-40 bg-white/95 backdrop-blur-sm shadow-lg rounded-2xl px-5 py-3 border border-gray-200">
      <div className="flex items-center space-x-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total_schemas}</div>
          <div className="text-xs text-gray-600">Schemas</div>
        </div>
        <div className="h-8 w-px bg-gray-300" />
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.total_entities}</div>
          <div className="text-xs text-gray-600">Entities</div>
        </div>
        <div className="h-8 w-px bg-gray-300" />
        <div className="text-center">
          <div className="text-2xl font-bold text-indigo-600">{stats.total_mappings}</div>
          <div className="text-xs text-gray-600">Mappings</div>
        </div>
        {stats.pending_confirmations > 0 && (
          <>
            <div className="h-8 w-px bg-gray-300" />
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pending_confirmations}</div>
              <div className="text-xs text-orange-600 font-medium">Pending</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};