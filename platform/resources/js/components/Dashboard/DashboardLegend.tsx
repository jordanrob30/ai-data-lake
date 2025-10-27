/**
 * Dashboard legend and controls component
 */

import React from 'react';
import { useReactFlow } from '@xyflow/react';

interface DashboardLegendProps {
  onAutoLayout: () => void;
}

export const DashboardLegend: React.FC<DashboardLegendProps> = ({ onAutoLayout }) => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute bottom-4 left-4 z-40 bg-white/95 backdrop-blur-sm shadow-lg rounded-2xl px-4 py-3 border border-gray-200">
      <div className="flex items-center space-x-4 text-xs">
        {/* Legend Items */}
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded"></div>
          <span className="text-gray-600">Confirmed Schema</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded"></div>
          <span className="text-gray-600">Silver Entity</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-300 rounded"></div>
          <span className="text-orange-700 font-medium">Pending</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-300 rounded flex items-center justify-center text-xs text-purple-600 font-bold">
            ƒ
          </div>
          <span className="text-gray-600">Formula</span>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-300" />

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => zoomIn()}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors group"
            title="Zoom In"
          >
            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => zoomOut()}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors group"
            title="Zoom Out"
          >
            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={() => fitView({ padding: 0.2, duration: 600 })}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors group"
            title="Fit to View"
          >
            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
          <button
            onClick={onAutoLayout}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors group"
            title="Auto Layout"
          >
            <svg className="w-4 h-4 text-gray-600 group-hover:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
            </svg>
          </button>
        </div>

        {/* Help Text */}
        <div className="flex items-center space-x-2 ml-2 text-gray-500">
          <span>💡</span>
          <span className="italic">Click to expand • Click edges to add formulas</span>
        </div>
      </div>
    </div>
  );
};