import { Handle, Position, NodeProps } from '@xyflow/react';
import { memo } from 'react';
import { generateTargetHandleId } from '../../utils/handleIdHelpers';

interface EntitySchemaDetailData {
  label: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
  }>;
  field_path?: string;
  standalone?: boolean;
}

const EntitySchemaDetailNode = ({ data, selected }: NodeProps<EntitySchemaDetailData>) => {
  return (
    <div
      className={`bg-gradient-to-br from-green-50 to-emerald-50 border-2 rounded-lg p-4 min-w-[320px] shadow-md transition-all cursor-pointer hover:shadow-xl ${
        selected ? 'border-emerald-500 shadow-lg' : 'border-green-300'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3 pb-3 border-b border-green-200">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xl">🏛️</span>
            <h3 className="font-semibold text-gray-900 text-sm">{data.label}</h3>
          </div>
          <p className="text-xs text-gray-600">Silver Entity</p>
        </div>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
          {data.fields?.length || 0} fields
        </span>
      </div>

      {/* Fields List with Handles */}
      <div className="space-y-1">
        {data.fields?.map((field, index) => {
          const handleId = generateTargetHandleId(data.label, field.name);

          return (
            <div
              key={index}
              className="relative bg-white rounded px-3 py-2 border border-green-100 hover:border-green-300 transition-colors h-[50px] flex items-center"
            >
              <div className="flex items-center justify-between w-full">
                {/* Field-specific handle on the left */}
                <Handle
                  type="target"
                  position={Position.Left}
                  id={handleId}
                  className="!w-2.5 !h-2.5 !bg-emerald-500 !border !border-white !relative !left-0 !transform-none hover:!w-3.5 hover:!h-3.5 hover:!bg-emerald-600 transition-all cursor-crosshair !shadow-sm"
                  style={{
                    position: 'relative',
                    left: 0,
                    transform: 'none',
                    opacity: 0.9,
                    zIndex: 5,
                  }}
                />

                <div className="flex-1 min-w-0 ml-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-medium text-gray-900 truncate">
                      {field.name}
                    </span>
                    {field.required && (
                      <span className="text-red-500 text-xs">*</span>
                    )}
                  </div>
                  <span className="text-xs text-emerald-600 font-medium">
                    {field.type}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      {data.field_path && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="text-xs text-gray-500">
            <span className="font-medium">Path:</span>
            <span className="ml-1 font-mono">{data.field_path}</span>
          </div>
        </div>
      )}

      {data.standalone && (
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="flex items-center space-x-1 text-xs text-gray-500 italic">
            <span>⚠️</span>
            <span>No mappings yet</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(EntitySchemaDetailNode);
