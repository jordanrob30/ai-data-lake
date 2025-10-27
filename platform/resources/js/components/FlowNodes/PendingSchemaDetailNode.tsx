import { Handle, Position, NodeProps, useReactFlow, useStore } from '@xyflow/react';
import { memo, useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { generateSourceHandleId } from '../../utils/handleIdHelpers';

interface DetectedField {
  name: string;
  type: string;
  sample_value?: any;
  required: boolean;
  format?: string;
  precision?: number;
  min_value?: number;
  max_value?: number;
}

interface AvailableEntity {
  id: number;
  name: string;
  fields: DetectedField[];
}

interface PendingSchemaDetailData {
  label: string;
  hash: string;
  tenant: string;
  fields: DetectedField[];
  pending_records: number;
  created_at: string;
  status: string;
  schema_id: number;
  sample_data?: any;
  available_entities?: AvailableEntity[];
}

// Get a color and icon for field types
const getTypeDisplay = (type: string) => {
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
};

const PendingSchemaDetailNode = ({ data, selected, id }: NodeProps<PendingSchemaDetailData>) => {
  const fields = data.fields || [];
  const displayFields = fields; // Show all fields
  const availableEntities = data.available_entities || [];

  const [showEntityOptions, setShowEntityOptions] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [selectedEntityName, setSelectedEntityName] = useState<string | null>(null);
  const [isCreatingNewEntity, setIsCreatingNewEntity] = useState(false);
  const [newEntityName, setNewEntityName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [mappingStats, setMappingStats] = useState<{ suggested: number, total: number } | null>(null);

  // Schema and entity naming for create as entity
  const [showNamingModal, setShowNamingModal] = useState(false);
  const [schemaNameInput, setSchemaNameInput] = useState(data.label || '');
  const [entityNameInput, setEntityNameInput] = useState('');

  // Schema naming for mapping to existing entity
  const [schemaMappingName, setSchemaMappingName] = useState(data.label || '');

  // ID and dedupe field selection
  const [externalIdField, setExternalIdField] = useState<string | null>(null);
  const [dedupeField, setDedupeField] = useState<string | null>(null);
  const [isCreatingNewEntityMode, setIsCreatingNewEntityMode] = useState(false);

  const { getEdges, getNodes, setEdges } = useReactFlow();

  // Subscribe to edge changes so the component re-renders when edges are added/removed
  const edgesLength = useStore((state) => state.edges.length);

  // Check if there are any connections from this node
  // Include both direct edges AND edges from connected formula nodes
  const allEdges = getEdges();
  const directEdges = allEdges.filter(edge => edge.source === id || edge.target === id);

  // Find formula nodes connected to this schema
  const connectedFormulaNodeIds = directEdges
    .filter(edge => edge.source === id)
    .map(edge => edge.target)
    .filter(targetId => {
      const targetNode = getNodes().find(n => n.id === targetId);
      return targetNode?.type === 'formulaNode';
    });

  // Get edges FROM those formula nodes
  const formulaOutputEdges = allEdges.filter(edge =>
    connectedFormulaNodeIds.includes(edge.source)
  );

  // Combine both sets of edges
  const connectedEdges = [...directEdges, ...formulaOutputEdges];
  const hasConnections = connectedEdges.length > 0;

  console.log('PendingSchemaDetailNode rendering:', data.label, 'Fields:', fields.length, 'Selected:', selected, 'Available entities:', availableEntities.length, 'Connections:', connectedEdges.length);

  // Listen for auto-mapping completion
  useEffect(() => {
    const handleAutoMappingComplete = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { sourceNodeId, suggestedCount, totalMatches } = customEvent.detail;

      if (sourceNodeId === `pending-${data.schema_id}`) {
        console.log('Auto-mapping complete:', { suggestedCount, totalMatches });
        setMappingStats({ suggested: suggestedCount, total: totalMatches });
      }
    };

    window.addEventListener('autoMappingComplete', handleAutoMappingComplete);

    return () => {
      window.removeEventListener('autoMappingComplete', handleAutoMappingComplete);
    };
  }, [data.schema_id]);

  // Watch for external ID field changes and emit event
  useEffect(() => {
    if (!externalIdField) return;

    // Find the target entity node (if one is selected)
    const currentEdges = getEdges();
    const currentNodes = getNodes();
    const sourceNodeId = `pending-${data.schema_id}`;

    // Find entity nodes connected to this pending schema
    const connectedEntityNodes = currentEdges
      .filter(edge => edge.source === sourceNodeId)
      .map(edge => currentNodes.find(n => n.id === edge.target))
      .filter(node => node && (node.type === 'entitySchemaDetail' || node.type === 'newEntity'));

    // Get field type for the external ID field
    const externalIdFieldData = fields.find(f => f.name === externalIdField);

    // Emit event for each connected entity
    connectedEntityNodes.forEach(entityNode => {
      if (entityNode) {
        window.dispatchEvent(new CustomEvent('updateExternalIdField', {
          detail: {
            sourceNodeId,
            targetNodeId: entityNode.id,
            externalIdField,
            fieldType: externalIdFieldData?.type || 'string',
            schemaId: data.schema_id,
          }
        }));
      }
    });

    // Also emit when external ID is selected but no entity connected yet
    // Store in node data for later use when entity is connected
    if (connectedEntityNodes.length === 0 && selectedEntityId) {
      const entityNodeId = `entity-${selectedEntityId}`;
      window.dispatchEvent(new CustomEvent('updateExternalIdField', {
        detail: {
          sourceNodeId,
          targetNodeId: entityNodeId,
          externalIdField,
          fieldType: externalIdFieldData?.type || 'string',
          schemaId: data.schema_id,
        }
      }));
    }
  }, [externalIdField, selectedEntityId, data.schema_id, getEdges, getNodes, fields]);

  const handleRemoveFieldMappings = (fieldName: string) => {
    const handleId = generateSourceHandleId(data.hash, fieldName);
    const currentEdges = getEdges();

    // Remove all edges connected to this specific field handle
    const updatedEdges = currentEdges.filter(edge =>
      edge.sourceHandle !== handleId && edge.targetHandle !== handleId
    );

    setEdges(updatedEdges);
    console.log(`Removed mappings for field: ${fieldName}`);
  };

  const handleMapToEntity = (entityId: number) => {
    setSelectedEntityId(entityId);
    const entity = availableEntities.find(e => e.id === entityId);
    if (entity) {
      console.log('Mapping to entity:', entityId, entity.name);
      setSelectedEntityName(entity.name);

      // Emit event for Dashboard to add entity node
      window.dispatchEvent(new CustomEvent('addExistingEntity', {
        detail: {
          entityId,
          entityName: entity.name,
          entityFields: entity.fields,
          sourceNodeId: `pending-${data.schema_id}`,
        }
      }));

      setShowEntityOptions(false);

      // Automatically trigger auto-mapping after a delay to let the node render and handles register
      setTimeout(() => {
        console.log('Auto-triggering field mapping for:', {
          sourceSchemaId: data.schema_id,
          targetEntityId: entityId,
          sourceHash: data.hash,
          targetEntityName: entity.name,
        });

        window.dispatchEvent(new CustomEvent('autoMapFields', {
          detail: {
            sourceSchemaId: data.schema_id,
            targetEntityId: entityId,
            sourceNodeId: `pending-${data.schema_id}`,
            targetNodeId: `entity-${entityId}`,
            sourceHash: data.hash,
            targetEntityName: entity.name,
          }
        }));
      }, 500); // Give the entity node time to render and handles time to register with React Flow
    }
  };

  const handleAutoMap = () => {
    if (!selectedEntityId || !selectedEntityName) return;

    console.log('Triggering auto-map:', {
      sourceSchemaId: data.schema_id,
      targetEntityId: selectedEntityId,
      sourceNodeId: `pending-${data.schema_id}`,
      targetNodeId: `entity-${selectedEntityId}`,
      sourceHash: data.hash,
      targetEntityName: selectedEntityName,
    });

    // Emit event for Dashboard to trigger auto-mapping
    window.dispatchEvent(new CustomEvent('autoMapFields', {
      detail: {
        sourceSchemaId: data.schema_id,
        targetEntityId: selectedEntityId,
        sourceNodeId: `pending-${data.schema_id}`,
        targetNodeId: `entity-${selectedEntityId}`,
        sourceHash: data.hash,
        targetEntityName: selectedEntityName,
      }
    }));
  };

  const handleCreateNewEntity = () => {
    if (!newEntityName.trim()) return;
    console.log('Creating new entity:', newEntityName);

    setIsCreatingNewEntityMode(true); // Track that we're creating a new entity

    // Emit event for Dashboard to add new entity node
    window.dispatchEvent(new CustomEvent('createNewEntity', {
      detail: {
        entityName: newEntityName,
        sourceNodeId: `pending-${data.schema_id}`,
      }
    }));

    setIsCreatingNewEntity(false);
    setNewEntityName('');
    setShowEntityOptions(false);
  };

  const handleCreateAsEntity = () => {
    setIsCreatingNewEntityMode(true);
    setShowNamingModal(true);
  };

  const handleConfirmCreateAsEntity = async () => {
    if (!schemaNameInput.trim() || !entityNameInput.trim()) {
      alert('Both schema name and entity name are required');
      return;
    }

    setIsSaving(true);

    console.log('Creating schema as entity:', {
      schemaId: data.schema_id,
      schemaName: schemaNameInput,
      entityName: entityNameInput,
    });

    try {
      const response = await fetch('/api/schemas/create-as-entity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          schema_id: data.schema_id,
          schema_name: schemaNameInput,
          entity_name: entityNameInput,
          external_id_field: externalIdField,
          // Dedupe field NOT sent when creating as entity (new entity creation)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create entity');
      }

      const result = await response.json();
      console.log('Schema converted to entity successfully', result);
      console.log(`Created ${result.field_mappings_created} field-level mappings`);

      const entityData = result.entity_schema;

      // Emit event to add entity node visualization
      window.dispatchEvent(new CustomEvent('createEntityFromSchema', {
        detail: {
          schemaId: data.schema_id,
          entityId: entityData?.id || data.schema_id,
          schemaNodeId: id,
          entityName: entityData?.name || entityNameInput,
          entityFields: data.fields,
        }
      }));

      // Emit event to update <schema_name>_id to actual schema name
      if (externalIdField) {
        window.dispatchEvent(new CustomEvent('updateSchemaIdFieldName', {
          detail: {
            schemaId: data.schema_id,
            schemaName: schemaNameInput,
            entityId: entityData?.id || data.schema_id,
          }
        }));
      }

      // Refresh dashboard after a short delay to show the animation
      setTimeout(() => {
        router.visit('/dashboard');
      }, 500);
    } catch (error) {
      console.error('Error creating entity:', error);
      setIsSaving(false);
      alert('Error creating entity. Please try again.');
    }
  };

  const handleSaveMapping = async () => {
    if (!hasConnections) {
      alert('Please create at least one field mapping before saving.');
      return;
    }

    if (!schemaMappingName.trim()) {
      alert('Please provide a schema name before saving.');
      return;
    }

    setIsSaving(true);

    try {
      // Group edges by target entity and build entity schema mappings
      const entitiesMap = new Map<string, any>();
      const nodes = getNodes();

      connectedEdges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (!sourceNode || !targetNode) {
          console.warn('Source or target node not found for edge:', edge.id);
          return;
        }

        // Skip edges that go TO formula nodes - these are intermediate transformations
        if (targetNode.type === 'formulaNode') {
          console.log('Skipping edge to formula node:', edge.id);
          return;
        }

        // Skip edges from non-entity/non-formula targets (only process final mappings)
        const isEntityTarget = targetNode.type === 'entitySchema' ||
                               targetNode.type === 'entitySchemaDetail' ||
                               targetNode.type === 'newEntity';

        if (!isEntityTarget) {
          console.warn('Target is not an entity:', targetNode.type);
          return;
        }

        const entityName = targetNode.data.label;

        // Determine if this mapping uses a formula
        const isFormulaMapping = sourceNode.type === 'formulaNode';

        let sourceField, targetField, sourceType, formulaExpression, formulaLanguage;

        if (isFormulaMapping) {
          // Formula mapping: source is the formula node itself
          // Get the source fields that feed into the formula
          const sourceFields = sourceNode.data.sourceFields || [];
          sourceField = sourceFields.map(f => f.name).join(',') || sourceNode.data.targetField;
          targetField = edge.data?.targetField || edge.targetHandle?.split('-').slice(1).join('-');
          sourceType = 'string'; // Formula output type (could be enhanced later)
          formulaExpression = sourceNode.data.formula;
          formulaLanguage = sourceNode.data.formulaLanguage || 'JSONata';

          console.log('Processing formula mapping:', {
            formula: formulaExpression,
            targetField,
            sourceFields: sourceNode.data.sourceFields,
            language: formulaLanguage
          });
        } else {
          // Direct mapping: source is a field from the pending schema
          sourceField = edge.data?.sourceField || edge.sourceHandle?.split('-').slice(1).join('-');
          targetField = edge.data?.targetField || edge.targetHandle?.split('-').slice(1).join('-');
          sourceType = edge.data?.sourceType || 'string';
        }

        if (!entitiesMap.has(entityName)) {
          entitiesMap.set(entityName, {
            fieldPath: '_root', // Mapping from root of source schema
            entityName: entityName,
            isArray: false,
            schemaMapping: {
              fields: []
            }
          });
        }

        const entity = entitiesMap.get(entityName);
        entity.schemaMapping.fields.push({
          fieldName: targetField,
          fieldType: sourceType,
          sourcePath: sourceField,
          isRequired: false,
          isArray: false,
          // Include formula data if this is a formula mapping
          ...(isFormulaMapping && {
            mappingType: 'formula',
            formulaExpression: formulaExpression,
            formulaLanguage: formulaLanguage,
            sourceFields: sourceNode.data.sourceFields, // Include all source fields the formula uses
          }),
        });
      });

      const entitiesData = Array.from(entitiesMap.values());

      console.log('===== SAVE MAPPING DEBUG =====');
      console.log('Total edges:', connectedEdges.length);
      console.log('Entities to save:', entitiesData.length);
      console.log('Full entities data:', JSON.stringify(entitiesData, null, 2));
      console.log('===== END DEBUG =====');

      console.log('Saving entity mappings:', {
        schemaId: data.schema_id,
        schemaName: schemaMappingName,
        entities: entitiesData,
      });

      const response = await fetch(`/api/schemas/${data.schema_id}/entities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
        },
        body: JSON.stringify({
          schema_name: schemaMappingName,
          entities: entitiesData,
          external_id_field: externalIdField,
          dedupe_field: !isCreatingNewEntityMode ? dedupeField : null, // Only send dedupe when mapping to existing entities
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Entities saved successfully');

        // Emit event to update <schema_name>_id to actual schema name
        if (externalIdField) {
          // Find connected entity nodes to update
          connectedEdges.forEach(edge => {
            const targetNode = getNodes().find(n => n.id === edge.target);
            if (targetNode && (targetNode.type === 'entitySchemaDetail' || targetNode.type === 'newEntity' || targetNode.type === 'entitySchema')) {
              const entityId = targetNode.id.replace('entity-', '');
              window.dispatchEvent(new CustomEvent('updateSchemaIdFieldName', {
                detail: {
                  schemaId: data.schema_id,
                  schemaName: schemaMappingName,
                  entityId: parseInt(entityId) || entityId,
                }
              }));
            }
          });
        }

        router.visit('/dashboard', {
          preserveState: false,
          preserveScroll: false,
        });
      } else {
        alert(`Failed to save entities: ${result.message}`);
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Error saving mappings:', error);
      setIsSaving(false);
      alert('Error saving mappings. Please try again.');
    }
  };

  return (
    <>
      {/* Naming Modal for Create as Entity */}
      {showNamingModal && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg">
          <div className="bg-white rounded-lg p-4 shadow-xl max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Name Your Schema & Entity</h3>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Original Schema Name
                </label>
                <input
                  type="text"
                  value={schemaNameInput}
                  onChange={(e) => setSchemaNameInput(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="e.g., stripe_customer"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">This is the bronze layer schema name</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Entity Schema Name
                </label>
                <input
                  type="text"
                  value={entityNameInput}
                  onChange={(e) => setEntityNameInput(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="e.g., customer"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">This is the silver layer entity name</p>
              </div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleConfirmCreateAsEntity();
                }}
                disabled={isSaving}
                className={`flex-1 px-4 py-2 text-sm font-bold rounded transition-colors ${
                  isSaving
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {isSaving ? 'Creating...' : 'Create Entity'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNamingModal(false);
                  setIsSaving(false);
                }}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 text-sm font-bold rounded hover:bg-gray-400 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`bg-gradient-to-br from-amber-50 to-orange-50 border-2 rounded-lg shadow-lg min-w-[320px] max-w-[400px] transition-all ${
          selected ? 'border-orange-500 shadow-xl ring-2 ring-orange-300' : 'border-orange-300'
        }`}
      >
        {/* Alert Badge */}
        <div className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg animate-pulse z-10">
          <span className="text-xl font-bold">!</span>
        </div>

      {/* Header */}
      <div className="bg-gradient-to-r from-orange-100 to-amber-100 p-4 border-b-2 border-orange-200 rounded-t-lg">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-2xl">⚠️</span>
              <h3 className="font-bold text-gray-900 text-sm">{data.label}</h3>
            </div>
            <p className="text-xs text-gray-700 font-medium">Pending Confirmation</p>
          </div>
          <span className="text-xs bg-orange-200 text-orange-900 px-2 py-1 rounded-full font-bold shadow-sm">
            {data.pending_records} waiting
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs mt-3">
          <div>
            <span className="text-gray-600">Tenant:</span>
            <span className="ml-1 font-medium text-orange-800">{data.tenant}</span>
          </div>
          <div>
            <span className="text-gray-600">Fields:</span>
            <span className="ml-1 font-medium text-gray-900">{fields.length}</span>
          </div>
        </div>
      </div>

      {/* Entity Mapping Section - MOVED TO TOP */}
      <div className="bg-white border-t-2 border-orange-200 p-3">
        {/* Primary action: Create as Entity */}
        <div className="mb-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCreateAsEntity();
            }}
            disabled={isSaving}
            className={`w-full px-4 py-3 text-sm font-bold rounded-lg transition-colors shadow-md ${
              isSaving
                ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            ✨ Create as Silver Layer Entity
          </button>
          <p className="text-xs text-gray-600 text-center mt-1.5 italic">
            Convert this schema to a confirmed entity
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center my-3">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-3 text-xs text-gray-500 font-medium">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Secondary action: Map to Entity */}
        <div className="mb-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEntityOptions(!showEntityOptions);
            }}
            className="w-full px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded hover:bg-indigo-700 transition-colors flex items-center justify-between"
          >
            <span>Map to Existing Entity</span>
            <span>{showEntityOptions ? '▲' : '▼'}</span>
          </button>
        </div>

        {showEntityOptions && (
          <div className="space-y-2">
            {/* Existing entities list */}
            {availableEntities.length > 0 ? (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-700 mb-2">Select entity to map to:</p>
                {availableEntities.map((entity) => (
                  <button
                    key={entity.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMapToEntity(entity.id);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded border transition-all ${
                      selectedEntityId === entity.id
                        ? 'bg-indigo-100 border-indigo-400 font-semibold'
                        : 'bg-white border-gray-300 hover:border-indigo-300 hover:bg-indigo-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{entity.name}</div>
                    <div className="text-gray-600 mt-0.5">{entity.fields.length} fields</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic text-center py-2 bg-gray-50 rounded border border-gray-200">
                No existing entities available yet
              </div>
            )}

            {/* Divider */}
            <div className="border-t border-gray-300 my-2"></div>

            {/* Create new entity */}
            {!isCreatingNewEntity ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCreatingNewEntity(true);
                }}
                className="w-full px-3 py-2 bg-green-600 text-white text-sm font-semibold rounded hover:bg-green-700 transition-colors"
              >
                + Create New Entity to Map To
              </button>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newEntityName}
                  onChange={(e) => setNewEntityName(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateNewEntity();
                    if (e.key === 'Escape') {
                      setIsCreatingNewEntity(false);
                      setNewEntityName('');
                    }
                  }}
                  placeholder="Enter entity name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
                <div className="flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateNewEntity();
                    }}
                    className="flex-1 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCreatingNewEntity(false);
                      setNewEntityName('');
                    }}
                    className="flex-1 px-3 py-1.5 bg-gray-300 text-gray-700 text-xs font-semibold rounded hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auto-Map Button */}
      {selectedEntityId && selectedEntityName && (
        <div className="bg-indigo-50 border-t-2 border-indigo-200 p-3">
          <div className="mb-2">
            <div className="text-xs font-semibold text-indigo-900 mb-1">
              🤖 Intelligent Field Mapping
            </div>
            <div className="text-xs text-indigo-700">
              Selected entity: <span className="font-semibold">{selectedEntityName}</span>
            </div>
          </div>

          {mappingStats ? (
            <div className="mb-2 bg-green-50 border border-green-200 rounded p-2">
              <div className="text-xs text-green-800 font-medium">
                ✓ Auto-mapped {mappingStats.suggested} of {mappingStats.total} fields
              </div>
            </div>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAutoMap();
              }}
              className="w-full px-3 py-2 bg-indigo-600 text-white text-sm font-semibold rounded hover:bg-indigo-700 transition-colors"
            >
              ⚡ Auto-Map Fields
            </button>
          )}
        </div>
      )}

      {/* Fields List - Full Height */}
      <div className="p-3 bg-white border-t-2 border-orange-200">
        <div className="mb-2 pb-2 border-b border-orange-200">
          <p className="text-xs font-semibold text-orange-800">
            👉 Drag from fields to create mappings
          </p>
        </div>

        <div className="space-y-1.5">
          {displayFields.map((field, index) => {
            const typeInfo = getTypeDisplay(field.type);
            const handleId = generateSourceHandleId(data.hash, field.name);
            const isExternalId = externalIdField === field.name;
            const isDedupeField = dedupeField === field.name;

            // Check if this field has any connections
            const fieldHasConnections = allEdges.some(edge =>
              edge.sourceHandle === handleId || edge.targetHandle === handleId
            );

            return (
              <div
                key={index}
                className={`relative bg-gradient-to-r from-orange-50 to-amber-50 border rounded p-2 hover:shadow-md transition-all group ${
                  isExternalId ? 'border-purple-400 ring-1 ring-purple-300' : 'border-orange-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center space-x-1.5 mb-1">
                      <span className="text-xs">{typeInfo.icon}</span>
                      <span className="text-xs font-semibold text-gray-900 truncate">
                        {field.name}
                      </span>
                      {field.required && (
                        <span className="text-xs text-red-600">*</span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${typeInfo.color} font-medium`}>
                        {field.type}
                      </span>
                      {field.format && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {field.format}
                        </span>
                      )}

                      {/* ID checkbox */}
                      <label className="flex items-center space-x-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isExternalId}
                          onChange={(e) => {
                            e.stopPropagation();
                            setExternalIdField(isExternalId ? null : field.name);
                          }}
                          className="w-3 h-3 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-xs text-gray-600">ID</span>
                      </label>

                      {/* Dedupe checkbox - always visible */}
                      <label className="flex items-center space-x-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isDedupeField}
                          onChange={(e) => {
                            e.stopPropagation();
                            setDedupeField(isDedupeField ? null : field.name);
                          }}
                          className="w-3 h-3 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-xs text-gray-600">Dedupe</span>
                      </label>
                    </div>
                  </div>

                  {/* Connection handle and delete button container */}
                  <div className="relative">
                    {/* Always render Handle for ReactFlow to work */}
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={handleId}
                      className={`!w-2.5 !h-2.5 !bg-orange-500 !border !border-white !relative !transform-none !top-auto !right-0 group-hover:!bg-orange-600 group-hover:!w-3.5 group-hover:!h-3.5 transition-all cursor-crosshair !shadow-sm ${
                        fieldHasConnections ? '!opacity-0' : '!opacity-90'
                      }`}
                      style={{
                        position: 'relative',
                        transform: 'none',
                        zIndex: 5,
                      }}
                    />

                    {/* Show delete button when connected */}
                    {fieldHasConnections && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFieldMappings(field.name);
                        }}
                        className="absolute right-0 top-0 text-red-600 hover:text-red-800 text-base font-bold transition-colors"
                        style={{ zIndex: 10 }}
                        title="Remove field mappings"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Sample value preview */}
                {field.sample_value !== undefined && field.sample_value !== null && (
                  <div className="mt-1.5 text-xs text-gray-600 bg-white rounded px-2 py-1 font-mono truncate border border-orange-100">
                    {JSON.stringify(field.sample_value).substring(0, 50)}
                    {JSON.stringify(field.sample_value).length > 50 && '...'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer with action buttons */}
      <div className="bg-gradient-to-r from-orange-100 to-amber-100 p-3 border-t-2 border-orange-200 rounded-b-lg">
        <div className="text-xs text-gray-600 mb-2">
          <span className="font-mono text-gray-500">{data.hash}</span>
        </div>

        {hasConnections ? (
          <div className="space-y-2">
            <div className="text-xs text-green-800 font-semibold text-center bg-green-50 p-2 rounded border border-green-200">
              ✓ {connectedEdges.length} field mapping{connectedEdges.length !== 1 ? 's' : ''} created
            </div>

            {/* Schema Name Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Schema Name (Bronze Layer)
              </label>
              <input
                type="text"
                value={schemaMappingName}
                onChange={(e) => setSchemaMappingName(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="e.g., stripe_customer"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              />
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveMapping();
              }}
              disabled={isSaving}
              className={`w-full px-4 py-2 text-sm font-bold rounded transition-colors ${
                isSaving
                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save & Confirm Schema'}
            </button>
          </div>
        ) : (
          <div className="text-xs text-orange-800 font-semibold text-center bg-orange-50 p-2 rounded border border-orange-200">
            1. Map to entity above<br />
            2. Connect fields<br />
            3. Save to confirm
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default memo(PendingSchemaDetailNode);
