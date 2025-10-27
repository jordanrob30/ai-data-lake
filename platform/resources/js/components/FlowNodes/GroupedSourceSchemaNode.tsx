import { Handle, Position, NodeProps, useReactFlow, useStore } from '@xyflow/react';
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
  const { setNodes, setEdges, getEdges } = useReactFlow();

  // Use useStore to get edge count for dependency tracking
  const edgeCount = useStore((state) => state.edges.length);

  const activeSchema = data.schemas[activeIndex];

  /**
   * Hide edges and intermediate nodes from non-active schemas when switching
   */
  useEffect(() => {
    const activeSchemaId = data.schemas[activeIndex].id;
    const activeSchemaHash = data.schemas[activeIndex].hash;
    console.log(`[GroupedSourceSchemaNode] Switching to schema ${activeSchemaId} (hash: ${activeSchemaHash}, index ${activeIndex})`);
    console.log(`[GroupedSourceSchemaNode] Group node ID: ${id}`);
    console.log(`[GroupedSourceSchemaNode] Schemas in group:`, data.schemas.map(s => ({ id: s.id, label: s.label })));

    // Get current edges to check if they're ready
    const currentEdges = getEdges();
    console.log(`[GroupedSourceSchemaNode] Current edge count: ${currentEdges.length}`);

    // If no edges yet, skip the visibility update (will run again when edges are added)
    if (currentEdges.length === 0) {
      console.log(`[GroupedSourceSchemaNode] No edges yet, skipping visibility update`);
      return;
    }

    // Get all schema IDs in this group
    const schemaIdsInGroup = data.schemas.map(s => s.id);

    // We need to identify formula/connection nodes by looking at edges
    // First, collect all formula/connection node IDs that are connected to this grouped node
    const intermediateNodeIds = new Set<string>();
    const nodeVisibility = new Map<string, boolean>();

    // Process edges to identify intermediate nodes
    console.log(`[GroupedSourceSchemaNode] Processing ${currentEdges.length} edges`);

    // First pass: identify intermediate nodes and their visibility
    currentEdges.forEach(edge => {
      // Check edges FROM the grouped node
      if (edge.source === id) {
        const originalSourceId = edge.data?.originalSourceId;
        const targetId = edge.target;

        // Check if target is a formula or connection node
        if (targetId.startsWith('formula-') || targetId.startsWith('connection-')) {
          intermediateNodeIds.add(targetId);

          console.log(`[GroupedSourceSchemaNode] Found intermediate node: ${targetId}, originalSourceId: ${originalSourceId}`);

          // Determine if this node should be visible
          if (originalSourceId && schemaIdsInGroup.includes(originalSourceId)) {
            const shouldBeVisible = originalSourceId === activeSchemaId;
            nodeVisibility.set(targetId, shouldBeVisible);
            console.log(`[GroupedSourceSchemaNode] ${targetId} visibility: ${shouldBeVisible} (originalSourceId=${originalSourceId}, activeSchemaId=${activeSchemaId})`);
          } else {
            console.log(`[GroupedSourceSchemaNode] ${targetId} originalSourceId (${originalSourceId}) not in group or missing`);
          }
        }
      }

      // Also check for constant-value formula nodes (they have edges TO entities but not FROM bronze schemas)
      // These formula nodes will have names like formula-saved-1-* or formula-saved-3-*
      if (edge.source.startsWith('formula-saved-')) {
        const formulaId = edge.source;

        // Extract the schema number from the formula ID (e.g., formula-saved-1-2 -> schema-1)
        const match = formulaId.match(/formula-saved-(\d+)-/);
        if (match) {
          const schemaNum = match[1];
          const correspondingSchemaId = `schema-${schemaNum}`;

          // Check if this schema is in our group
          if (schemaIdsInGroup.includes(correspondingSchemaId)) {
            // This is a formula node that belongs to one of our schemas
            if (!intermediateNodeIds.has(formulaId)) {
              intermediateNodeIds.add(formulaId);
              const shouldBeVisible = correspondingSchemaId === activeSchemaId;
              nodeVisibility.set(formulaId, shouldBeVisible);
              console.log(`[GroupedSourceSchemaNode] Found constant formula: ${formulaId}, schema: ${correspondingSchemaId}, visible: ${shouldBeVisible}`);
            }
          }
        }
      }
    });

    // Update edge visibility
    setEdges(edges => edges.map(edge => {
      // Check if this edge originates from this grouped node
      if (edge.source === id) {
        const originalSourceId = edge.data?.originalSourceId;

        // Check if this edge belongs to one of our schemas
        if (originalSourceId && schemaIdsInGroup.includes(originalSourceId)) {
          const isFromActiveSchema = originalSourceId === activeSchemaId;

          return {
            ...edge,
            hidden: !isFromActiveSchema,
            style: {
              ...edge.style,
              display: isFromActiveSchema ? undefined : 'none',
              opacity: isFromActiveSchema ? 1 : 0
            }
          };
        }
      }

      // Also hide/show edges FROM intermediate nodes based on their visibility
      if (intermediateNodeIds.has(edge.source)) {
        const shouldBeVisible = nodeVisibility.get(edge.source) ?? true;
        return {
          ...edge,
          hidden: !shouldBeVisible,
          style: {
            ...edge.style,
            display: shouldBeVisible ? undefined : 'none',
            opacity: shouldBeVisible ? 1 : 0
          }
        };
      }

      // Also check edges that connect TO this grouped node
      if (edge.target === id) {
        const originalSourceId = edge.data?.originalSourceId;

        if (originalSourceId && schemaIdsInGroup.includes(originalSourceId)) {
          const isFromActiveSchema = originalSourceId === activeSchemaId;

          return {
            ...edge,
            hidden: !isFromActiveSchema,
            style: {
              ...edge.style,
              display: isFromActiveSchema ? undefined : 'none',
              opacity: isFromActiveSchema ? 1 : 0
            }
          };
        }
      }

      return edge;
    }));

    // Now update node visibility based on what we found
    console.log(`[GroupedSourceSchemaNode] Updating node visibility. Intermediate nodes:`, Array.from(intermediateNodeIds));
    console.log(`[GroupedSourceSchemaNode] Node visibility map:`, Array.from(nodeVisibility.entries()));

    setNodes(nodes => nodes.map(node => {
      if (intermediateNodeIds.has(node.id)) {
        const shouldBeVisible = nodeVisibility.get(node.id) ?? true;
        console.log(`[GroupedSourceSchemaNode] Setting node ${node.id} hidden=${!shouldBeVisible}`);
        return {
          ...node,
          hidden: !shouldBeVisible
        };
      }
      return node;
    }));
  }, [activeIndex, data.schemas, id, setNodes, setEdges, getEdges, edgeCount]); // Re-run when edge count changes

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
      {/* These are needed so React Flow can find the handles, but we'll hide the edges */}
      {data.schemas.map((schema, schemaIndex) => {
        if (schemaIndex === activeIndex) return null; // Skip active schema as it's already rendered above

        return schema.fields?.map((field, fieldIndex) => {
          const handleId = generateSourceHandleId(schema.hash, field.name);
          // Position handles to match where visible fields would be
          // Calculations based on actual DOM measurements:
          const containerPadding = 16;
          const groupHeaderHeight = 75;
          const activeSchemaHeaderHeight = 75;
          const fieldHeight = 50;
          const fieldGap = 4;

          const baseOffset = containerPadding + groupHeaderHeight + activeSchemaHeaderHeight;
          const fieldOffset = fieldIndex * (fieldHeight + fieldGap);
          const fieldCenter = fieldHeight / 2;
          const topPosition = baseOffset + fieldOffset + fieldCenter;

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