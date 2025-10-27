import { Handle, Position, NodeProps } from '@xyflow/react';
import { memo } from 'react';

interface EntitySchemaData {
  label: string;
  fields: any[];
  field_path?: string;
  standalone?: boolean;
}

const EntitySchemaNode = ({ data, selected }: NodeProps<EntitySchemaData>) => {
  return (
    <div
      className={`bg-gradient-to-br from-green-50 to-emerald-50 border-2 rounded-lg p-4 min-w-[250px] shadow-md transition-all cursor-pointer hover:shadow-xl ${
        selected ? 'border-emerald-500 shadow-lg' : 'border-green-300'
      }`}
    >
      {/* Connection Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-2xl">🏛️</span>
            <h3 className="font-semibold text-gray-900 text-sm break-words">{data.label || 'Unnamed Entity'}</h3>
          </div>
          <p className="text-xs text-gray-600">Entity Schema</p>
        </div>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full whitespace-nowrap ml-2">
          Silver
        </span>
      </div>

      {/* Entity Info */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Fields:</span>
          <span className="font-medium text-gray-900">{data.fields?.length || 0}</span>
        </div>
        {data.field_path && (
          <div className="bg-green-100 rounded px-2 py-1">
            <span className="text-gray-600">Path:</span>
            <span className="font-mono text-green-800 ml-1 text-xs">
              {data.field_path}
            </span>
          </div>
        )}
        {data.standalone && (
          <div className="flex items-center space-x-1 text-gray-500 italic">
            <span>⚠️</span>
            <span>No mappings yet</span>
          </div>
        )}
      </div>

      {/* Connection Handle for chaining */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white"
      />
    </div>
  );
};

export default memo(EntitySchemaNode);
