interface EntityCreatorModalProps {
  isVisible: boolean;
  newEntityName: string;
  onEntityNameChange: (name: string) => void;
  onCreateEntity: () => void;
  onCancel: () => void;
  toPascalCase: (str: string) => string;
}

export const EntityCreatorModal = ({
  isVisible,
  newEntityName,
  onEntityNameChange,
  onCreateEntity,
  onCancel,
  toPascalCase,
}: EntityCreatorModalProps) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">
          Create Entity Mapping
        </h3>
        <p className="text-gray-600 mb-4">
          Define an entity name for this data structure.
          The name will be used to identify this entity
          type in future data processing.
        </p>
        <input
          type="text"
          value={newEntityName}
          onChange={(e) => onEntityNameChange(e.target.value)}
          placeholder="Enter entity name (e.g., 'basket item', 'user profile')"
          className="w-full p-3 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          autoFocus
        />
        {newEntityName.trim() && (
          <p className="text-sm text-gray-500 mb-4">
            Will be created as:{" "}
            <span className="font-mono font-medium">
              {toPascalCase(newEntityName.trim())}
            </span>
          </p>
        )}
        <div className="flex justify-end space-x-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onCreateEntity}
            disabled={!newEntityName.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Create Entity
          </button>
        </div>
      </div>
    </div>
  );
};

