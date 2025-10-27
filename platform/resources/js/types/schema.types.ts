/**
 * Schema-related type definitions
 */

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
  status?: string;
}

export interface Schema {
  id: number;
  hash: string;
  name: string | null;
  tenant: string;
  tenant_id: string;
  detected_fields: DetectedField[];
  pending_records: number;
  created_at: string;
  status: 'pending' | 'confirmed' | 'analyzing';
}

export interface BronzeSchema {
  id: number;
  name: string | null;
  hash: string;
  detected_fields: DetectedField[];
  created_at: string;
}

export interface SchemaAnalysisEvent {
  status: 'started' | 'completed' | 'failed';
  schema_id: number;
  tenant_id: string;
  data?: {
    hash?: string;
    detected_fields?: DetectedField[];
    bronze_schema?: BronzeSchema;
    silver_entity?: SilverEntity;
    mappings_count?: number;
    error?: string;
  };
}

export interface SilverEntity {
  id: number;
  name: string;
  detected_fields: DetectedField[];
}