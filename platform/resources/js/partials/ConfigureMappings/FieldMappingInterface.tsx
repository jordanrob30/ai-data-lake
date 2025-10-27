interface DetectedField {
  name: string;
  type: string;
  sample_value?: any;
  required: boolean;
}

interface FieldMapping {
  fieldPath: string;
  entityName: string;
  isArray: boolean;
  fieldMappings?: NestedFieldMapping[];
  schemaMapping?: EntitySchemaMapping;
}

interface EntitySchemaMapping {
  entityName: string;
  fields: EntityField[];
  sourceStructure: any;
}

interface EntityField {
  fieldName: string;
  fieldType: string;
  sourcePath: string;
  isRequired: boolean;
  isArray: boolean;
}

interface NestedFieldMapping {
  fieldName: string;
  entityType: string;
  isArray: boolean;
}

interface AvailableEntitySchema {
  id: number;
  name: string;
  fields: DetectedField[];
}

interface FieldMappingInterfaceProps {
  selectedEntityForMapping: string;
  fieldMappings: FieldMapping[];
  allDetectedFields: DetectedField[];
  availableEntitySchemas: AvailableEntitySchema[];
  onRemoveEntity: (entityName: string) => void;
  onUpdateFieldEntityMapping: (entityName: string, fieldName: string, newFieldType: string) => void;
  onAddFieldToEntity: (entityName: string, inputField: DetectedField) => void;
  onRemoveFieldFromEntity: (entityName: string, fieldSourcePath: string) => void;
}

export const FieldMappingInterface = ({
  selectedEntityForMapping,
  fieldMappings,
  allDetectedFields,
  availableEntitySchemas,
  onRemoveEntity,
  onUpdateFieldEntityMapping,
  onAddFieldToEntity,
  onRemoveFieldFromEntity,
}: FieldMappingInterfaceProps) => {
  // Get existing entities from current mappings
  const getExistingEntities = (): string[] => {
    return Array.from(
      new Set(fieldMappings.map((mapping) => mapping.entityName))
    );
  };

  const entityMappings = fieldMappings.filter(m => m.entityName === selectedEntityForMapping);
  const primaryMapping = entityMappings[0];
  
  // Get available entity schemas for reference
  const entitySchema = availableEntitySchemas.find(e => e.name === selectedEntityForMapping);

  return (
    <div className="bg-white p-6 rounded-lg border">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">{selectedEntityForMapping}</h3>
          <p className="text-sm text-gray-600 mt-1">Map source fields to entity fields</p>
        </div>
        <div className="flex space-x-2">
          <span className="text-sm bg-indigo-100 text-indigo-800 px-2 py-1 rounded">
            {primaryMapping?.isArray ? "Array" : "Object"}
          </span>
          <button
            onClick={() => onRemoveEntity(selectedEntityForMapping)}
            className="text-sm text-red-600 hover:text-red-800 px-3 py-1 hover:bg-red-50 rounded transition-colors"
          >
            Remove Entity
          </button>
        </div>
      </div>

      {/* Field Mapping Interface */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-medium text-gray-900">Field Mappings</h4>
          {entitySchema && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Existing Entity:</span> {entitySchema.fields.length} fields available
            </div>
          )}
        </div>

        {/* Mapping Table */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b text-sm font-medium text-gray-700">
            <div className="col-span-4">Source Field</div>
            <div className="col-span-4">Target Field</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Actions</div>
          </div>
          
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {allDetectedFields.map((field, index) => {
              // Check current mapping for this field
              const currentMapping = primaryMapping?.schemaMapping?.fields.find(f => f.sourcePath === field.name);
              const isMappedElsewhere = fieldMappings.some(mapping => 
                mapping.entityName !== selectedEntityForMapping &&
                mapping.schemaMapping?.fields.some(f => f.sourcePath === field.name)
              );
              
              return (
                <div key={index} className={`grid grid-cols-12 gap-4 p-4 text-sm ${
                  currentMapping ? 'bg-green-50' : isMappedElsewhere ? 'bg-yellow-50' : ''
                }`}>
                  {/* Source Field */}
                  <div className="col-span-4">
                    <div className="font-mono font-medium text-blue-700">
                      {field.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {field.type} {field.required && <span className="text-red-500">*</span>}
                    </div>
                    {field.sample_value !== undefined && (
                      <div className="text-xs text-gray-400 truncate">
                        Sample: {JSON.stringify(field.sample_value).slice(0, 20)}...
                      </div>
                    )}
                  </div>

                  {/* Target Field Dropdown */}
                  <div className="col-span-4">
                    <select
                      value={currentMapping?.fieldName || ""}
                      onChange={(e) => {
                        if (e.target.value === "") {
                          // Remove mapping
                          if (currentMapping) {
                            onRemoveFieldFromEntity(selectedEntityForMapping, field.name);
                          }
                        } else {
                          // Add or update mapping
                          if (currentMapping) {
                            // Update existing mapping
                            onUpdateFieldEntityMapping(selectedEntityForMapping, currentMapping.fieldName, field.type);
                          } else {
                            // Create new mapping
                            onAddFieldToEntity(selectedEntityForMapping, {
                              ...field,
                              name: field.name
                            });
                          }
                        }
                      }}
                      disabled={isMappedElsewhere}
                      className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        isMappedElsewhere 
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="">-- Select target field --</option>
                      {/* Auto-generated field name */}
                      <option value={field.name.split('.').pop() || field.name}>
                        {field.name.split('.').pop() || field.name} (auto)
                      </option>
                      
                      {/* Existing entity fields if this is an existing entity */}
                      {entitySchema && entitySchema.fields.map(entityField => (
                        <option key={entityField.name} value={entityField.name}>
                          {entityField.name} (existing)
                        </option>
                      ))}
                    </select>
                    {isMappedElsewhere && (
                      <div className="text-xs text-yellow-600 mt-1">
                        Already mapped to another entity
                      </div>
                    )}
                  </div>

                  {/* Type */}
                  <div className="col-span-2">
                    {currentMapping ? (
                      <select
                        value={currentMapping.fieldType}
                        onChange={(e) => onUpdateFieldEntityMapping(selectedEntityForMapping, currentMapping.fieldName, e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="object">object</option>
                        <option value="array[string]">array[string]</option>
                        <option value="array[number]">array[number]</option>
                        <option value="array[boolean]">array[boolean]</option>
                        <option value="array[object]">array[object]</option>
                        {getExistingEntities().filter(name => name !== selectedEntityForMapping).map(entityName => (
                          <option key={entityName} value={entityName}>{entityName}</option>
                        ))}
                        {getExistingEntities().filter(name => name !== selectedEntityForMapping).map(entityName => (
                          <option key={`array-${entityName}`} value={`array[${entityName}]`}>array[{entityName}]</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-400 text-xs">
                        {field.type}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2">
                    <div className="flex items-center space-x-2">
                      {currentMapping && (
                        <>
                          <span className="text-xs text-green-600 bg-green-100 px-1 rounded">
                            Mapped
                          </span>
                          <button
                            onClick={() => onRemoveFieldFromEntity(selectedEntityForMapping, field.name)}
                            className="text-red-500 hover:text-red-700 text-xs"
                            title="Remove mapping"
                          >
                            ×
                          </button>
                        </>
                      )}
                      {!currentMapping && !isMappedElsewhere && (
                        <span className="text-xs text-gray-400">
                          Not mapped
                        </span>
                      )}
                      {isMappedElsewhere && (
                        <span className="text-xs text-yellow-600 bg-yellow-100 px-1 rounded">
                          Elsewhere
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mapping Instructions */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm text-blue-800">
          <div className="font-medium mb-1">💡 Field Mapping Instructions:</div>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Each input field is shown on its own row with a dropdown to select the target field</li>
            <li>By default, no target field is selected (-- Select target field --)</li>
            <li>Choose an auto-generated field name or select from existing entity fields</li>
            <li>Adjust field types after mapping to match your entity schema</li>
            <li>Required fields are marked with <span className="text-red-500">*</span></li>
            <li>Green rows = mapped to this entity, Yellow rows = mapped to other entities</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

