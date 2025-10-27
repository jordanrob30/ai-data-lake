/**
 * Handle ID sanitization utilities
 * Ensures consistent handle ID generation across nodes and edges
 */

/**
 * Sanitizes a string to be used as a React Flow handle ID
 * Converts ALL special characters (including dots and dashes) to underscores
 * This ensures no ambiguity when combined with double-underscore separator
 *
 * @param str - The string to sanitize
 * @returns Sanitized string safe for use as handle ID
 */
export function sanitizeHandleId(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]/g, '_') // Replace ALL special chars with underscore (including dots and dashes)
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Generate a source (bronze schema) handle ID
 * Format: {hash}__{fieldName}
 * Uses double-underscore separator to avoid ambiguity with underscores in field names
 *
 * @param hash - The schema hash
 * @param fieldName - The field name (can include dots for nested fields)
 * @returns Sanitized handle ID for source node
 */
export function generateSourceHandleId(hash: string, fieldName: string): string {
  const sanitizedHash = sanitizeHandleId(hash);
  const sanitizedField = sanitizeHandleId(fieldName);
  return `${sanitizedHash}__${sanitizedField}`;
}

/**
 * Generate a target (silver entity) handle ID
 * Format: {entityLabel}__{fieldName}
 * Uses double-underscore separator to avoid ambiguity with underscores in field names
 *
 * @param entityLabel - The entity label/name
 * @param fieldName - The field name (can include dots for nested fields)
 * @returns Sanitized handle ID for target node
 */
export function generateTargetHandleId(entityLabel: string, fieldName: string): string {
  const sanitizedLabel = sanitizeHandleId(entityLabel);
  const sanitizedField = sanitizeHandleId(fieldName);
  return `${sanitizedLabel}__${sanitizedField}`;
}

/**
 * Generate a formula node handle ID
 * Format: formula__{nodeId}__{side}
 * Uses double-underscore separator to avoid ambiguity with underscores in node IDs
 *
 * @param nodeId - The formula node ID
 * @param side - Either 'source' or 'target'
 * @returns Sanitized handle ID for formula node
 */
export function generateFormulaHandleId(nodeId: string, side: 'source' | 'target'): string {
  const sanitizedNodeId = sanitizeHandleId(nodeId);
  return `formula__${sanitizedNodeId}__${side}`;
}

/**
 * Sanitize handle IDs in edges loaded from database
 * Converts old formats to new consistent format with double-underscore separator
 * Examples:
 *   "customer-first_name" → "customer__first_name"
 *   "09f6b8bf91b890db-properties.firstname" → "09f6b8bf91b890db__properties_firstname"
 *   "customer-metadata.annual_revenue" → "customer__metadata_annual_revenue"
 *
 * This is needed for backward compatibility with existing saved edges
 *
 * @param edges - Array of edges with potentially unsanitized handle IDs
 * @returns Array of edges with sanitized handle IDs
 */
export function sanitizeEdgeHandleIds<T extends { sourceHandle?: string | null; targetHandle?: string | null; [key: string]: any }>(
  edges: T[]
): T[] {
  return edges.map(edge => {
    // Sanitize handle IDs by converting old single-dash/dot format to double-underscore format
    let sanitizedSourceHandle = edge.sourceHandle;
    let sanitizedTargetHandle = edge.targetHandle;

    if (sanitizedSourceHandle) {
      // First, try to detect the old format separator (first dash or underscore after the prefix)
      // Common patterns: "hash-field", "hash_field", "label-field", "label_field"
      const match = sanitizedSourceHandle.match(/^([a-zA-Z0-9]+)([-_])(.+)$/);
      if (match) {
        const [, prefix, , fieldPart] = match;
        // Sanitize both parts and join with double underscore
        sanitizedSourceHandle = `${sanitizeHandleId(prefix)}__${sanitizeHandleId(fieldPart)}`;
      } else {
        // Fallback: just sanitize the whole string (for formula nodes, etc)
        sanitizedSourceHandle = sanitizeHandleId(sanitizedSourceHandle);
      }
    }

    if (sanitizedTargetHandle) {
      // Same logic for target handles
      const match = sanitizedTargetHandle.match(/^([a-zA-Z0-9]+)([-_])(.+)$/);
      if (match) {
        const [, prefix, , fieldPart] = match;
        sanitizedTargetHandle = `${sanitizeHandleId(prefix)}__${sanitizeHandleId(fieldPart)}`;
      } else {
        sanitizedTargetHandle = sanitizeHandleId(sanitizedTargetHandle);
      }
    }

    return {
      ...edge,
      sourceHandle: sanitizedSourceHandle,
      targetHandle: sanitizedTargetHandle,
    };
  });
}

/**
 * Filter out edges that reference non-existent handles in nodes
 * This prevents React Flow errors when edges point to handles that don't exist
 *
 * @param edges - Array of edges to filter
 * @param nodes - Array of nodes to check against
 * @returns Filtered array of edges that only reference existing handles
 */
export function filterEdgesWithValidHandles<
  TEdge extends { id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; [key: string]: any },
  TNode extends { id: string; type?: string; data?: { fields?: Array<{ name: string }>; hash?: string; label?: string } }
>(
  edges: TEdge[],
  nodes: TNode[]
): TEdge[] {
  // Build a set of all valid handle IDs from nodes
  const validHandles = new Set<string>();

  // Build a map of node IDs to their handle sets for quick lookup
  const nodeHandles = new Map<string, Set<string>>();

  nodes.forEach(node => {
    const nodeHandleSet = new Set<string>();

    // For grouped source schemas, use the active schema's fields
    if (node.type === 'groupedSourceSchema') {
      const schemas = node.data?.schemas || [];
      const activeIndex = node.data?.activeSchemaIndex || 0;
      const activeSchema = schemas[activeIndex];

      if (activeSchema) {
        const activeFields = activeSchema.fields || [];
        const activeHash = activeSchema.hash || '';

        activeFields.forEach(field => {
          const handleId = `${sanitizeHandleId(activeHash)}__${sanitizeHandleId(field.name)}`;
          nodeHandleSet.add(handleId);
          validHandles.add(handleId);
        });
      }

      nodeHandles.set(node.id, nodeHandleSet);
      return;
    }

    const fields = node.data?.fields || [];

    // Get the prefix from node data based on node type
    let prefix: string;

    // For source schemas and pending schemas: use hash
    if (node.type === 'sourceSchema' || node.type === 'sourceSchemaDetail' ||
        node.type === 'pendingSchema' || node.type === 'pendingSchemaDetail') {
      prefix = node.data?.hash || '';
    }
    // For entity schemas: use label
    else if (node.type === 'entitySchema' || node.type === 'entitySchemaDetail' || node.type === 'newEntity') {
      prefix = node.data?.label || '';
    }
    // Fallback: try both hash and label
    else {
      prefix = node.data?.hash || node.data?.label || '';
    }

    if (!prefix) {
      // Final fallback: try to extract from node ID
      // Remove common prefixes like "entity-", "schema-", "pending-"
      prefix = node.id.replace(/^(entity|schema|pending)-/, '');
    }

    // Skip if we still don't have a prefix (unless it's a formula node)
    if (!prefix) {
      // For formula nodes, add standard handles
      if (node.id.startsWith('formula-') || node.type === 'formulaNode') {
        nodeHandleSet.add('input');
        nodeHandleSet.add('output');
        validHandles.add('input');
        validHandles.add('output');
      }
      nodeHandles.set(node.id, nodeHandleSet);
      return;
    }

    // For each field, add the expected handle ID
    fields.forEach(field => {
      // Generate handle ID using the same logic as in the node components
      const handleId = `${sanitizeHandleId(prefix)}__${sanitizeHandleId(field.name)}`;
      nodeHandleSet.add(handleId);
      validHandles.add(handleId);

      // Also add variations that might exist due to old data
      // For backward compatibility with handles that might have dots
      if (field.name.includes('.')) {
        // Add version with dots replaced by underscores
        const altHandleId = `${sanitizeHandleId(prefix)}__${field.name.replace(/\./g, '_')}`;
        nodeHandleSet.add(altHandleId);
        validHandles.add(altHandleId);
      }
    });

    // Also add formula node handles (input/output)
    if (node.id.startsWith('formula-') || node.type === 'formulaNode') {
      nodeHandleSet.add('input');
      nodeHandleSet.add('output');
      validHandles.add('input');
      validHandles.add('output');
    }

    nodeHandles.set(node.id, nodeHandleSet);
  });

  // Always add formula handles to be safe (formula nodes might not be in nodes list yet)
  validHandles.add('input');
  validHandles.add('output');

  // Filter edges to only those with valid handles
  const filteredEdges = edges.filter(edge => {
    // If no handle IDs specified (null, undefined, or empty string), it's a node-to-node connection (valid)
    if (!edge.sourceHandle && !edge.targetHandle) {
      return true;
    }

    // Check if source is a formula node (by checking if edge connects to/from a formula node ID)
    const sourceIsFormulaNode = edge.source.startsWith('formula-');
    const targetIsFormulaNode = edge.target.startsWith('formula-');

    // Special case: Formula node handles are always valid (input/output)
    const isFormulaSourceHandle = edge.sourceHandle === 'input' || edge.sourceHandle === 'output';
    const isFormulaTargetHandle = edge.targetHandle === 'input' || edge.targetHandle === 'output';

    // Get the handle sets for source and target nodes
    const sourceNodeHandles = nodeHandles.get(edge.source);
    const targetNodeHandles = nodeHandles.get(edge.target);

    // Check if both handles exist (if specified)
    const sourceValid = !edge.sourceHandle ||
                        (sourceNodeHandles && sourceNodeHandles.has(edge.sourceHandle)) ||
                        validHandles.has(edge.sourceHandle) ||
                        (sourceIsFormulaNode && isFormulaSourceHandle);

    const targetValid = !edge.targetHandle ||
                        (targetNodeHandles && targetNodeHandles.has(edge.targetHandle)) ||
                        validHandles.has(edge.targetHandle) ||
                        (targetIsFormulaNode && isFormulaTargetHandle);

    const isValid = sourceValid && targetValid;

    // Log invalid edges for debugging (only in development)
    if (!isValid && process.env.NODE_ENV === 'development') {
      console.debug(`[filterEdgesWithValidHandles] Filtered edge ${edge.id}:`, {
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        sourceValid,
        targetValid,
        sourceNodeHandles: sourceNodeHandles ? Array.from(sourceNodeHandles).slice(0, 5) : [],
        targetNodeHandles: targetNodeHandles ? Array.from(targetNodeHandles).slice(0, 5) : [],
      });
    }

    return isValid;
  });

  // Log statistics in development
  if (process.env.NODE_ENV === 'development' && edges.length !== filteredEdges.length) {
    console.debug(`[filterEdgesWithValidHandles] Filtered ${edges.length - filteredEdges.length} invalid edges out of ${edges.length} total edges`);
  }

  return filteredEdges;
}