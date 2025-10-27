import { Handle, Position, NodeProps } from '@xyflow/react';
import { memo, useState } from 'react';

interface EntityField {
  name: string;
  type: string;
}

interface NewEntityData {
  label: string;
  fields: EntityField[];
  isNew: boolean;
}

const NewEntityNode = ({ data, selected }: NodeProps<NewEntityData>) => {
  const [entityName, setEntityName] = useState(data.label);
  const [fields, setFields] = useState<EntityField[]>(data.fields || []);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('string');
  const [isEditingName, setIsEditingName] = useState(false);

  const addField = () => {
    if (!newFieldName.trim()) return;

    setFields([...fields, { name: newFieldName, type: newFieldType }]);
    setNewFieldName('');
    setNewFieldType('string');
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  return (
    <div
      className={`bg-gradient-to-br from-indigo-50 to-purple-50 border-2 rounded-lg shadow-lg min-w-[320px] max-w-[400px] transition-all ${
        selected ? 'border-indigo-500 shadow-xl ring-2 ring-indigo-300' : 'border-indigo-300'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-4 border-b-2 border-indigo-200 rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          {isEditingName ? (
            <input
              type="text"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setIsEditingName(false);
              }}
              className="flex-1 px-2 py-1 border border-indigo-300 rounded text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          ) : (
            <h3
              className="font-bold text-gray-900 text-sm cursor-pointer hover:text-indigo-600 flex items-center space-x-2"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditingName(true);
              }}
            >
              <span className="text-2xl">✨</span>
              <span>{entityName}</span>
            </h3>
          )}
          <span className="text-xs bg-indigo-200 text-indigo-900 px-2 py-1 rounded-full font-bold">
            New Entity
          </span>
        </div>
        <p className="text-xs text-gray-700">Click to edit name</p>
      </div>

      {/* Fields List */}
      <div className="p-3 max-h-[300px] overflow-y-auto bg-white">
        {fields.length > 0 ? (
          <div className="space-y-1.5 mb-3">
            {fields.map((field, index) => {
              const handleId = `${data.label}-${field.name}`;

              return (
                <div
                  key={index}
                  className="relative bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded p-2 hover:shadow-md transition-all group"
                >
                  {/* Target Handle - positioned on the left */}
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={handleId}
                    className="!w-3 !h-3 !bg-red-500 !border-2 !border-white !relative !transform-none !top-auto !left-0 group-hover:!bg-red-600 group-hover:!w-4 group-hover:!h-4 transition-all cursor-crosshair"
                    style={{ position: 'relative', transform: 'none' }}
                  />

                  <div className="flex items-center justify-between ml-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {field.name}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-medium">
                          {field.type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeField(index);
                      }}
                      className="ml-2 text-xs text-red-600 hover:text-red-800 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 text-xs">
            <p>👇 Add fields below</p>
            <p className="mt-1">or drag connections from schema fields</p>
          </div>
        )}

        {/* Add Field Form */}
        <div className="border-t border-indigo-200 pt-3">
          <div className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={newFieldName}
              onChange={(e) => setNewFieldName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addField();
              }}
              placeholder="Field name"
              className="flex-1 px-2 py-1 border border-indigo-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              value={newFieldType}
              onChange={(e) => setNewFieldType(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="px-2 py-1 border border-indigo-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="string">String</option>
              <option value="integer">Integer</option>
              <option value="float">Float</option>
              <option value="boolean">Boolean</option>
              <option value="datetime">DateTime</option>
              <option value="date">Date</option>
            </select>
            <button
              onClick={(e) => {
                e.stopPropagation();
                addField();
              }}
              className="px-3 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 transition-colors font-medium"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-r from-indigo-100 to-purple-100 p-3 border-t-2 border-indigo-200 rounded-b-lg">
        <div className="text-xs text-indigo-800 font-medium text-center">
          {fields.length} field{fields.length !== 1 ? 's' : ''} defined
        </div>
      </div>
    </div>
  );
};

export default memo(NewEntityNode);
