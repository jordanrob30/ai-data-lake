import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface ConnectionNodeData {
  fieldCount: number;
  sourceSchemaId: string;
  targetEntityId: string;
  color?: string;
}

/**
 * Connection Node - Intermediate node showing a plug socket icon
 * Positioned between bronze (source) and silver (entity) nodes
 * Similar to formula nodes but simpler - just shows connection status
 */
const ConnectionNode = memo(({ data, selected }: NodeProps<ConnectionNodeData>) => {
  const color = data.color || '#6366f1';

  return (
    <div
      className={`bg-white border-2 rounded-lg p-4 shadow-md hover:shadow-lg transition-all flex items-center justify-center ${
        selected ? 'ring-2 ring-offset-2' : ''
      }`}
      style={{
        borderColor: color,
        ...(selected && { ringColor: color }),
        minWidth: '80px',
        minHeight: '60px',
      }}
      title={`${data.fieldCount || 0} field mappings`}
    >
      {/* Input handle on the left (from bronze schema) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2"
        style={{
          background: color,
          borderColor: 'white',
        }}
      />

      {/* Plug socket icon - larger */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color }}
      >
        {/* Plug socket icon */}
        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
        <circle cx="12" cy="10" r="2" />
        <line x1="12" y1="18" x2="12" y2="22" />
      </svg>

      {/* Output handle on the right (to silver entity) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2"
        style={{
          background: color,
          borderColor: 'white',
        }}
      />
    </div>
  );
});

ConnectionNode.displayName = 'ConnectionNode';

export default ConnectionNode;
