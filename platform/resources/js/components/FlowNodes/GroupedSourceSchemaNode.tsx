import { Handle, Position, NodeProps, useReactFlow } from '@xyflow/react';
import { memo, useState, useCallback, useEffect } from 'react';
import { generateSourceHandleId } from '../../utils/handleIdHelpers';

interface SchemaInGroup {
  id: string;
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

interface GroupedSourceSchemaData {
  schemas: SchemaInGroup[];
  activeSchemaIndex: number;
  groupId: string;
  targetEntityId: string;
}

const GroupedSourceSchemaNode = ({ data, selected, id }: NodeProps<GroupedSourceSchemaData>) => {
  const [activeIndex, setActiveIndex] = useState(data.activeSchemaIndex || 0);
  const { setNodes } = useReactFlow();

  const activeSchema = data.schemas[activeIndex];

  /**
   * Log when active schema changes
   * Since we now have handles for all schemas, we don't need to hide edges
   */
  useEffect(() => {
    const activeSchemaId = data.schemas[activeIndex].id;
    console.log(`[GroupedSourceSchemaNode] Switching to schema ${activeSchemaId} (index ${activeIndex})`);

    // No longer hiding edges - all schemas have handles so all edges can be visible
  }, [activeIndex, data.schemas]);

  /**
   * Handle switching between schemas in the group
   */
  const handleSchemaSwitch = useCallback((newIndex: number) => {
    if (newIndex === activeIndex) return;

    // Update local state - this will trigger the useEffect above
    setActiveIndex(newIndex);

    // Update this node's data to reflect the new active schema
    setNodes(nodes => nodes.map(node =>
      node.id === id
        ? { ...node, data: { ...node.data, activeSchemaIndex: newIndex } }
        : node
    ));
  }, [activeIndex, id, setNodes]);

  return (
    <div
      className={`bg-gradient-to-br from-blue-50 to-indigo-50 border-2 rounded-lg p-4 min-w-[320px] shadow-md transition-all cursor-pointer hover:shadow-xl ${
        selected ? 'border-indigo-500 shadow-lg' : 'border-blue-300'
      }`}
    >
      {/* Group Header with Schema Selector */}
      <div className="mb-3 pb-3 border-b border-blue-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Grouped Schemas</span>
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
              {data.schemas.length}
            </span>
          </div>
          <span className="text-xs text-gray-500">→ Same Entity</span>
        </div>

        {/* Tab-style Schema Selector */}
        <div className="flex gap-1 flex-wrap">
          {data.schemas.map((schema, idx) => (
            <button
              key={schema.id}
              onClick={() => handleSchemaSwitch(idx)}
              className={`nodrag nopan px-3 py-1.5 text-xs rounded font-medium transition-all ${
                idx === activeIndex
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
              title={`Switch to ${schema.label}`}
            >
              {schema.label || `Schema ${idx + 1}`}
            </button>
          ))}
        </div>
      </div>

      {/* Active Schema Header */}
      <div className="flex items-start justify-between mb-3 pb-3 border-b border-blue-200">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xl">📊</span>
            <h3 className="font-semibold text-gray-900 text-sm">{activeSchema.label}</h3>
          </div>
          <p className="text-xs text-gray-600">Bronze Schema • Active</p>
        </div>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          {activeSchema.fields?.length || 0} fields
        </span>
      </div>

      {/* Fields List with Handles - Only for Active Schema */}
      <div className="space-y-1">
        {activeSchema.fields?.map((field, index) => {
          const handleId = generateSourceHandleId(activeSchema.hash, field.name);

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
                  className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-white"
                  style={{
                    position: 'absolute',
                    right: '-6px',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Hidden handles for all other schemas in the group */}
      {data.schemas.map((schema, schemaIndex) => {
        if (schemaIndex === activeIndex) return null; // Skip active schema as it's already rendered above

        return schema.fields?.map((field, fieldIndex) => {
          const handleId = generateSourceHandleId(schema.hash, field.name);
          // Position handles to match where visible fields would be
          // Header (120px) + Schema info (90px) + field position
          const baseOffset = 210; // 120px header + 90px schema info
          const fieldHeight = 54; // Height of each field row
          const topPosition = baseOffset + (fieldIndex * fieldHeight) + (fieldHeight / 2); // Center of field

          return (
            <Handle
              key={handleId}
              type="source"
              position={Position.Right}
              id={handleId}
              className="!w-0 !h-0 !opacity-0 !pointer-events-none"
              style={{
                position: 'absolute',
                top: `${topPosition}px`,
                right: '-6px',
                pointerEvents: 'none'
              }}
            />
          );
        });
      })}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="font-mono truncate">{activeSchema.hash}</span>
          {activeSchema.pending_records > 0 && (
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
              {activeSchema.pending_records} pending
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default memo(GroupedSourceSchemaNode);