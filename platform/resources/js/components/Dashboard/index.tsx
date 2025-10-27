/**
 * Main Dashboard component that orchestrates all dashboard features
 */

import React, { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { usePage } from '@inertiajs/react';

import { FlowData, DashboardStats, PendingSchema } from '../../types';
import { DashboardCanvas } from './DashboardCanvas';
import { DashboardStatsOverlay } from './DashboardStats';
import { DashboardLegend } from './DashboardLegend';
import { useFlowLayout } from '../../hooks/useFlowLayout';
import FloatingMenu from '../FloatingMenu';
import TestIngestionModal from './TestIngestionModal';

// Add CSS for smooth edge transitions
const edgeTransitionStyles = `
  .react-flow__edge path,
  .react-flow__edge-path {
    transition: opacity 0.4s ease-in-out, stroke-width 0.3s ease-in-out !important;
  }
`;

interface DashboardProps {
  flowData: FlowData;
  stats: DashboardStats;
  pendingSchemas: PendingSchema[];
}

/**
 * Dashboard flow component wrapped in ReactFlow context
 */
const DashboardFlow: React.FC<DashboardProps> = ({ flowData, stats, pendingSchemas }) => {
  const page = usePage();
  const auth = (page.props.auth as any);
  const tenantId = auth?.user?.tenant_id;
  const { applyAutoLayout } = useFlowLayout();

  // Test ingestion modal state
  const [isTestIngestionOpen, setIsTestIngestionOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-gray-100 relative overflow-hidden">
      {/* Inject edge transition CSS */}
      <style dangerouslySetInnerHTML={{ __html: edgeTransitionStyles }} />

      {/* Floating Menu */}
      <FloatingMenu />

      {/* Stats Overlay */}
      <DashboardStatsOverlay stats={stats} />

      {/* Legend and Controls */}
      <DashboardLegend
        onAutoLayout={applyAutoLayout}
        onOpenTestIngestion={() => setIsTestIngestionOpen(true)}
      />

      {/* React Flow Canvas - Full Screen */}
      <div className="absolute inset-0">
        <DashboardCanvas
          flowData={flowData}
          pendingSchemas={pendingSchemas}
          tenantId={tenantId}
        />
      </div>

      {/* Test Ingestion Modal */}
      <TestIngestionModal
        isOpen={isTestIngestionOpen}
        onClose={() => setIsTestIngestionOpen(false)}
        auth={auth}
      />
    </div>
  );
};

/**
 * Main Dashboard component with ReactFlow provider
 */
const Dashboard: React.FC<DashboardProps> = (props) => {
  return (
    <ReactFlowProvider>
      <DashboardFlow {...props} />
    </ReactFlowProvider>
  );
};

export default Dashboard;