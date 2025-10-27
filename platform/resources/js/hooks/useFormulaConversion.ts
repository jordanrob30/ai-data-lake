/**
 * Custom hook for converting edges to formula nodes
 */

import { useState, useCallback } from 'react';
import { Node, useReactFlow } from '@xyflow/react';
import { FormulaNodeData } from '../types';
import { createFormulaEdge } from '../utils/edgeHelpers';

export function useFormulaConversion() {
  const [formulaNodeCounter, setFormulaNodeCounter] = useState(0);
  const { getNodes, getEdges, setNodes, setEdges, screenToFlowPosition } = useReactFlow();

  /**
   * Find optimal Y position for formula node to avoid overlap
   */
  const findOptimalYPosition = useCallback((
    nodes: Node[],
    baseY: number,
    targetNodeId: string
  ): number => {
    // Find all formula nodes that connect to the same target
    const existingFormulaNodes = nodes.filter(n =>
      n.type === 'formulaNode'
    );

    // If no formula nodes exist, use base position
    if (existingFormulaNodes.length === 0) {
      return baseY;
    }

    // Collect Y positions of existing formula nodes near this target
    const edges = getEdges();
    const formulaNodesForTarget = existingFormulaNodes.filter(node => {
      // Check if this formula node connects to our target
      return edges.some(edge =>
        edge.source === node.id && edge.target === targetNodeId
      );
    });

    if (formulaNodesForTarget.length === 0) {
      return baseY;
    }

    // Find gaps in existing positions
    const occupiedYPositions = formulaNodesForTarget
      .map(n => n.position.y)
      .sort((a, b) => a - b);

    // Minimum spacing between formula nodes
    const minSpacing = 180;

    // Try to find a gap
    let optimalY = baseY;
    let minDistance = Infinity;

    // Check positions above and below each existing node
    for (const existingY of occupiedYPositions) {
      const candidates = [
        existingY - minSpacing,
        existingY + minSpacing
      ];

      for (const candidateY of candidates) {
        // Check if this position has enough clearance
        const hasSpace = occupiedYPositions.every(y =>
          Math.abs(candidateY - y) >= minSpacing - 10
        );

        if (hasSpace) {
          const distance = Math.abs(candidateY - baseY);
          if (distance < minDistance) {
            minDistance = distance;
            optimalY = candidateY;
          }
        }
      }
    }

    // If no gap found, place below all existing nodes
    if (optimalY === baseY) {
      const maxY = Math.max(...occupiedYPositions);
      optimalY = maxY + minSpacing;
    }

    return optimalY;
  }, [getEdges]);

  /**
   * Convert an edge to a formula node
   */
  const convertEdgeToFormula = useCallback((
    edgeId: string,
    mouseX?: number,
    mouseY?: number
  ) => {
    const nodes = getNodes();
    const edges = getEdges();

    // Find the edge
    const edge = edges.find((e: any) => e.id === edgeId);
    if (!edge) {
      return null;
    }

    // Find source and target nodes
    const sourceNode = nodes.find((n: any) => n.id === edge.source);
    const targetNode = nodes.find((n: any) => n.id === edge.target);

    if (!sourceNode || !targetNode) {
      return null;
    }

    // Extract field information from edge data
    const sourceField = edge.data?.sourceField || 'unknown';
    const targetField = edge.data?.targetField || 'unknown';

    // Get only the connected source field (not all fields from the schema)
    const fields = (sourceNode.data?.fields as any[]) || [];
    const sourceFieldData = fields.find((f: any) => f.name === sourceField);
    const formattedSourceFields = sourceFieldData ? [{
      name: sourceFieldData.name,
      type: sourceFieldData.type,
    }] : [{
      name: sourceField,
      type: 'unknown',
    }];

    // Calculate formula node position
    let nodeX, nodeY;
    if (mouseX !== undefined && mouseY !== undefined) {
      // Convert screen coordinates to flow coordinates
      const flowPosition = screenToFlowPosition({ x: mouseX, y: mouseY });
      // Offset to center the node at cursor
      nodeX = flowPosition.x - 160; // Half of node width (320px / 2)
      nodeY = flowPosition.y - 150; // Approximate half of node height
    } else {
      // Calculate X position with staggering based on existing formula nodes
      const sourceNodeWidth = 320; // Standard node width
      const baseX = sourceNode.position.x + sourceNodeWidth + 100;

      // Count formula nodes between source and target for X staggering
      const formulaNodesBetween = nodes.filter(n =>
        n.type === 'formulaNode' &&
        n.position.x > sourceNode.position.x &&
        n.position.x < targetNode.position.x
      );

      // Stagger X position slightly based on count (max 3 columns)
      const xStaggerIndex = formulaNodesBetween.length % 3;
      nodeX = baseX + (xStaggerIndex * 150); // 150px between columns

      // For vertical positioning, align with the specific field handles if available
      let sourceY = sourceNode.position.y;
      let targetY = targetNode.position.y;

      // If nodes are expanded (detailed), calculate field-specific Y positions
      if (edge.sourceHandle && sourceNode.type?.includes('Detail')) {
        const sourceFields = (sourceNode.data?.fields as any[]) || [];
        const fieldIndex = sourceFields.findIndex((f: any) =>
          edge.sourceHandle?.includes(f.name)
        );
        const safeFieldIndex = fieldIndex >= 0 ? fieldIndex : 0;
        sourceY += 110 + (safeFieldIndex * 90); // Header height + field rows
      }

      if (edge.targetHandle && targetNode.type?.includes('Detail')) {
        const targetFields = (targetNode.data?.fields as any[]) || [];
        const fieldIndex = targetFields.findIndex((f: any) =>
          edge.targetHandle?.includes(f.name)
        );
        const safeFieldIndex = fieldIndex >= 0 ? fieldIndex : 0;
        targetY += 110 + (safeFieldIndex * 70); // Header height + field rows
      }

      // Calculate base Y position at midpoint
      const baseY = (sourceY + targetY) / 2 - 150;

      // Find optimal Y position to avoid overlap
      nodeY = findOptimalYPosition(nodes, baseY, targetNode.id);
    }

    // Create formula node ID
    const formulaNodeId = `formula-${formulaNodeCounter}`;
    setFormulaNodeCounter(c => c + 1);

    // Create the formula node
    const formulaNodeData: FormulaNodeData = {
      label: `Transform: ${sourceField} → ${targetField}`,
      formula: `$${sourceField}`, // Default passthrough formula
      formulaLanguage: 'JSONata',
      sourceFields: formattedSourceFields,
      targetField,
      collapsed: false, // Start expanded for editing
      onSave: (formula: string) => {
        // Update the formula node data
        setNodes((nds) =>
          nds.map((n) =>
            n.id === formulaNodeId
              ? { ...n, data: { ...n.data, formula } }
              : n
          )
        );
      },
      onDelete: () => {
        // Remove the formula node and its edges
        setNodes((nds) => nds.filter((n) => n.id !== formulaNodeId));
        setEdges((eds) => eds.filter((e) =>
          e.source !== formulaNodeId && e.target !== formulaNodeId
        ));
      },
    };

    const formulaNode: Node = {
      id: formulaNodeId,
      type: 'formulaNode',
      position: { x: nodeX, y: nodeY },
      data: formulaNodeData as any,
    };

    // Create edges
    const edgeToFormula = createFormulaEdge(
      `${edge.source}-to-${formulaNodeId}`,
      edge.source,
      formulaNodeId,
      edge.sourceHandle,
      'input',
      sourceField,
      {
        sourceField,
        onConvertToFormula: convertEdgeToFormula,
      }
    );

    const edgeFromFormula = createFormulaEdge(
      `${formulaNodeId}-to-${edge.target}`,
      formulaNodeId,
      edge.target,
      'output',
      edge.targetHandle,
      targetField,
      {
        sourceField: targetField,
        onConvertToFormula: convertEdgeToFormula,
      }
    );

    // Update state: add formula node, remove original edge, add new edges
    setNodes((nds) => [...nds, formulaNode]);
    setEdges((eds) => [
      ...eds.filter(e => e.id !== edgeId),
      edgeToFormula,
      edgeFromFormula,
    ]);

    return formulaNodeId;
  }, [formulaNodeCounter, setNodes, setEdges, screenToFlowPosition, getNodes, getEdges, findOptimalYPosition]);

  return {
    convertEdgeToFormula,
    formulaNodeCounter,
  };
}