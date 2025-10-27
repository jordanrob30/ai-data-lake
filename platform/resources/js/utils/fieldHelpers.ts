/**
 * Field-related utility functions
 */

import { DetectedField, EntityField } from '../types';

/**
 * Flatten nested fields into dot-notation paths
 * Converts nested object structures into flat field list with dotted paths
 *
 * Example:
 * Input: [{ name: "shipping_address", type: "object", ... }]
 * Output: [
 *   { name: "shipping_address", type: "object", ... },
 *   { name: "shipping_address.line1", type: "string", ... },
 *   { name: "shipping_address.city", type: "string", ... }
 * ]
 */
export function flattenFields(
  fields: Array<DetectedField | EntityField>,
  parentPath: string = ''
): Array<DetectedField | EntityField> {
  const flattened: Array<DetectedField | EntityField> = [];

  fields.forEach(field => {
    const fieldPath = parentPath ? `${parentPath}.${field.name}` : field.name;

    // Add the field itself
    flattened.push({
      ...field,
      name: fieldPath,
    });

    // If field has nested structure, recursively flatten
    // Check for nested fields in various possible structures
    if (field.type === 'object' || field.type === 'json') {
      // Check if there's a nested fields array
      const nestedFields = (field as any).fields || (field as any).nested_fields;

      if (nestedFields && Array.isArray(nestedFields)) {
        const nested = flattenFields(nestedFields, fieldPath);
        // Don't include the parent object field, only its children
        flattened.pop(); // Remove the parent object field
        flattened.push(...nested);
      }
    }

    // Handle array types with nested structures
    if (field.type?.startsWith('array[object]') || field.type?.startsWith('array[json]')) {
      const nestedFields = (field as any).fields || (field as any).nested_fields;

      if (nestedFields && Array.isArray(nestedFields)) {
        const nested = flattenFields(nestedFields, fieldPath);
        // Keep the parent array field and add children
        flattened.push(...nested.filter(f => f.name !== fieldPath));
      }
    }
  });

  return flattened;
}

/**
 * Parse mapping definition to extract nested field paths
 * This handles the case where mapping definitions contain nested field references
 */
export function extractFieldsFromMappingDef(mappingDef: any): {
  sourceFields: string[];
  targetFields: string[];
} {
  const sourceFields = new Set<string>();
  const targetFields = new Set<string>();

  if (!mappingDef?.schema_mapping?.fields) {
    return { sourceFields: [], targetFields: [] };
  }

  mappingDef.schema_mapping.fields.forEach((field: any) => {
    if (field.sourcePath) {
      sourceFields.add(field.sourcePath);
    }
    if (field.fieldName) {
      targetFields.add(field.fieldName);
    }
  });

  return {
    sourceFields: Array.from(sourceFields),
    targetFields: Array.from(targetFields),
  };
}

/**
 * Infer nested fields from mapping definitions
 * When actual field structures aren't available, infer them from edge mappings
 */
export function inferNestedFieldsFromMappings(
  baseFields: Array<DetectedField | EntityField>,
  mappedFieldPaths: string[]
): Array<DetectedField | EntityField> {
  const fieldsMap = new Map<string, DetectedField | EntityField>();

  // Add base fields
  baseFields.forEach(field => {
    fieldsMap.set(field.name, field);
  });

  // Infer nested fields from mapped paths
  mappedFieldPaths.forEach(path => {
    // Always add the field if it doesn't exist, whether nested or not
    if (!fieldsMap.has(path)) {
      // Check if this is a nested field
      const isNested = path.includes('.');

      if (isNested) {
        // Get the base field name (first part before dot)
        const baseFieldName = path.split('.')[0];
        const baseField = baseFields.find(f => f.name === baseFieldName);

        // Create the nested field with inferred type
        const inferredField: DetectedField = {
          name: path,
          type: 'string', // Default to string, could be improved with type inference
          required: false,
          ...(baseField?.format && { format: baseField.format }),
        };

        fieldsMap.set(path, inferredField);
      } else {
        // Top-level field that's not in baseFields - add it anyway
        // This can happen when edges reference fields that were added after the node was created
        const inferredField: DetectedField = {
          name: path,
          type: 'string',
          required: false,
        };

        fieldsMap.set(path, inferredField);
      }
    }
  });

  return Array.from(fieldsMap.values());
}

/**
 * Check if a field path exists in a field list (handles both flat and nested)
 */
export function fieldPathExists(
  fields: Array<DetectedField | EntityField>,
  fieldPath: string
): boolean {
  return fields.some(field => field.name === fieldPath);
}

/**
 * Get field by path (handles dot notation)
 */
export function getFieldByPath(
  fields: Array<DetectedField | EntityField>,
  fieldPath: string
): DetectedField | EntityField | undefined {
  return fields.find(field => field.name === fieldPath);
}