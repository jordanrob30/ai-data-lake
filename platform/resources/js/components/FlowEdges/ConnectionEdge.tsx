import { FC } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';

/**
 * Connection Edge - Shows a plug socket icon instead of text labels
 * Used for non-formula edges between bronze and silver nodes
 */
const ConnectionEdge: FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  // Get offset from edge data, default to 0
  const offset = data?.offset || 0;

  // Calculate control points with offset
  const centerX = (sourceX + targetX) / 2;
  const centerY = (sourceY + targetY) / 2 + offset;

  // Create a custom smoothstep-like path with offset
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  });

  // Adjust path to include vertical offset in the middle
  const pathWithOffset = `M ${sourceX},${sourceY} L ${centerX - 50},${sourceY} Q ${centerX},${centerY} ${centerX + 50},${targetY} L ${targetX},${targetY}`;

  return (
    <>
      <BaseEdge
        id={id}
        path={pathWithOffset}
        style={{
          ...style,
          cursor: 'pointer',
        }}
        markerEnd={markerEnd}
        className="hover:!stroke-[3px]"
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${centerX}px, ${centerY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {/* Connection plug icon */}
          <div
            className="bg-white border-2 rounded-full p-1.5 shadow-md hover:shadow-lg transition-shadow"
            style={{
              borderColor: style?.stroke || '#6366f1',
            }}
            title={`${data?.fieldCount || 0} field mappings`}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: style?.stroke || '#6366f1' }}
            >
              {/* Plug socket icon */}
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
              <circle cx="12" cy="10" r="2" />
              <line x1="12" y1="18" x2="12" y2="22" />
            </svg>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default ConnectionEdge;
