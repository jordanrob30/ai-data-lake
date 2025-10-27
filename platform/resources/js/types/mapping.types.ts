/**
 * Mapping and transformation type definitions
 */

export interface FieldMapping {
  fieldPath: string;
  entityName: string;
  isArray: boolean;
  fieldMappings?: NestedFieldMapping[];
  schemaMapping?: EntitySchemaMapping;
}

export interface EntitySchemaMapping {
  entityName: string;
  fields: MappingField[];
  sourceStructure: any;
}

export interface MappingField {
  fieldName: string;
  fieldType: string;
  sourcePath: string;
  sourceType?: string;
  isRequired: boolean;
  isArray: boolean;
  format?: string;
  precision?: number;
  type?: string;
}

export interface NestedFieldMapping {
  fieldName: string;
  entityType: string;
  isArray: boolean;
}

export interface MappingDefinition {
  schema_mapping: {
    fields: MappingField[];
  };
}

export interface FieldMatch {
  source_field: string;
  target_field: string;
  source_type: string;
  target_type: string;
  similarity: number;
  suggested: boolean;
}

// AI-related mapping types
export interface AIFieldMapping {
  source_field: string;
  target_field: string;
  transformation: 'direct' | 'formula' | 'split' | 'combine' | 'format_conversion';
  jsonata_formula: string;
  confidence: number;
  explanation: string;
}

export interface AICanonicalField {
  name: string;
  type: string;
  required: boolean;
  format?: string;
}

export interface AIRecommendations {
  action: 'map_to_existing' | 'create_new';
  entity_id: number | null;
  entity_name: string;
  similarity_score?: number;
  reasoning: string;
  canonical_schema: {
    fields: AICanonicalField[];
  };
  field_mappings: AIFieldMapping[];
}

export interface AIAnalysisStatus {
  status: 'pending' | 'completed' | 'failed' | 'disabled';
  recommendations: AIRecommendations | null;
  analyzed_at: string | null;
  error: string | null;
}