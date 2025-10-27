/**
 * Custom hook for managing React Flow layout
 */

import { useCallback } from 'react';
import { Node, useReactFlow } from '@xyflow/react';
import { applyLayout, calculateBounds, createPaddedBounds } from '../utils/layoutHelpers';

export function useFlowLayout() {
  const { fitBounds, fitView, setNodes, getEdges } = useReactFlow();

  /**
   * Fit view to specific nodes with intelligent padding
   */
  const fitToNodes = useCallback((
    nodesToFit: Node[],
    options?: { padding?: number; duration?: number }
  ) => {
    if (nodesToFit.length === 0) return;

    const bounds = calculateBounds(nodesToFit);
    const paddedBounds = createPaddedBounds(
      bounds,
      options?.padding ?? 200,
      1.4 // zoom buffer
    );

    fitBounds(paddedBounds, {
      duration: options?.duration ?? 600,
    });
  }, [fitBounds]);

  /**
   * Apply automatic layout to all nodes
   */
  const applyAutoLayout = useCallback(() => {
    const edges = getEdges();

    setNodes((nds) => {
      const currentNodes = nds as Node[];
      const layouted = applyLayout(currentNodes, edges);
      return layouted as any;
    });

    // Fit view after layout
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 600 });
    }, 100);
  }, [setNodes, getEdges, fitView]);

  /**
   * Reset view to fit all nodes
   */
  const resetView = useCallback(() => {
    fitView({
      padding: 0.2,
      duration: 600,
      maxZoom: 1,
    });
  }, [fitView]);

  return {
    fitToNodes,
    applyAutoLayout,
    resetView,
  };
}