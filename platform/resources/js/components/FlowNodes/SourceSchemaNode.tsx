import { Handle, Position, NodeProps } from '@xyflow/react';
import { memo } from 'react';

interface SourceSchemaData {
  label: string;
  hash: string;
  tenant: string;
  fields: any[];
  pending_records: number;
  created_at: string;
}

const SourceSchemaNode = ({ data, selected }: NodeProps<SourceSchemaData>) => {
  return (
    <div
      className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-2 rounded-lg p-4 min-w-[250px] shadow-md transition-all cursor-pointer hover:shadow-xl ${
        selected ? 'border-indigo-500 shadow-lg' : 'border-blue-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-2xl">📊</span>
            <h3 className="font-semibold text-gray-900 text-sm break-words">{data.label || 'Unnamed Schema'}</h3>
          </div>
          <p className="text-xs text-gray-600">Source Schema</p>
        </div>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full whitespace-nowrap ml-2">
          Bronze
        </span>
      </div>

      {/* Metadata */}
      <div className="space-y-2 mb-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Tenant:</span>
          <span className="font-medium text-indigo-700">{data.tenant}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Fields:</span>
          <span className="font-medium text-gray-900">{data.fields?.length || 0}</span>
        </div>
        {data.pending_records > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Pending:</span>
            <span className="font-medium text-orange-600">{data.pending_records}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Created:</span>
          <span className="font-medium text-gray-700">{data.created_at}</span>
        </div>
      </div>

      {/* Hash */}
      <div className="pt-2 border-t border-blue-200">
        <p className="text-xs text-gray-500 font-mono truncate" title={data.hash}>
          {data.hash}
        </p>
      </div>

      {/* Connection Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
      />
    </div>
  );
};

export default memo(SourceSchemaNode);
