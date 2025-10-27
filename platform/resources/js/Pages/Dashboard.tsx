/**
 * Dashboard page component
 * This is the entry point that receives props from Laravel Inertia
 */

import Dashboard from '../components/Dashboard';
import { FlowData, DashboardStats, PendingSchema } from '../types';

interface DashboardPageProps {
  flowData: FlowData;
  stats: DashboardStats;
  pendingSchemas: PendingSchema[];
}

const DashboardPage = ({ flowData, stats, pendingSchemas }: DashboardPageProps) => {
  return (
    <Dashboard
      flowData={flowData}
      stats={stats}
      pendingSchemas={pendingSchemas}
    />
  );
};

export default DashboardPage;