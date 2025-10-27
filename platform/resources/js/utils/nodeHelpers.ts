/**
 * Node-related utility functions
 */

import { Node } from '@xyflow/react';

/**
 * Calculate the actual rendered height of a node based on its type and content
 */
export function calculateActualNodeHeight(node: Node): number {
  const isDetailed = node.type?.includes('Detail');
  const fieldCount = node.data?.fields?.length || 0;

  if (node.type === 'connectionNode') {
    // Connection node: make it more substantial for visibility
    return 80; // Increased height for better visibility when zoomed out
  }

  if (node.type === 'formulaNode') {
    // Check if collapsed
    if (node.data?.collapsed) {
      // Collapsed view: make it match connection nodes for consistency
      return 80; // Increased height for better visibility
    }

    // Expanded view: full editor
    const headerHeight = 80;
    const fieldsHeaderHeight = 40;
    const fieldRowHeight = 32; // Each available field badge
    const editorHeight = 120; // Textarea for formula
    const targetHeight = 60; // Target field display
    const buttonHeight = 45;
    const padding = 24; // px-4 py-3 spacing

    const sourceFieldCount = node.data?.sourceFields?.length || 1;
    const fieldsHeight = fieldsHeaderHeight + (sourceFieldCount * fieldRowHeight);

    return headerHeight + fieldsHeight + editorHeight + targetHeight + buttonHeight + padding;
  }

  if (node.type === 'groupedSourceSchema') {
    // GroupedSourceSchema: header with tabs + active schema fields + footer
    const groupHeaderHeight = 120; // Grouped header + tab selector
    const schemaHeaderHeight = 90; // Active schema header
    const fieldHeight = 54; // Each field row
    const footerHeight = 50; // Hash and pending records
    const activeSchema = node.data?.schemas?.[node.data?.activeSchemaIndex || 0];
    const activeFieldCount = activeSchema?.fields?.length || 0;

    // Cap the maximum height to prevent excessive vertical spacing
    const maxFieldsHeight = 540; // Max height for fields section (about 10 fields)
    const fieldsHeight = Math.min(activeFieldCount * fieldHeight, maxFieldsHeight);

    return groupHeaderHeight + schemaHeaderHeight + fieldsHeight + footerHeight;
  }

  if (node.type === 'newEntity') {
    // NewEntity: header + fields + footer + form
    const headerHeight = 100;
    const footerHeight = 60;
    const formHeight = 80; // Add field form
    const fieldHeight = 70; // Each field row with delete button
    return headerHeight + (fieldCount * fieldHeight) + formHeight + footerHeight;
  }

  if (isDetailed) {
    // Detailed nodes: header + fields + footer
    if (node.type === 'pendingSchemaDetail') {
      // PendingSchemaDetail: header (110px) + fields (variable) + entity mapping (250px) + footer (variable)
      const headerHeight = 110;
      const entityMappingHeight = 250; // Create as Entity button + Map to Entity section
      const fieldHeight = 90; // Each field row with sample data
      const maxDisplayFields = 20;
      const maxDisplayHeight = 400; // Max scrollable height
      const footerHeight = 120; // Footer with save button or instructions

      const displayFieldCount = Math.min(fieldCount, maxDisplayFields);
      const fieldsHeight = Math.min(displayFieldCount * fieldHeight, maxDisplayHeight);
      return headerHeight + fieldsHeight + entityMappingHeight + footerHeight;
    } else {
      // Other detailed nodes: calculate actual rendered height
      // EntitySchemaDetail/SourceSchemaDetail structure:
      // - Container padding (p-4): 32px (16px top + 16px bottom)
      // - Header (with mb-3 pb-3 border-b): ~72px
      // - Each field (px-3 py-2 + 2 text lines): ~50px
      // - space-y-1 gap between fields: 4px per gap
      // - Footer (conditional for SourceSchema): ~50px if present, 0 if not

      const containerPadding = 32; // p-4
      const headerHeight = 72; // Header with spacing and border
      const fieldHeight = 54; // Field + gap (50px + 4px)
      const footerHeight = node.type === 'sourceSchemaDetail' ? 50 : 0; // Footer with hash for source nodes

      // Cap maximum height for very large schemas
      const maxFieldsHeight = 540; // Max height for fields section (about 10 fields)
      const fieldsHeight = Math.min(fieldCount * fieldHeight, maxFieldsHeight);
      return containerPadding + headerHeight + fieldsHeight + footerHeight;
    }
  } else {
    // Compact nodes: fixed height
    return 200;
  }
}

/**
 * Get color for field based on data type
 */
export function getTypeColor(fieldType: string): string {
  const type = fieldType.toLowerCase();

  // String types - blue
  if (type.includes('string') || type.includes('text') || type.includes('varchar')) {
    return '#3b82f6'; // blue-500
  }
  // Number types - green
  if (type.includes('int') || type.includes('float') || type.includes('double') || type.includes('decimal') || type.includes('number')) {
    return '#10b981'; // emerald-500
  }
  // Boolean - purple
  if (type.includes('bool')) {
    return '#8b5cf6'; // violet-500
  }
  // Date/time - orange
  if (type.includes('date') || type.includes('time') || type.includes('timestamp')) {
    return '#f59e0b'; // amber-500
  }
  // Arrays - pink
  if (type.includes('array') || type.includes('[]')) {
    return '#ec4899'; // pink-500
  }
  // Objects/JSON - cyan
  if (type.includes('object') || type.includes('json') || type.includes('struct')) {
    return '#06b6d4'; // cyan-500
  }

  // Default - indigo
  return '#6366f1'; // indigo-500
}

/**
 * Get display properties (color and icon) for a field type
 */
export function getTypeDisplay(type: string): { color: string; icon: string } {
  const typeMap: Record<string, { color: string; icon: string }> = {
    'string': { color: 'bg-blue-100 text-blue-800', icon: '📝' },
    'integer': { color: 'bg-green-100 text-green-800', icon: '🔢' },
    'float': { color: 'bg-green-100 text-green-800', icon: '🔢' },
    'boolean': { color: 'bg-purple-100 text-purple-800', icon: '✓' },
    'email': { color: 'bg-orange-100 text-orange-800', icon: '📧' },
    'url': { color: 'bg-indigo-100 text-indigo-800', icon: '🔗' },
    'uuid': { color: 'bg-gray-100 text-gray-800', icon: '🆔' },
    'datetime': { color: 'bg-yellow-100 text-yellow-800', icon: '📅' },
    'date': { color: 'bg-yellow-100 text-yellow-800', icon: '📅' },
    'timestamp': { color: 'bg-yellow-100 text-yellow-800', icon: '⏱️' },
    'phone': { color: 'bg-pink-100 text-pink-800', icon: '📞' },
    'json': { color: 'bg-red-100 text-red-800', icon: '{}' },
    'object': { color: 'bg-gray-100 text-gray-800', icon: '📦' },
  };

  // Handle array types
  if (type.startsWith('array[')) {
    return {
      color: 'bg-cyan-100 text-cyan-800',
      icon: '📋',
    };
  }

  return typeMap[type] || { color: 'bg-gray-100 text-gray-800', icon: '❓' };
}

/**
 * Helper function to assign ranks (columns) to different node types for layout
 * Lower rank = further left
 */
export function getNodeRank(node: Node): number | undefined {
  // Source schemas (bronze) - leftmost column
  if (node.type === 'sourceSchema' ||
      node.type === 'sourceSchemaDetail' ||
      node.type === 'pendingSchema' ||
      node.type === 'pendingSchemaDetail' ||
      node.type === 'groupedSourceSchema') {
    return 0;
  }

  // Connection nodes and formula nodes - middle column
  if (node.type === 'connectionNode' || node.type === 'formulaNode') {
    return 1;
  }

  // Entity schemas (silver) - rightmost column
  if (node.type === 'entitySchema' ||
      node.type === 'entitySchemaDetail' ||
      node.type === 'newEntity') {
    return 2;
  }

  return undefined; // Let Dagre decide
}