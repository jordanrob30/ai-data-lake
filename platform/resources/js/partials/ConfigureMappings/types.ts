export interface DetectedField {
  name: string;
  type: string;
  sample_value?: any;
  required: boolean;
  format?: string;           // e.g., "YYYY-MM-DD", "ISO8601-UTC"
  pattern?: string;          // regex pattern if applicable
  precision?: number;        // decimal places for numbers
  scale?: number;           // total digits for numbers
  min_value?: number;       // minimum observed value
  max_value?: number;       // maximum observed value
  constraints?: Record<string, any>; // additional constraints
}

export interface PendingSchema {
  id: number;
  hash: string;
  name: string | null;
  tenant: string;
  tenant_id: string;
  sample_data: any;
  detected_fields: DetectedField[];
  pending_records: number;
  created_at: string;
}

export interface FieldMapping {
  fieldPath: string;
  entityName: string;
  isArray: boolean;
  fieldMappings?: NestedFieldMapping[];
  schemaMapping?: EntitySchemaMapping;
}

export interface EntitySchemaMapping {
  entityName: string;
  fields: EntityField[];
  sourceStructure: any;
}

export interface EntityField {
  fieldName: string;
  fieldType: string;
  sourcePath: string;
  isRequired: boolean;
  isArray: boolean;
  format?: string;           // Field format metadata
  precision?: number;        // Numeric precision
}

export interface NestedFieldMapping {
  fieldName: string;
  entityType: string;
  isArray: boolean;
}

export interface AvailableEntitySchema {
  id: number;
  name: string;
  fields: DetectedField[];
}

export interface EntityMatch {
  entity_id: number;
  entity_name: string;
  similarity_score: number;
  field_name_match: number;
  type_match: number;
  format_match: number;
  structure_match: number;
  format_compatibility: {
    is_compatible: boolean;
    incompatibilities: Array<{
      field: string;
      source_format: string;
      target_format: string;
      transformation_needed: boolean;
    }>;
    suggested_transformations: Array<{
      field: string;
      transformation: string;
    }>;
  };
  recommendation: 'strong_match' | 'good_match' | 'partial_match' | 'create_new';
}

// AI Schema Analysis Types
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

