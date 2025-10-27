/**
 * Edge-related utility functions
 */

import { Node, Edge, MarkerType } from '@xyflow/react';
import { FlowData } from '../types';
import { getTypeColor } from './nodeHelpers';
import { generateSourceHandleId, generateTargetHandleId } from './handleIdHelpers';

/**
 * Generate field-level detailed view with connection nodes between source and entity
 * Creates one connection node per mapping instead of individual field edges
 */
export function generateFieldLevelView(
  flowData: FlowData,
  onConvertToFormula?: (edgeId: string) => void
): { nodes: Node[]; edges: Edge[] } {
  const detailedNodes: Node[] = [];
  const detailedEdges: Edge[] = [];

  // Process each original node
  flowData.nodes.forEach((node) => {
    console.log(`[generateFieldLevelView] Processing node: ${node.id} (type: ${node.type})`);

    if (node.type === 'sourceSchema' || node.type === 'sourceSchemaDetail') {
      // Convert to detailed source node
      console.log(`[generateFieldLevelView] Converting ${node.id} to sourceSchemaDetail`);
      detailedNodes.push({
        ...node,
        type: 'sourceSchemaDetail',
      });
    } else if (node.type === 'groupedSourceSchema') {
      // Keep grouped nodes as-is
      console.log(`[generateFieldLevelView] Keeping grouped node: ${node.id}`);
      detailedNodes.push(node);
    } else if (node.type === 'entitySchema' || node.type === 'entitySchemaDetail') {
      // Convert to detailed entity node
      console.log(`[generateFieldLevelView] Converting ${node.id} to entitySchemaDetail`);
      detailedNodes.push({
        ...node,
        type: 'entitySchemaDetail',
      });
    } else if (node.type === 'formulaNode' || node.type === 'connectionNode') {
      console.log(`[generateFieldLevelView] Keeping existing ${node.type}: ${node.id}`);
      // Keep existing formula and connection nodes
      detailedNodes.push(node);
    } else {
      console.log(`[generateFieldLevelView] Adding node with type: ${node.id} (type: ${node.type})`);
      // Add other nodes as-is
      detailedNodes.push(node);
    }
  });

  // Process each edge
  flowData.edges.forEach((edge) => {
    const sourceNode = flowData.nodes.find(n => n.id === edge.source);
    const targetNode = flowData.nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) {
      console.log(`[generateFieldLevelView] Skipping edge with missing nodes: ${edge.id}`);
      return;
    }

    // Check if this is an edge from a grouped node to a formula/connection node
    const isGroupedToIntermediate = sourceNode.type === 'groupedSourceSchema' &&
      (targetNode.type === 'formulaNode' || targetNode.type === 'connectionNode');

    // Check if this is an edge from a formula/connection node to an entity
    const isIntermediateToEntity = (sourceNode.type === 'formulaNode' || sourceNode.type === 'connectionNode') &&
      (targetNode.type === 'entitySchema' || targetNode.type === 'entitySchemaDetail');

    // If this is part of the field mapping flow, add the edge with proper handles
    if (isGroupedToIntermediate || isIntermediateToEntity) {
      const originalSourceId = edge.data?.originalSourceId || edge.source;

      // Get the field names from the intermediate node (formula/connection)
      let sourceFieldName = '';
      let targetFieldName = '';
      let sourceSchemaHash = '';
      let targetEntityLabel = '';

      // Extract field names from the intermediate node
      const intermediateNode = isGroupedToIntermediate ? targetNode : sourceNode;
      if (intermediateNode.data) {
        // For formula nodes, get the first source field from sourceFields array
        if (intermediateNode.type === 'formulaNode') {
          console.log(`[Formula Node ${intermediateNode.id}] Full data:`, intermediateNode.data);

          // Check if this is a constant formula (marked during creation or has no source fields)
          const isConstantFormula = intermediateNode.data.isConstant ||
                                   (!intermediateNode.data.sourceFields || intermediateNode.data.sourceFields.length === 0) ||
                                   (intermediateNode.data.sourceFields && intermediateNode.data.sourceFields.length === 1 && !intermediateNode.data.sourceFields[0].name);

          if (isConstantFormula) {
            // This is a constant formula - it doesn't need a source connection
            console.log(`[Constant Formula] Node ${intermediateNode.id} is a constant-value formula`);

            // For constant formulas connecting to entities, we only need the target field
            if (isIntermediateToEntity) {
              targetFieldName = intermediateNode.data.targetField || '';
            } else {
              // Skip creating edge from bronze to constant formula
              console.log(`[Constant Formula] Skipping bronze-to-formula edge for ${intermediateNode.id}`);
              return;
            }
          } else {
            // Regular formula with source fields
            if (intermediateNode.data.sourceFields && intermediateNode.data.sourceFields.length > 0) {
              sourceFieldName = intermediateNode.data.sourceFields[0].name || '';

              // If sourceFieldName is empty, try to extract from the label
              if (!sourceFieldName) {
                const label = intermediateNode.data.label || '';
                const match = label.match(/Transform: ([^ ]+) → /);
                if (match) {
                  sourceFieldName = match[1];
                  console.log(`[Formula Node ${intermediateNode.id}] Extracted field from label: "${sourceFieldName}" from "${label}"`);
                }
              }
            }
            targetFieldName = intermediateNode.data.targetField || '';
          }
        } else {
          // For connection nodes or other types
          sourceFieldName = intermediateNode.data.sourceField || '';
          targetFieldName = intermediateNode.data.targetField || '';
        }
      }

      // Get schema hash and entity label for handle generation
      if (isGroupedToIntermediate) {
        // Edge from grouped schema to intermediate node
        if (sourceNode.type === 'groupedSourceSchema' && sourceNode.data?.schemas) {
          const matchingSchema = sourceNode.data.schemas.find((s: any) => s.id === originalSourceId);
          sourceSchemaHash = matchingSchema?.hash || '';
        } else {
          sourceSchemaHash = sourceNode.data?.hash || '';
        }

        // Skip edge if we don't have the necessary field information (unless it's a constant formula which we already skipped above)
        if (!sourceFieldName || !sourceSchemaHash) {
          console.log(`[generateFieldLevelView] Skipping edge ${edge.id}: missing source field or schema hash. sourceFieldName="${sourceFieldName}", sourceSchemaHash="${sourceSchemaHash}"`);
          return;
        }

        // Generate proper handle ID
        const properSourceHandle = generateSourceHandleId(sourceSchemaHash, sourceFieldName);
        console.log(`[generateFieldLevelView] Generated source handle: ${properSourceHandle} for field "${sourceFieldName}" and hash "${sourceSchemaHash}"`);

        // Log if there's a mismatch
        if (edge.sourceHandle && edge.sourceHandle !== properSourceHandle) {
          console.log(`[Handle Mismatch] Edge ${edge.id}: old handle="${edge.sourceHandle}", new handle="${properSourceHandle}"`);
        }

        // Add source handle for this edge - override any existing incorrect handle
        detailedEdges.push({
          ...edge,
          sourceHandle: properSourceHandle,
          data: {
            ...edge.data,
            originalSourceId: originalSourceId,
            isFromGroupedNode: sourceNode.type === 'groupedSourceSchema',
            fieldMapping: true,
          }
        });
      } else if (isIntermediateToEntity) {
        // Edge from intermediate node to entity
        targetEntityLabel = targetNode.data?.label || targetNode.data?.name || '';

        // Skip edge if we don't have the necessary field information
        if (!targetFieldName || !targetEntityLabel) {
          console.log(`[generateFieldLevelView] Skipping edge ${edge.id}: missing target field or entity label`);
          return;
        }

        // Check if target field exists on the entity
        const targetFields = targetNode.data?.fields || [];
        const targetFieldExists = targetFields.some((tf: any) =>
          tf.name === targetFieldName ||
          tf.name.toLowerCase() === targetFieldName.toLowerCase()
        );

        if (!targetFieldExists) {
          console.log(`[generateFieldLevelView] Skipping edge ${edge.id}: target field "${targetFieldName}" not found on entity "${targetEntityLabel}"`);
          return;
        }

        // Generate proper handle ID
        const properTargetHandle = generateTargetHandleId(targetEntityLabel, targetFieldName);

        // Log if there's a mismatch
        if (edge.targetHandle && edge.targetHandle !== properTargetHandle) {
          console.log(`[Handle Mismatch] Edge ${edge.id}: old handle="${edge.targetHandle}", new handle="${properTargetHandle}"`);
        }

        // Add target handle for this edge - override any existing incorrect handle
        detailedEdges.push({
          ...edge,
          targetHandle: properTargetHandle,
          data: {
            ...edge.data,
            originalSourceId: originalSourceId,
            fieldMapping: true,
          }
        });
      } else {
        // Fallback - shouldn't happen
        detailedEdges.push({
          ...edge,
          data: {
            ...edge.data,
            originalSourceId: originalSourceId,
            isFromGroupedNode: sourceNode.type === 'groupedSourceSchema',
            fieldMapping: true,
          }
        });
      }

      console.log(`[generateFieldLevelView] Adding edge: ${edge.id} (${sourceNode.type} -> ${targetNode.type}) with handles`);
      return;
    }

    // Check if this is a direct edge between schema and entity (needs connection nodes)
    const isDirectSchemaToEntity =
      (sourceNode.type === 'groupedSourceSchema' || sourceNode.type === 'sourceSchemaDetail') &&
      (targetNode.type === 'entitySchema' || targetNode.type === 'entitySchemaDetail');

    if (isDirectSchemaToEntity) {
      // This is a direct mapping that needs connection nodes for fields
      const originalSourceId = edge.data?.originalSourceId || edge.source;

      // Try to get field information from the nodes
      let sourceFields: any[] = [];
      let targetFields: any[] = [];

      if (sourceNode.type === 'groupedSourceSchema' && sourceNode.data?.schemas) {
        // Find the schema that matches the original source ID
        const matchingSchema = sourceNode.data.schemas.find((s: any) => s.id === originalSourceId);
        sourceFields = matchingSchema?.fields || [];
      } else if (sourceNode.data?.fields) {
        sourceFields = sourceNode.data.fields;
      }

      targetFields = targetNode.data?.fields || [];

      // If we have fields, create connection nodes for matching field names
      if (sourceFields.length > 0 && targetFields.length > 0) {
        console.log(`[generateFieldLevelView] Creating connection nodes for direct mapping: ${edge.id}`);

        // Get schema hash and entity label for handle generation
        let sourceSchemaHash = '';
        if (sourceNode.type === 'groupedSourceSchema' && sourceNode.data?.schemas) {
          const matchingSchema = sourceNode.data.schemas.find((s: any) => s.id === originalSourceId);
          sourceSchemaHash = matchingSchema?.hash || '';
        } else {
          sourceSchemaHash = sourceNode.data?.hash || '';
        }
        const targetEntityLabel = targetNode.data?.label || targetNode.data?.name || '';

        // Find matching fields by name
        sourceFields.forEach((sourceField: any) => {
          const targetField = targetFields.find((tf: any) =>
            tf.name === sourceField.name ||
            tf.name.toLowerCase() === sourceField.name.toLowerCase()
          );

          if (targetField) {
            const connectionNodeId = `connection-${edge.id}-${sourceField.name}`;
            const typeColor = getTypeColor(sourceField.type || 'string');

            // Create connection node
            detailedNodes.push({
              id: connectionNodeId,
              type: 'connectionNode',
              position: { x: 0, y: 0 }, // Will be positioned by layout
              data: {
                sourceField: sourceField.name,
                targetField: targetField.name,
                sourceSchemaId: originalSourceId,
                targetEntityId: edge.target,
                color: typeColor,
              },
            });

            // Create edge from source field to connection node with proper handle ID
            detailedEdges.push({
              id: `${connectionNodeId}-from-source`,
              source: edge.source,
              target: connectionNodeId,
              sourceHandle: generateSourceHandleId(sourceSchemaHash, sourceField.name), // Use field-specific handle
              type: 'smoothstep', // Use smooth step for cleaner routing
              animated: false,
              style: {
                stroke: typeColor,
                strokeWidth: 1.5,
                strokeDasharray: '0',
              },
              data: {
                originalSourceId: originalSourceId,
                isFromGroupedNode: sourceNode.type === 'groupedSourceSchema',
                fieldMapping: true,
              },
            });

            // Create edge from connection node to target field with proper handle ID
            detailedEdges.push({
              id: `${connectionNodeId}-to-target`,
              source: connectionNodeId,
              target: edge.target,
              targetHandle: generateTargetHandleId(targetEntityLabel, targetField.name), // Use field-specific handle
              type: 'smoothstep', // Use smooth step for cleaner routing
              animated: false,
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: typeColor,
                width: 15,
                height: 15,
              },
              style: {
                stroke: typeColor,
                strokeWidth: 1.5,
                strokeDasharray: '0',
              },
              data: {
                originalSourceId: originalSourceId,
                fieldMapping: true,
              },
            });
          }
        });
        return;
      } else {
        // No field information, just keep the direct edge
        console.log(`[generateFieldLevelView] No field info, keeping direct edge: ${edge.id}`);
        detailedEdges.push(edge);
        return;
      }
    }

    // Check for mapping definition to create new connection/formula nodes
    const mappingDef = edge.data?.mapping_definition;
    if (!mappingDef) {
      console.log(`[generateFieldLevelView] Skipping edge: ${edge.id}`);
      return;
    }

    const schemaMapping = mappingDef.schema_mapping;
    const fields = schemaMapping?.fields || [];

    // sourceNode and targetNode are already found above
    if (!sourceNode || !targetNode || fields.length === 0) {
      return;
    }

    // Handle grouped source schema nodes
    const actualSourceId = edge.source;
    const isFromGroupedNode = sourceNode.type === 'groupedSourceSchema';

    // Get the original source ID if this edge was transformed
    const originalSourceId = edge.data?.originalSourceId || edge.source;

    // For grouped nodes, we need to find the actual schema within the group
    let sourceSchemaForFields = sourceNode as any;
    let sourceSchemaHash = sourceNode.data?.hash || ''; // Default hash for non-grouped nodes

    if (isFromGroupedNode && sourceNode.data?.schemas) {
      // Find the schema that matches the original source ID
      const matchingSchema = sourceNode.data.schemas.find((s: any) => s.id === originalSourceId);
      if (matchingSchema) {
        sourceSchemaHash = matchingSchema.hash || ''; // Get the hash from the matching schema
        // Create a temporary node structure for field extraction
        sourceSchemaForFields = {
          ...sourceNode,
          data: {
            ...sourceNode.data,
            fields: matchingSchema.fields || [],
          }
        };
      }
    }

    // Get the target entity label for handle generation
    const targetEntityLabel = targetNode.data?.label || targetNode.data?.name || '';

    // Process each field mapping to create appropriate nodes and edges
    fields.forEach((field, fieldIndex) => {
      const sourceFieldName = field.source_field || field.sourceField;
      const targetFieldName = field.target_field || field.targetField;
      const formula = field.formula || field.transformation;

      // For formulas, we need a target field but source field might be empty (constant-value formulas)
      // For regular connections, we need both source and target fields
      if (!targetFieldName) return;
      if (!formula && !sourceFieldName) return;

      // Get color based on field type
      const fieldType = field.sourceType || field.type || 'unknown';
      const typeColor = getTypeColor(fieldType);

      if (formula) {
        // Create a formula node for this field mapping
        const formulaNodeId = `formula-${edge.id}-${fieldIndex}`;

        // Check if this is a constant-value formula (no source field)
        const isConstantFormula = !sourceFieldName || sourceFieldName === '';

        detailedNodes.push({
          id: formulaNodeId,
          type: 'formulaNode',
          position: { x: 0, y: 0 }, // Will be positioned by layout algorithm
          data: {
            formula: formula,
            sourceField: sourceFieldName || '', // Can be empty for constant formulas
            targetField: targetFieldName,
            color: typeColor,
            isConstant: isConstantFormula, // Mark as constant formula
          },
        });

        // Only create edge from source field to formula node if there's a source field
        if (!isConstantFormula) {
          detailedEdges.push({
            id: `${edge.id}-${fieldIndex}-to-formula`,
            source: actualSourceId,
            target: formulaNodeId,
            sourceHandle: generateSourceHandleId(sourceSchemaHash, sourceFieldName), // Use proper handle ID format
            // No target handle for formula node - it handles it internally
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: typeColor,
              strokeWidth: 1.5,
              strokeDasharray: '0',
            },
            data: {
              ...edge.data,
              originalSourceId: originalSourceId,
              isFromGroupedNode: isFromGroupedNode,
              fieldMapping: true,
            },
          });
        } else {
          console.log(`[Constant Formula] Formula node ${formulaNodeId} for field "${targetFieldName}" is a constant-value formula: "${formula}"`);
        }

        // Check if the target field exists on the entity
        const targetFields = targetNode.data?.fields || [];
        const targetFieldExists = targetFields.some((tf: any) =>
          tf.name === targetFieldName ||
          tf.name.toLowerCase() === targetFieldName.toLowerCase()
        );

        if (!targetFieldExists) {
          console.log(`[Formula Edge] Target field "${targetFieldName}" not found on entity "${targetEntityLabel}" (has fields: ${targetFields.map((f: any) => f.name).join(', ')}). Formula node will be shown without outgoing edge.`);
          // Still keep the formula node but don't create the outgoing edge
        } else {
          // Create edge from formula node to target field
          const targetHandleId = generateTargetHandleId(targetEntityLabel, targetFieldName);
          console.log(`[Formula Edge] Creating edge from formula ${formulaNodeId} to ${edge.target}, targetHandle: ${targetHandleId}, targetField: ${targetFieldName}, entityLabel: ${targetEntityLabel}`);

          detailedEdges.push({
            id: `${edge.id}-${fieldIndex}-from-formula`,
            source: formulaNodeId,
            target: edge.target,
            targetHandle: targetHandleId, // Use proper handle ID format
            // No source handle for formula node - it handles it internally
            type: 'smoothstep',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: typeColor,
            width: 15,
            height: 15,
          },
          style: {
            stroke: typeColor,
            strokeWidth: 1.5,
            strokeDasharray: '0',
          },
          data: {
            ...edge.data,
            originalSourceId: originalSourceId,
            fieldMapping: true,
          },
        });
        }
      } else {
        // Create a connection node for this field mapping
        const connectionNodeId = `connection-${edge.id}-${fieldIndex}`;

        detailedNodes.push({
          id: connectionNodeId,
          type: 'connectionNode',
          position: { x: 0, y: 0 }, // Will be positioned by layout algorithm
          data: {
            sourceField: sourceFieldName,
            targetField: targetFieldName,
            sourceSchemaId: originalSourceId,
            targetEntityId: edge.target,
            color: typeColor,
          },
        });

        // Create edge from source field to connection node
        detailedEdges.push({
          id: `${edge.id}-${fieldIndex}-to-connection`,
          source: actualSourceId,
          target: connectionNodeId,
          sourceHandle: generateSourceHandleId(sourceSchemaHash, sourceFieldName), // Use proper handle ID format
          // No target handle for connection node - it handles it internally
          type: 'default',
          animated: false,
          style: {
            stroke: typeColor,
            strokeWidth: 1.5,
            strokeDasharray: '0',
          },
          data: {
            ...edge.data,
            originalSourceId: originalSourceId,
            isFromGroupedNode: isFromGroupedNode,
            fieldMapping: true,
          },
        });

        // Check if the target field exists on the entity
        const targetFields = targetNode.data?.fields || [];
        const targetFieldExists = targetFields.some((tf: any) =>
          tf.name === targetFieldName ||
          tf.name.toLowerCase() === targetFieldName.toLowerCase()
        );

        if (!targetFieldExists) {
          console.log(`[Connection Edge] Target field "${targetFieldName}" not found on entity "${targetEntityLabel}". Connection node will be shown without outgoing edge.`);
          // Still keep the connection node but don't create the outgoing edge
        } else {
          // Create edge from connection node to target field
          detailedEdges.push({
            id: `${edge.id}-${fieldIndex}-from-connection`,
            source: connectionNodeId,
            target: edge.target,
            targetHandle: generateTargetHandleId(targetEntityLabel, targetFieldName), // Use proper handle ID format
            // No source handle for connection node - it handles it internally
            type: 'smoothstep',
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: typeColor,
            width: 15,
            height: 15,
          },
          style: {
            stroke: typeColor,
            strokeWidth: 1.5,
            strokeDasharray: '0',
          },
          data: {
            ...edge.data,
            originalSourceId: originalSourceId,
            fieldMapping: true,
          },
        });
        }
      }
    });
  });

  return { nodes: detailedNodes, edges: detailedEdges };
}

/**
 * Create a formula edge configuration
 */
export function createFormulaEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle: string | undefined,
  targetHandle: string | undefined,
  label: string,
  data?: any
): Edge {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: 'formula', // Use the new FormulaEdge type for smoother routing
    animated: false,
    label,
    labelStyle: {
      fill: '#8b5cf6',
      fontWeight: 500,
      fontSize: 10,
    },
    labelBgStyle: {
      fill: '#ffffff',
      fillOpacity: 0.95,
    },
    labelBgPadding: [3, 2] as [number, number],
    labelBgBorderRadius: 3,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#8b5cf6',
    },
    style: {
      stroke: '#8b5cf6',
      strokeWidth: 2,
    },
    data: {
      offset: 0,
      mappingType: 'formula',
      isFormulaEdge: true, // Flag for formula edge styling
      ...data,
    },
  };
}

/**
 * Create a field mapping edge
 */
export function createFieldMappingEdge(
  id: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
  sourceField: string,
  targetField: string,
  fieldType: string,
  index: number,
  options?: {
    animated?: boolean;
    autoSuggested?: boolean;
    similarity?: number;
    onConvertToFormula?: (edgeId: string) => void;
  }
): Edge {
  const typeColor = getTypeColor(fieldType);

  // Create label showing field mapping
  const fieldLabel = sourceField === targetField
    ? sourceField
    : `${sourceField} → ${targetField}`;

  // Calculate offset to stagger lines
  const offsetMultiplier = Math.ceil(index / 2);
  const offsetDirection = index % 2 === 0 ? 1 : -1;
  const offset = offsetMultiplier * offsetDirection * 15;

  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: 'staggered',
    animated: options?.animated || false,
    label: fieldLabel,
    labelStyle: {
      fill: typeColor,
      fontWeight: options?.autoSuggested ? 600 : 500,
      fontSize: 9,
    },
    labelBgStyle: {
      fill: '#ffffff',
      fillOpacity: 0.95,
    },
    labelBgPadding: [3, 2] as [number, number],
    labelBgBorderRadius: 3,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: typeColor,
    },
    style: {
      stroke: typeColor,
      strokeWidth: 1.5,
    },
    data: {
      sourceField,
      targetField,
      sourceType: fieldType,
      offset,
      mappingType: 'direct',
      ...options,
    },
  };
}

/**
 * Apply hover effect to edges
 */
export function applyEdgeHoverEffect(
  edges: Edge[],
  hoveredEdgeId: string | null
): Edge[] {
  if (!hoveredEdgeId) {
    // No hover - ensure smooth fade back to full opacity
    return edges.map(edge => ({
      ...edge,
      className: 'edge-normal',
      style: {
        ...edge.style,
        opacity: 1,
      },
      animated: false,
    }));
  }

  // Apply hover effect
  return edges.map(edge => {
    if (edge.id === hoveredEdgeId) {
      // Hovered edge - keep visible and slightly thicker
      const currentWidth = edge.style?.strokeWidth;
      const baseWidth = typeof currentWidth === 'number' ? currentWidth : 2;
      return {
        ...edge,
        className: 'edge-hovered',
        style: {
          ...edge.style,
          opacity: 1,
          strokeWidth: baseWidth + 1,
        },
        animated: false,
      };
    } else {
      // All other edges - fade smoothly
      return {
        ...edge,
        className: 'edge-faded',
        style: {
          ...edge.style,
          opacity: 0.15,
        },
        animated: false,
      };
    }
  });
}