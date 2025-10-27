import { FC } from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';
import InteractiveEdgeLabel from './InteractiveEdgeLabel';

/**
 * FormulaEdge - A smooth step edge optimized for formula node connections
 * Uses smooth step path for cleaner routing with right angles
 */
const FormulaEdge: FC<EdgeProps> = ({
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
  // Use smoothstep path for cleaner routing
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 10, // Rounded corners for smoother appearance
    offset: 0, // No offset needed, smoothstep handles it well
  });

  // Adjust label position slightly for better visibility
  const adjustedLabelY = labelY + (data?.labelOffsetY || 0);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: data?.isFormulaEdge ? '#8b5cf6' : (style.stroke || '#6366f1'),
          strokeWidth: style.strokeWidth || 2,
          cursor: 'pointer',
        }}
        markerEnd={markerEnd || {
          type: 'arrowclosed',
          color: data?.isFormulaEdge ? '#8b5cf6' : '#6366f1',
        }}
        className="hover:!stroke-[3px] transition-all"
      />
      {label && (
        <EdgeLabelRenderer>
          <InteractiveEdgeLabel
            label={label as string}
            edgeId={id}
            centerX={labelX}
            centerY={adjustedLabelY}
            labelStyle={{
              ...labelStyle,
              fill: data?.isFormulaEdge ? '#8b5cf6' : (labelStyle?.fill || '#6366f1'),
            }}
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

export default FormulaEdge;