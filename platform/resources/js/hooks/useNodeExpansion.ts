/**
 * Custom hook for managing node expansion state
 */

import { useState, useCallback, useMemo } from 'react';
import { Node, Edge } from '@xyflow/react';

export function useNodeExpansion(edges: Edge[]) {
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());
  const [activeMappingNodes, setActiveMappingNodes] = useState<Set<string>>(new Set());

  // Memoize the edge connections for better performance
  const edgeConnections = useMemo(() => {
    const connections = new Map<string, Set<string>>();

    edges.forEach(edge => {
      // Add source -> target connection
      if (!connections.has(edge.source)) {
        connections.set(edge.source, new Set());
      }
      connections.get(edge.source)!.add(edge.target);

      // Add target -> source connection (reverse)
      if (!connections.has(edge.target)) {
        connections.set(edge.target, new Set());
      }
      connections.get(edge.target)!.add(edge.source);
    });

    return connections;
  }, [edges]);

  /**
   * Toggle node expansion state
   */
  const toggleNodeExpansion = useCallback((nodeId: string, nodeType?: string) => {
    const isEntityNode = nodeType === 'entitySchema' || nodeType === 'entitySchemaDetail';
    const isSourceNode = nodeType === 'sourceSchema' || nodeType === 'sourceSchemaDetail' ||
                         nodeType === 'pendingSchema' || nodeType === 'pendingSchemaDetail';
    const nodesToExpand = new Set<string>([nodeId]);

    // Use memoized connections for better performance
    const connectedNodes = edgeConnections.get(nodeId) || new Set<string>();

    if (isSourceNode) {
      // For source/bronze nodes: only expand downstream targets (silver entities)
      edges.forEach(edge => {
        if (edge.source === nodeId) {
          nodesToExpand.add(edge.target);
        }
      });
    } else if (isEntityNode) {
      // For entity/silver nodes: expand all connected sources (bronze schemas)
      edges.forEach(edge => {
        if (edge.target === nodeId) {
          nodesToExpand.add(edge.source);
        }
      });
    }

    // Toggle expansion - if node is already expanded, collapse it and related nodes
    if (expandedNodeIds.has(nodeId)) {
      setExpandedNodeIds(prev => {
        const newSet = new Set(prev);
        nodesToExpand.forEach(id => newSet.delete(id));
        return newSet;
      });
      // Clear active mapping when collapsing
      setActiveMappingNodes(new Set());
      return false; // Return collapsed state
    }

    setExpandedNodeIds(prev => new Set([...prev, ...nodesToExpand]));
    return true; // Return expanded state
  }, [edges, expandedNodeIds, edgeConnections]);

  /**
   * Expand specific nodes
   */
  const expandNodes = useCallback((nodeIds: string[]) => {
    setExpandedNodeIds(prev => new Set([...prev, ...nodeIds]));
  }, []);

  /**
   * Collapse specific nodes
   */
  const collapseNodes = useCallback((nodeIds: string[]) => {
    setExpandedNodeIds(prev => {
      const newSet = new Set(prev);
      nodeIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  }, []);

  /**
   * Clear all expanded nodes
   */
  const clearExpanded = useCallback(() => {
    setExpandedNodeIds(new Set());
  }, []);

  /**
   * Set active mapping nodes (for highlighting)
   */
  const setMappingNodes = useCallback((nodeIds: string[]) => {
    setActiveMappingNodes(new Set(nodeIds));
  }, []);

  /**
   * Clear active mapping nodes
   */
  const clearMappingNodes = useCallback(() => {
    setActiveMappingNodes(new Set());
  }, []);

  /**
   * Check if a node should be shown in detailed view
   */
  const isNodeExpanded = useCallback((nodeId: string) => {
    return expandedNodeIds.has(nodeId);
  }, [expandedNodeIds]);

  /**
   * Get the appropriate node type based on expansion state
   */
  const getNodeType = useCallback((baseType: string, nodeId: string): string => {
    if (!isNodeExpanded(nodeId)) {
      return baseType;
    }

    // Convert to detailed type based on base type
    switch (baseType) {
      case 'pendingSchema':
        return 'pendingSchemaDetail';
      case 'sourceSchema':
        return 'sourceSchemaDetail';
      case 'entitySchema':
        return 'entitySchemaDetail';
      default:
        return baseType;
    }
  }, [isNodeExpanded]);

  return {
    expandedNodeIds,
    activeMappingNodes,
    toggleNodeExpansion,
    expandNodes,
    collapseNodes,
    clearExpanded,
    setMappingNodes,
    clearMappingNodes,
    isNodeExpanded,
    getNodeType,
  };
}