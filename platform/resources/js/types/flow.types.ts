/**
 * React Flow specific type definitions
 */

import { Node, Edge, MarkerType } from '@xyflow/react';
import { DetectedField } from './schema.types';
import { EntityField } from './entity.types';
import { MappingDefinition } from './mapping.types';

// Base node data interfaces
export interface BaseNodeData {
  label: string;
  fields: (DetectedField | EntityField)[];
}

export interface SourceSchemaNodeData extends BaseNodeData {
  hash: string;
  tenant: string;
  pending_records: number;
  created_at: string;
}

export interface EntitySchemaNodeData extends BaseNodeData {
  standalone?: boolean;
}

export interface PendingSchemaNodeData extends SourceSchemaNodeData {
  status: string;
  schema_id: number;
  sample_data?: any;
  available_entities?: Array<{
    id: number;
    name: string;
    fields: DetectedField[];
  }>;
}

export interface AnalyzingSchemaNodeData extends BaseNodeData {
  hash: string;
  tenant: string;
}

export interface NewEntityNodeData extends BaseNodeData {
  isNew: boolean;
  userPositioned?: boolean;
}

export interface FormulaNodeData {
  label: string;
  formula: string;
  formulaLanguage: 'JSONata' | 'JavaScript';
  sourceFields: Array<{
    name: string;
    type: string;
  }>;
  targetField: string;
  collapsed: boolean;
  onSave?: (formula: string) => void;
  onDelete?: () => void;
}

// Edge data interfaces
export interface BaseEdgeData {
  offset?: number;
  sourceField?: string;
  targetField?: string;
  mappingType?: 'direct' | 'formula';
  onConvertToFormula?: (edgeId: string, mouseX?: number, mouseY?: number) => void;
}

export interface FieldLevelEdgeData extends BaseEdgeData {
  similarity?: number;
  sourceType?: string;
  autoSuggested?: boolean;
  isPending?: boolean;
}

export interface ExternalIdEdgeData extends BaseEdgeData {
  isExternalIdMapping: boolean;
  sourceSchemaId: number;
}

export interface MappingEdgeData extends BaseEdgeData {
  mapping_definition?: MappingDefinition;
}

// Flow data structure
export interface FlowData {
  nodes: Node[];
  edges: Edge[];
}

// Dashboard stats
export interface DashboardStats {
  total_schemas: number;
  total_entities: number;
  total_mappings: number;
  pending_confirmations: number;
}

// Node type mappings
export type NodeTypes = {
  sourceSchema: React.ComponentType<any>;
  entitySchema: React.ComponentType<any>;
  sourceSchemaDetail: React.ComponentType<any>;
  entitySchemaDetail: React.ComponentType<any>;
  pendingSchema: React.ComponentType<any>;
  pendingSchemaDetail: React.ComponentType<any>;
  analyzingSchema: React.ComponentType<any>;
  newEntity: React.ComponentType<any>;
  formulaNode: React.ComponentType<any>;
};

// Edge type mappings
export type EdgeTypes = {
  staggered: React.ComponentType<any>;
};

// Event types
export interface AutoMappingCompleteEvent {
  sourceNodeId: string;
  targetNodeId: string;
  suggestedCount: number;
  totalMatches: number;
}

export interface CreateNewEntityEvent {
  entityName: string;
  sourceNodeId: string;
}

export interface AddExistingEntityEvent {
  entityId: number;
  entityName: string;
  entityFields: EntityField[];
  sourceNodeId: string;
}

export interface AutoMapFieldsEvent {
  sourceSchemaId: number;
  targetEntityId: number;
  sourceNodeId: string;
  targetNodeId: string;
  sourceHash: string;
  targetEntityName: string;
}

export interface UpdateSchemaIdFieldNameEvent {
  schemaId: number;
  schemaName: string;
  entityId: number;
}

export interface UpdateExternalIdFieldEvent {
  sourceNodeId: string;
  targetNodeId: string;
  externalIdField: string;
  fieldType: string;
  schemaId: number;
}

export interface CreateEntityFromSchemaEvent {
  schemaId: number;
  entityId?: number;
  schemaNodeId: string;
  entityName: string;
  entityFields: EntityField[];
}