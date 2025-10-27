import { useState, useCallback } from "react";

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

interface InteractiveJsonRendererProps {
  sampleData: any;
  detectedFields: DetectedField[];
  fieldMappings: FieldMapping[];
  availableEntitySchemas: AvailableEntitySchema[];
  hoveredBlock: string | null;
  highlightedSimilarPaths: string[];
  dropdownTimeouts: { [key: string]: NodeJS.Timeout };
  onMouseEnter: (path: string) => void;
  onMouseLeave: () => void;
  onDropdownMouseEnter: (dropdownId: string) => void;
  onDropdownMouseLeave: (dropdownId: string) => void;
  onAddFieldMapping: (fieldPath: string, entityName: string, isArray: boolean, autoPopulateFields: boolean) => void;
  onShowEntityCreator: (fieldPath: string, suggestedName: string) => void;
  toPascalCase: (str: string) => string;
}

export const InteractiveJsonRenderer = ({
  sampleData,
  detectedFields,
  fieldMappings,
  availableEntitySchemas,
  hoveredBlock,
  highlightedSimilarPaths,
  dropdownTimeouts,
  onMouseEnter,
  onMouseLeave,
  onDropdownMouseEnter,
  onDropdownMouseLeave,
  onAddFieldMapping,
  onShowEntityCreator,
  toPascalCase,
}: InteractiveJsonRendererProps) => {
  // Get existing entities from current mappings
  const getExistingEntities = (): string[] => {
    return Array.from(
      new Set(fieldMappings.map((mapping) => mapping.entityName))
    );
  };

  // Get all available entities (existing + other entities in system)
  const getAllAvailableEntities = (): string[] => {
    const currentEntities = getExistingEntities();
    const availableEntities = availableEntitySchemas.map(
      (entity) => entity.name
    );

    // Combine and deduplicate
    const allEntities = Array.from(
      new Set([...currentEntities, ...availableEntities])
    );
    return allEntities;
  };

  // Get all mappable paths from the JSON structure
  const getMappablePaths = (
    data: any,
    basePath: string = "_root"
  ): string[] => {
    const paths: string[] = [];

    const traverse = (obj: any, currentPath: string) => {
      if (typeof obj === "object" && obj !== null) {
        paths.push(currentPath);

        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            if (typeof item === "object" && item !== null) {
              traverse(item, `${currentPath}[${index}]`);
            }
          });
        } else {
          Object.entries(obj).forEach(([key, value]) => {
            const newPath =
              currentPath === "_root"
                ? key
                : `${currentPath}.${key}`;
            if (typeof value === "object" && value !== null) {
              traverse(value, newPath);
            }
          });
        }
      }
    };

    traverse(data, basePath);
    return paths;
  };

  // Get mapping for a field
  const getFieldMapping = (fieldPath: string): FieldMapping | undefined => {
    return fieldMappings.find((m) => m.fieldPath === fieldPath);
  };

  // Get object shape signature for similarity matching
  const getObjectShape = (obj: any): string => {
    if (typeof obj !== "object" || obj === null) return typeof obj;
    if (Array.isArray(obj)) {
      if (obj.length === 0) return "array:empty";
      return `array:${getObjectShape(obj[0])}`;
    }

    const keys = Object.keys(obj).sort();
    const shape = keys
      .map((key) => `${key}:${getObjectShape(obj[key])}`)
      .join(",");
    return `{${shape}}`;
  };

  // Find similar objects and get consistent naming
  const findSimilarObjects = (data: any, targetShape: string): string[] => {
    const paths: string[] = [];

    const traverse = (obj: any, currentPath: string) => {
      if (typeof obj === "object" && obj !== null) {
        if (getObjectShape(obj) === targetShape) {
          paths.push(currentPath);
        }

        if (Array.isArray(obj)) {
          obj.forEach((item, index) => {
            traverse(item, `${currentPath}[${index}]`);
          });
        } else {
          Object.entries(obj).forEach(([key, value]) => {
            const newPath =
              currentPath === "_root"
                ? key
                : `${currentPath}.${key}`;
            traverse(value, newPath);
          });
        }
      }
    };

    traverse(data, "_root");
    return paths;
  };

  // Get a suggested entity name from field path with improved logic
  const getSuggestedEntityName = (fieldPath: string): string => {
    // Handle root object
    if (fieldPath === "_root") {
      return "RootEntity";
    }

    // Remove array indices and get the last meaningful part
    const cleanPath = fieldPath.replace(/\[\d+\]/g, "");
    const parts = cleanPath.split(".");
    const lastPart = parts[parts.length - 1];

    // Convert to PascalCase with improved logic
    let suggested = toPascalCase(lastPart);

    // Handle common plural patterns - but be more careful
    if (
      suggested.length > 4 &&
      suggested.endsWith("s") &&
      !suggested.endsWith("ss")
    ) {
      // Don't remove 's' from words like "address", "process", "address"
      const withoutS = suggested.slice(0, -1);
      // Only remove 's' if it's likely a plural (not words ending in double letters)
      if (
        !lastPart.match(/[aeiou]ss$/i) &&
        !lastPart.match(/address$/i)
      ) {
        suggested = withoutS;
      }
    }
    if (suggested.endsWith("ies") && suggested.length > 4) {
      suggested = suggested.slice(0, -3) + "y";
    }

    // Check if we have similar objects and use consistent naming
    const currentValue = getValueAtPath(sampleData, fieldPath);
    if (currentValue && typeof currentValue === "object") {
      const shape = getObjectShape(currentValue);
      const similarPaths = findSimilarObjects(sampleData, shape);

      // If we have existing mappings for similar objects, use that name
      for (const similarPath of similarPaths) {
        const existingMapping = getFieldMapping(similarPath);
        if (existingMapping) {
          return existingMapping.entityName;
        }
      }
    }

    return suggested;
  };

  // Helper function to get value at a specific path
  const getValueAtPath = (data: any, path: string): any => {
    if (path === "_root") return data;

    const parts = path.split(".");
    let current = data;

    for (const part of parts) {
      if (part.includes("[") && part.includes("]")) {
        const [key, indexStr] = part.split("[");
        const index = parseInt(indexStr.replace("]", ""));
        current = current?.[key]?.[index];
      } else {
        current = current?.[part];
      }
    }

    return current;
  };

  // Get all mappable paths from the sample data
  const mappablePaths = getMappablePaths(sampleData);

  // Render interactive JSON with hover controls
  const renderInteractiveJson = (
    data: any,
    path: string = "_root",
    level: number = 0
  ): JSX.Element => {
    const indentSpaces = level * 2;
    const nextIndentSpaces = (level + 1) * 2;
    const mapping = getFieldMapping(path);
    const isHovered = hoveredBlock === path;
    const isSimilarHighlighted = highlightedSimilarPaths.includes(path);
    const canMap = mappablePaths.includes(path);
    const suggestedName = getSuggestedEntityName(path);

    // Create indentation using nbsp and spaces for proper rendering
    const createIndent = (spaces: number) => (
      <span
        style={{ paddingLeft: `${spaces * 0.5}em` }}
        className="text-gray-400"
      ></span>
    );

    if (data === null) {
      return <span className="text-gray-500">null</span>;
    }

    if (data === undefined) {
      return <span className="text-gray-500">undefined</span>;
    }

    if (typeof data === "string") {
      return <span className="text-green-600">"{data}"</span>;
    }

    if (typeof data === "number") {
      return <span className="text-blue-600">{data}</span>;
    }

    if (typeof data === "boolean") {
      return <span className="text-purple-600">{data.toString()}</span>;
    }

    if (Array.isArray(data)) {
      // Calculate highlighting classes
      const getHighlightClasses = () => {
        if (!canMap) return "";
        if (isHovered)
          return "bg-blue-200 shadow-md border border-blue-300";
        if (isSimilarHighlighted)
          return "bg-orange-100 border border-orange-200";
        return "hover:bg-blue-100 transition-colors cursor-pointer";
      };

      return (
        <span
          className={`relative rounded-md px-1 ${getHighlightClasses()}`}
          onMouseEnter={() => canMap && onMouseEnter(path)}
          onMouseLeave={() => canMap && onMouseLeave()}
        >
          {/* Hover Controls for Arrays */}
          {isHovered && canMap && (
            <div className="absolute top-0 left-full ml-2 -translate-y-2 bg-white rounded-md shadow-lg p-3 z-10 border whitespace-normal min-w-48">
              <div className="flex flex-col space-y-2">
                <div className="text-xs text-gray-600 font-medium">
                  Array at: {path}
                </div>
                {(() => {
                  const currentValue = getValueAtPath(sampleData, path);
                  const shape = getObjectShape(currentValue);
                  const similarPaths = findSimilarObjects(sampleData, shape);
                  const similarCount = similarPaths.length;

                  return (
                    similarCount > 1 && (
                      <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        {similarCount} similar arrays found (highlighted in orange)
                        <div className="text-xs text-gray-500 mt-1">
                          Paths:{" "}
                          {similarPaths.slice(0, 3).join(", ")}
                          {similarPaths.length > 3 ? "..." : ""}
                        </div>
                      </div>
                    )
                  );
                })()}
                <div className="flex flex-wrap gap-1">
                  {suggestedName && (
                    <button
                      onClick={() => {
                        onAddFieldMapping(path, suggestedName, true, true);
                      }}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors font-medium"
                    >
                      → {suggestedName}
                    </button>
                  )}

                  {/* Map to existing entities */}
                  {getAllAvailableEntities().length > 0 && (
                    <div 
                      className="relative group"
                      onMouseEnter={() => onDropdownMouseEnter(`dropdown-${path}`)}
                      onMouseLeave={() => onDropdownMouseLeave(`dropdown-${path}`)}
                    >
                      <button className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 transition-colors">
                        Map to Entity ▼
                      </button>
                      <div className="absolute left-0 top-full mt-1 bg-white border rounded-md shadow-lg z-20 min-w-64 max-w-80 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200">
                        <div className="py-1">
                          {getAllAvailableEntities().map((entityName) => {
                            const entitySchema = availableEntitySchemas.find(
                              (e) => e.name === entityName
                            );
                            const isCurrentEntity = getExistingEntities().includes(entityName);
                            return (
                              <button
                                key={entityName}
                                onClick={() => {
                                  onAddFieldMapping(path, entityName, true, false);
                                }}
                                className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium truncate flex-1">
                                    {entityName}
                                  </span>
                                  <div className="flex items-center space-x-1 flex-shrink-0">
                                    {entitySchema && (
                                      <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {entitySchema.fields.length} fields
                                      </span>
                                    )}
                                    {isCurrentEntity && (
                                      <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded whitespace-nowrap">
                                        current
                                      </span>
                                    )}
                                    {!isCurrentEntity && entitySchema && (
                                      <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded whitespace-nowrap">
                                        existing
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      onShowEntityCreator(path, suggestedName || "");
                    }}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                  >
                    Custom
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Entity Badge */}
          {mapping && (
            <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full whitespace-normal flex items-center space-x-1">
              <span>{mapping.entityName}</span>
              {mapping.schemaMapping && (
                <span className="bg-green-600 rounded-full w-4 h-4 flex items-center justify-center text-xs">
                  {mapping.schemaMapping.fields.length}
                </span>
              )}
            </div>
          )}

          <span className="text-gray-600">
            [
            {data.length > 0 ? (
              <>
                {data.map((item, index) => {
                  const itemPath = `${path}[${index}]`;
                  const isLast = index === data.length - 1;
                  return (
                    <span key={index}>
                      <br />
                      {createIndent(nextIndentSpaces)}
                      {renderInteractiveJson(item, itemPath, level + 1)}
                      {!isLast && (
                        <span className="text-gray-600">,</span>
                      )}
                    </span>
                  );
                })}
                <br />
                {createIndent(indentSpaces)}
              </>
            ) : null}
            ]
          </span>
        </span>
      );
    }

    if (typeof data === "object") {
      const entries = Object.entries(data);

      // Calculate highlighting classes
      const getHighlightClasses = () => {
        if (!canMap) return "";
        if (isHovered)
          return "bg-blue-200 shadow-md border border-blue-300";
        if (isSimilarHighlighted)
          return "bg-orange-100 border border-orange-200";
        return "hover:bg-blue-100 transition-colors cursor-pointer";
      };

      return (
        <span
          className={`relative rounded-md px-1 ${getHighlightClasses()}`}
          onMouseEnter={() => canMap && onMouseEnter(path)}
          onMouseLeave={() => canMap && onMouseLeave()}
        >
          {/* Hover Controls for Objects */}
          {isHovered && canMap && (
            <div className="absolute top-0 left-full ml-2 -translate-y-2 bg-white rounded-md shadow-lg p-3 z-10 border whitespace-normal min-w-48">
              <div className="flex flex-col space-y-2">
                <div className="text-xs text-gray-600 font-medium">
                  Object at: {path}
                </div>
                {(() => {
                  const currentValue = getValueAtPath(sampleData, path);
                  const shape = getObjectShape(currentValue);
                  const similarPaths = findSimilarObjects(sampleData, shape);
                  const similarCount = similarPaths.length;

                  return (
                    similarCount > 1 && (
                      <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        {similarCount} similar objects found (highlighted in orange)
                        <div className="text-xs text-gray-500 mt-1">
                          Paths:{" "}
                          {similarPaths.slice(0, 3).join(", ")}
                          {similarPaths.length > 3 ? "..." : ""}
                        </div>
                      </div>
                    )
                  );
                })()}
                <div className="flex flex-wrap gap-1">
                  {suggestedName && (
                    <button
                      onClick={() => {
                        onAddFieldMapping(path, suggestedName, false, true);
                      }}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors font-medium"
                    >
                      → {suggestedName}
                    </button>
                  )}

                  {/* Map to existing entities */}
                  {getAllAvailableEntities().length > 0 && (
                    <div 
                      className="relative group"
                      onMouseEnter={() => onDropdownMouseEnter(`dropdown-${path}`)}
                      onMouseLeave={() => onDropdownMouseLeave(`dropdown-${path}`)}
                    >
                      <button className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 transition-colors">
                        Map to Entity ▼
                      </button>
                      <div className="absolute left-0 top-full mt-1 bg-white border rounded-md shadow-lg z-20 min-w-64 max-w-80 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-200">
                        <div className="py-1">
                          {getAllAvailableEntities().map((entityName) => {
                            const entitySchema = availableEntitySchemas.find(
                              (e) => e.name === entityName
                            );
                            const isCurrentEntity = getExistingEntities().includes(entityName);
                            return (
                              <button
                                key={entityName}
                                onClick={() => {
                                  onAddFieldMapping(path, entityName, false, false);
                                }}
                                className="block w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium truncate flex-1">
                                    {entityName}
                                  </span>
                                  <div className="flex items-center space-x-1 flex-shrink-0">
                                    {entitySchema && (
                                      <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {entitySchema.fields.length} fields
                                      </span>
                                    )}
                                    {isCurrentEntity && (
                                      <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded whitespace-nowrap">
                                        current
                                      </span>
                                    )}
                                    {!isCurrentEntity && entitySchema && (
                                      <span className="text-xs bg-purple-100 text-purple-600 px-1 rounded whitespace-nowrap">
                                        existing
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      onShowEntityCreator(path, suggestedName || "");
                    }}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 transition-colors"
                  >
                    Custom
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Entity Badge */}
          {mapping && (
            <div className="absolute -top-2 -left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full whitespace-normal flex items-center space-x-1">
              <span>{mapping.entityName}</span>
              {mapping.schemaMapping && (
                <span className="bg-green-600 rounded-full w-4 h-4 flex items-center justify-center text-xs">
                  {mapping.schemaMapping.fields.length}
                </span>
              )}
            </div>
          )}

          <span className="text-gray-600">{"{"}</span>
          {entries.length > 0 ? (
            <>
              {entries.map(([key, value], index) => {
                const fieldPath = path === "_root" ? key : `${path}.${key}`;
                const isLast = index === entries.length - 1;
                return (
                  <span key={key}>
                    <br />
                    {createIndent(nextIndentSpaces)}
                    <span className="text-red-600">"{key}"</span>
                    <span className="text-gray-600">: </span>
                    {renderInteractiveJson(value, fieldPath, level + 1)}
                    {!isLast && (
                      <span className="text-gray-600">,</span>
                    )}
                  </span>
                );
              })}
              <br />
              {createIndent(indentSpaces)}
            </>
          ) : null}
          <span className="text-gray-600">{"}"}</span>
        </span>
      );
    }

    return <span>{JSON.stringify(data)}</span>;
  };

  return (
    <div className="bg-gray-50 p-4 rounded-lg border max-h-[70vh] overflow-auto">
      <div className="font-mono text-sm leading-relaxed">
        {renderInteractiveJson(sampleData)}
      </div>
    </div>
  );
};

