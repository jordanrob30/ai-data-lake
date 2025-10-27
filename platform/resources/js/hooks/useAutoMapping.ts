/**
 * Custom hook for auto-mapping fields between schemas and entities
 */

import { useState, useCallback } from 'react';
import { Edge, useReactFlow } from '@xyflow/react';
import { FieldMatch } from '../types';
import { createFieldMappingEdge } from '../utils/edgeHelpers';
import { generateSourceHandleId, generateTargetHandleId } from '../utils/handleIdHelpers';

export function useAutoMapping() {
  const [autoMappingActive, setAutoMappingActive] = useState(false);
  const [suggestedMappings, setSuggestedMappings] = useState<FieldMatch[]>([]);
  const { setEdges } = useReactFlow();

  /**
   * Auto-map fields between source and target using intelligent matching
   */
  const autoMapFields = useCallback(async (
    sourceSchemaId: number,
    targetEntityId: number,
    sourceNodeId: string,
    targetNodeId: string,
    sourceHash: string,
    targetEntityName: string,
    onConvertToFormula?: (edgeId: string, mouseX?: number, mouseY?: number) => void
  ) => {
    setAutoMappingActive(true);

    try {
      // Fetch field matches from API
      const response = await fetch(`/api/schemas/${sourceSchemaId}/entity-matches/${targetEntityId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch field matches');
      }

      const data = await response.json();
      setSuggestedMappings(data.matches || []);

      // Auto-create edges for high-confidence matches (suggested=true)
      const newEdges: Edge[] = [];

      data.matches.forEach((match: FieldMatch, index: number) => {
        if (match.suggested) {
          // Use correct handle ID format with sanitization
          const sourceHandleId = generateSourceHandleId(sourceHash, match.source_field);
          const targetHandleId = generateTargetHandleId(targetEntityName, match.target_field);

          const edge = createFieldMappingEdge(
            `auto-${sourceNodeId}-${targetNodeId}-${index}`,
            sourceNodeId,
            targetNodeId,
            sourceHandleId,
            targetHandleId,
            match.source_field,
            match.target_field,
            match.source_type || 'unknown',
            index,
            {
              animated: true,
              autoSuggested: true,
              similarity: match.similarity,
              onConvertToFormula,
            }
          );

          newEdges.push(edge);
        }
      });

      // Add new edges to the canvas
      setEdges((eds) => [...eds, ...newEdges]);

      // Dispatch custom event to notify pending schema node
      window.dispatchEvent(new CustomEvent('autoMappingComplete', {
        detail: {
          sourceNodeId,
          targetNodeId,
          suggestedCount: newEdges.length,
          totalMatches: data.matches.length,
        }
      }));

      return { success: true, mappedCount: newEdges.length };
    } catch (error) {
      console.error('Error during auto-mapping:', error);
      return { success: false, error };
    } finally {
      setAutoMappingActive(false);
    }
  }, [setEdges]);

  /**
   * Clear suggested mappings
   */
  const clearSuggestedMappings = useCallback(() => {
    setSuggestedMappings([]);
  }, []);

  /**
   * Remove auto-mapped edges
   */
  const removeAutoMappedEdges = useCallback((sourceNodeId: string, targetNodeId: string) => {
    setEdges((eds) => eds.filter(edge =>
      !(edge.id.startsWith(`auto-${sourceNodeId}-${targetNodeId}`))
    ));
  }, [setEdges]);

  return {
    autoMappingActive,
    suggestedMappings,
    autoMapFields,
    clearSuggestedMappings,
    removeAutoMappedEdges,
  };
}