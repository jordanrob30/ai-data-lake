interface FieldMapping {
  fieldPath: string;
  entityName: string;
  isArray: boolean;
}

interface ProgressSummaryProps {
  fieldMappings: FieldMapping[];
  pendingRecords: number;
  mappablePathsCount: number;
  isSaving: boolean;
  onSaveEntities: () => void;
  onBackToConfirmations: () => void;
}

export const ProgressSummary = ({
  fieldMappings,
  pendingRecords,
  mappablePathsCount,
  isSaving,
  onSaveEntities,
  onBackToConfirmations,
}: ProgressSummaryProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Entity Configuration
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              📋 Instructions
            </h3>
            <p className="text-sm text-blue-700">
              Hover over JSON objects and arrays to create
              entities. Entity names will be automatically
              suggested based on the field names, or you
              can create custom ones.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-indigo-900 mb-2">
              Progress Summary
            </h3>
            <p className="text-sm text-indigo-700">
              <span className="font-semibold">
                {pendingRecords} records waiting
              </span>{" "}
              for entity mapping
            </p>
            <p className="text-xs text-indigo-600 mt-1">
              {fieldMappings.length} entities configured
              from {mappablePathsCount} available
              objects
            </p>
            {fieldMappings.length > 0 && (
              <div className="mt-2 pt-2 border-t border-indigo-200">
                <p className="text-xs text-indigo-600">
                  Entities:{" "}
                  {fieldMappings
                    .map((m) => m.entityName)
                    .join(", ")}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-3">
            {fieldMappings.length > 0 && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-green-700">
                  💡 Ready to create{" "}
                  {fieldMappings.length} entity
                  mapping
                  {fieldMappings.length !== 1 ? "s" : ""}{" "}
                  for future data processing
                </p>
              </div>
            )}

            <button
              onClick={onSaveEntities}
              disabled={fieldMappings.length === 0 || isSaving}
              className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSaving
                ? "Saving Entity Mappings..."
                : `Save ${
                    fieldMappings.length > 0
                      ? fieldMappings.length + " "
                      : ""
                  }Entity Mapping${
                    fieldMappings.length !== 1 ? "s" : ""
                  }`}
            </button>
            <button
              onClick={onBackToConfirmations}
              className="w-full px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Confirmations
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

