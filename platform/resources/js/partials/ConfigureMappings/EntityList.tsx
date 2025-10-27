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

interface EntityListProps {
  fieldMappings: FieldMapping[];
  selectedEntityForMapping: string | null;
  onSelectEntity: (entityName: string) => void;
}

export const EntityList = ({
  fieldMappings,
  selectedEntityForMapping,
  onSelectEntity,
}: EntityListProps) => {
  // Get existing entities from current mappings
  const getExistingEntities = (): string[] => {
    return Array.from(
      new Set(fieldMappings.map((mapping) => mapping.entityName))
    );
  };

  return (
    <div className="space-y-4">
      {getExistingEntities().map((entityName) => {
        const entityMappings = fieldMappings.filter(
          (m) => m.entityName === entityName
        );
        const primaryMapping = entityMappings[0];
        const isSelected = selectedEntityForMapping === entityName;

        return (
          <div
            key={entityName}
            onClick={() => onSelectEntity(entityName)}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              isSelected 
                ? 'bg-indigo-100 border-indigo-300 ring-2 ring-indigo-200' 
                : 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-indigo-900">
                {entityName}
              </h3>
              <div className="flex space-x-1">
                <span className="text-xs bg-indigo-200 text-indigo-800 px-1 py-0.5 rounded">
                  {primaryMapping?.isArray ? "Array" : "Object"}
                </span>
                <span className="text-xs bg-gray-200 text-gray-800 px-1 py-0.5 rounded">
                  {primaryMapping?.schemaMapping?.fields.length || 0} fields
                </span>
              </div>
            </div>
            
            {/* Source Path */}
            <div className="text-xs text-gray-600">
              <span className="font-medium">Path:</span>{" "}
              <span className="font-mono">
                {primaryMapping?.fieldPath}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

