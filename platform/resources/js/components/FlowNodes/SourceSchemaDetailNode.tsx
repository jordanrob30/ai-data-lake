import { Handle, Position, NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { generateSourceHandleId } from '../../utils/handleIdHelpers';

interface SourceSchemaDetailData {
  label: string;
  hash: string;
  tenant: string;
  fields: Array<{
    name: string;
    type: string;
    format?: string;
    required: boolean;
  }>;
  pending_records: number;
  created_at: string;
}

const SourceSchemaDetailNode = ({ data, selected }: NodeProps<SourceSchemaDetailData>) => {
  return (
    <div
      className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-2 rounded-lg p-4 min-w-[320px] shadow-md transition-all cursor-pointer hover:shadow-xl ${
        selected ? 'border-indigo-500 shadow-lg' : 'border-blue-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3 pb-3 border-b border-blue-200">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xl">📊</span>
            <h3 className="font-semibold text-gray-900 text-sm">{data.label}</h3>
          </div>
          <p className="text-xs text-gray-600">Bronze Schema</p>
        </div>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {data.fields?.length || 0} fields
        </span>
      </div>

      {/* Fields List with Handles */}
      <div className="space-y-1">
        {data.fields?.map((field, index) => {
          const handleId = generateSourceHandleId(data.hash, field.name);

          return (
            <div
              key={index}
              className="relative bg-white rounded px-3 py-2 border border-blue-100 hover:border-blue-300 transition-colors h-[50px] flex items-center"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-medium text-gray-900 truncate">
                      {field.name}
                    </span>
                    {field.required && (
                      <span className="text-red-500 text-xs">*</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-0.5">
                    <span className="text-xs text-indigo-600 font-medium">
                      {field.type}
                    </span>
                    {field.format && (
                      <span className="text-xs text-gray-500">
                        ({field.format})
                      </span>
                    )}
                  </div>
                </div>

                {/* Field-specific handle on the right */}
                <Handle
                  type="source"
                  position={Position.Right}
                  id={handleId}
                  className="!w-2 !h-2 !bg-indigo-500 !border-2 !border-white !relative !right-0 !transform-none"
                  style={{ position: 'relative', right: 0, transform: 'none' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="font-mono truncate">{data.hash}</span>
        </div>
      </div>
    </div>
  );
};

export default memo(SourceSchemaDetailNode);
