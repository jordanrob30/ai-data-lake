/**
 * Layout-related utility functions
 */

import { Node, Edge } from '@xyflow/react';
import dagre from 'dagre';
import { calculateActualNodeHeight, getNodeRank } from './nodeHelpers';

/**
 * Dagre-based automatic layout algorithm
 * Uses dagre graph layout library for professional, hierarchical positioning
 * Handles dynamic node heights when expanded/collapsed
 */
export function applyLayout(nodes: Node[], edges: Edge[] = []): Node[] {
  // Create a new directed graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure the graph layout for equal 3-column spacing
  dagreGraph.setGraph({
    rankdir: 'LR', // Left-to-right layout
    nodesep: 15, // Small vertical spacing for compact appearance
    ranksep: 400, // Consistent horizontal spacing between all columns
    edgesep: 10, // Small edge spacing
    marginx: 50, // Horizontal margin for breathing room
    marginy: 30, // Vertical margin
    align: 'UL', // Up-left alignment for consistent top alignment
    ranker: 'network-simplex', // Better for consistent column spacing
  });

  // Add nodes to the graph with their actual dimensions
  nodes.forEach((node) => {
    // Use different widths for different node types to emphasize column separation
    let width = 320; // Default width for schema and entity nodes

    // Make connection and formula nodes narrower for better column separation
    if (node.type === 'connectionNode') {
      width = 100; // Narrower for connection nodes
    } else if (node.type === 'formulaNode') {
      width = 120; // Slightly wider for formula nodes
    }

    const height = calculateActualNodeHeight(node);

    dagreGraph.setNode(node.id, {
      width,
      height,
      // Pass custom rank for node types to control column placement
      rank: getNodeRank(node),
    });
  });

  // Add edges to the graph to establish relationships
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run the layout algorithm
  dagre.layout(dagreGraph);

  // Apply the calculated positions back to the nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    // Preserve manually positioned nodes (formula nodes, user-dragged nodes)
    if (node.type === 'formulaNode' && node.position &&
        !(node.position.x === 0 && node.position.y === 0)) {
      return node; // Keep existing position for formula nodes
    }

    if (node.type === 'newEntity' && node.data?.userPositioned) {
      return node; // Keep user-positioned nodes
    }

    // Get the node's rank (column)
    const nodeRank = getNodeRank(node);

    // Define fixed column positions for consistent spacing
    // Position is the center of each column, accounting for node widths
    const columnPositions = {
      0: 200,   // Bronze schemas (left column) - moved right to prevent cutoff
      1: 650,   // Connection/Formula nodes (middle column) - proper gap from bronze
      2: 1100,  // Silver entities (right column) - proper gap from middle
    };

    // Use fixed column position if available, otherwise use dagre position
    const xPosition = nodeRank !== undefined
      ? columnPositions[nodeRank as keyof typeof columnPositions] || nodeWithPosition.x
      : nodeWithPosition.x;

    // Dagre positions are center-based, React Flow uses top-left
    // So we need to offset by half the width/height
    return {
      ...node,
      position: {
        x: xPosition - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  return layoutedNodes;
}

/**
 * Calculate bounding box for a set of nodes
 */
export function calculateBounds(nodes: Node[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  nodes.forEach(node => {
    const x = node.position.x;
    const y = node.position.y;
    const width = 320; // Approximate node width
    const height = calculateActualNodeHeight(node);

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Create bounds with padding and zoom buffer
 */
export function createPaddedBounds(
  bounds: { x: number; y: number; width: number; height: number },
  padding: number = 200,
  zoomBuffer: number = 1.4
): { x: number; y: number; width: number; height: number } {
  // Add padding
  const paddedBounds = {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + (padding * 2),
    height: bounds.height + (padding * 2),
  };

  // Add zoom buffer for breathing room
  const bufferedBounds = {
    x: paddedBounds.x - (paddedBounds.width * (zoomBuffer - 1)) / 2,
    y: paddedBounds.y - (paddedBounds.height * (zoomBuffer - 1)) / 2,
    width: paddedBounds.width * zoomBuffer,
    height: paddedBounds.height * zoomBuffer,
  };

  return bufferedBounds;
}

/**
 * Schema group type for bronze schemas that map to the same silver entity
 */
export interface SchemaGroup {
  targetEntityId: string;
  sourceSchemaIds: string[];
  groupId: string;
}

/**
 * Detect bronze schemas that should be grouped together
 * Groups are formed when multiple bronze schemas map to the same silver schema
 *
 * @param nodes - All nodes in the flow
 * @param edges - All edges in the flow
 * @returns Array of schema groups
 */
export function detectSchemaGroups(nodes: Node[], edges: Edge[]): SchemaGroup[] {
  // Map: target entity ID -> array of source schema IDs
  const targetToSources = new Map<string, Set<string>>();

  edges.forEach(edge => {
    const source = nodes.find(n => n.id === edge.source);
    const target = nodes.find(n => n.id === edge.target);

    // Only group bronze → silver mappings
    // Check if source is a bronze/source schema type and target is an entity type
    const isSourceNode = source?.type?.includes('source') || source?.type?.includes('pending');
    const isTargetEntity = target?.type?.includes('entity') || target?.type === 'newEntity';

    if (isSourceNode && isTargetEntity && source && target) {
      if (!targetToSources.has(edge.target)) {
        targetToSources.set(edge.target, new Set());
      }
      targetToSources.get(edge.target)!.add(edge.source);
    }
  });

  // Only create groups where multiple sources map to same target
  const groups: SchemaGroup[] = [];
  targetToSources.forEach((sources, targetId) => {
    if (sources.size > 1) {
      const sourceArray = Array.from(sources);
      groups.push({
        targetEntityId: targetId,
        sourceSchemaIds: sourceArray,
        groupId: `group-${targetId}`,
      });
    }
  });

  return groups;
}