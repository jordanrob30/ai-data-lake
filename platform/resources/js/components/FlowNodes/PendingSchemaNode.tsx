import { Handle, Position, NodeProps } from '@xyflow/react';
import { memo } from 'react';

interface PendingSchemaData {
  label: string;
  hash: string;
  tenant: string;
  fields: any[];
  pending_records: number;
  created_at: string;
  status: string;
  schema_id: number;
}

const PendingSchemaNode = ({ data, selected }: NodeProps<PendingSchemaData>) => {
  return (
    <div
      className={`bg-gradient-to-br from-amber-50 to-orange-50 border-2 rounded-lg p-4 min-w-[250px] shadow-md transition-all cursor-pointer hover:shadow-xl ${
        selected ? 'border-orange-500 shadow-lg ring-2 ring-orange-300' : 'border-orange-300'
      }`}
    >
      {/* Alert Badge */}
      <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg animate-pulse">
        <span className="text-lg">!</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-2xl">⚠️</span>
            <h3 className="font-semibold text-gray-900 text-sm">{data.label}</h3>
          </div>
          <p className="text-xs text-gray-600">Pending Confirmation</p>
        </div>
        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
          Action Required
        </span>
      </div>

      {/* Metadata */}
      <div className="space-y-2 mb-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Tenant:</span>
          <span className="font-medium text-orange-700">{data.tenant}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Fields:</span>
          <span className="font-medium text-gray-900">{data.fields?.length || 0}</span>
        </div>
        <div className="flex items-center justify-between bg-amber-100 rounded px-2 py-1">
          <span className="text-amber-800 font-medium">Records Waiting:</span>
          <span className="font-bold text-amber-900">{data.pending_records}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Created:</span>
          <span className="font-medium text-gray-700">{data.created_at}</span>
        </div>
      </div>

      {/* Hash */}
      <div className="pt-2 border-t border-orange-200">
        <p className="text-xs text-gray-500 font-mono truncate" title={data.hash}>
          {data.hash}
        </p>
      </div>

      {/* Help Text */}
      <div className="mt-3 pt-2 border-t border-orange-200">
        <p className="text-xs text-orange-700 text-center font-medium">
          Click to configure mappings
        </p>
      </div>

      {/* Connection Handle (hidden since pending schemas don't have connections yet) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-orange-500 !border-2 !border-white opacity-50"
      />
    </div>
  );
};

export default memo(PendingSchemaNode);
