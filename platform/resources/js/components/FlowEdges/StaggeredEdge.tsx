import { FC } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import InteractiveEdgeLabel from './InteractiveEdgeLabel';

const StaggeredEdge: FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
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
  // Split the path and insert the offset
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
      {label && (
        <EdgeLabelRenderer>
          <InteractiveEdgeLabel
            label={label as string}
            edgeId={id}
            centerX={centerX}
            centerY={centerY}
            labelStyle={labelStyle}
            labelBgStyle={labelBgStyle}
            labelBgPadding={labelBgPadding}
            labelBgBorderRadius={labelBgBorderRadius}
            mappingType={data?.mappingType || 'direct'}
            onConvertToFormula={data?.onConvertToFormula}
          />
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default StaggeredEdge;
