import { FC } from 'react';

interface InteractiveEdgeLabelProps {
  label: string;
  edgeId: string;
  centerX: number;
  centerY: number;
  labelStyle?: {
    fill?: string;
    fontWeight?: number;
    fontSize?: number;
  };
  labelBgStyle?: {
    fill?: string;
    fillOpacity?: number;
  };
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  mappingType?: 'direct' | 'formula';
  onConvertToFormula?: (edgeId: string, mouseX?: number, mouseY?: number) => void;
}

const InteractiveEdgeLabel: FC<InteractiveEdgeLabelProps> = ({
  label,
  edgeId,
  centerX,
  centerY,
  labelStyle,
  labelBgStyle,
  labelBgPadding,
  labelBgBorderRadius,
  mappingType = 'direct',
  onConvertToFormula,
}) => {
  const handleClick = (event: React.MouseEvent) => {
    if (mappingType === 'direct' && onConvertToFormula) {
      // Pass the click coordinates
      onConvertToFormula(edgeId, event.clientX, event.clientY);
    }
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'absolute',
        transform: `translate(-50%, -50%) translate(${centerX}px, ${centerY}px)`,
        background: labelBgStyle?.fill || '#ffffff',
        padding: `${labelBgPadding?.[0] || 2}px ${labelBgPadding?.[1] || 4}px`,
        borderRadius: labelBgBorderRadius || 2,
        fontSize: labelStyle?.fontSize || 12,
        fontWeight: labelStyle?.fontWeight || 500,
        color: labelStyle?.fill || '#000',
        cursor: mappingType === 'direct' ? 'pointer' : 'default',
        pointerEvents: 'all',
        transition: 'all 0.2s ease',
        border: '1px solid transparent',
      }}
      className={mappingType === 'direct' ? 'nodrag nopan hover:shadow-md hover:border-purple-300' : 'nodrag nopan'}
      title={mappingType === 'direct' ? 'Click to convert to formula' : 'Formula mapping'}
    >
      {label}
      {mappingType === 'formula' && (
        <span className="ml-1 text-xs" style={{ color: '#8b5cf6' }}>
          ƒ
        </span>
      )}
    </div>
  );
};

export default InteractiveEdgeLabel;
