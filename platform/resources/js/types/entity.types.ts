/**
 * Entity-related type definitions
 */

import { DetectedField } from './schema.types';

export interface EntityField extends DetectedField {
  fieldName?: string;
  fieldType?: string;
  sourcePath?: string;
  isRequired?: boolean;
  isArray?: boolean;
  is_external_id?: boolean;
  source_schema_id?: number;
  source_field?: string;
}

export interface Entity {
  id: number;
  name: string;
  fields: EntityField[];
  created_at?: string;
  updated_at?: string;
}

export interface AvailableEntity {
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

export interface NewEntityData {
  label: string;
  fields: EntityField[];
  isNew: boolean;
  userPositioned?: boolean;
}