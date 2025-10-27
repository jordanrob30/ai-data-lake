import { Handle, Position, NodeProps, useReactFlow, useStore } from '@xyflow/react';
import { memo, useState, useEffect } from 'react';

interface FormulaNodeData {
  label: string;
  formula: string;
  formulaLanguage: string;
  sourceFields: Array<{ name: string; type: string }>;
  targetField: string;
  collapsed?: boolean;
  isConstant?: boolean;  // Flag for constant-value formulas
  onSave?: (formula: string) => void;
  onDelete?: () => void;
  onFieldsChange?: (fields: Array<{ name: string; type: string }>) => void;
}

const FormulaNode = ({ data, selected, id }: NodeProps<FormulaNodeData>) => {
  const { getEdges, getNodes, setNodes } = useReactFlow();

  // Subscribe to edge changes to re-compute available fields
  const edgesLength = useStore((state) => state.edges.length);
  const [formula, setFormula] = useState(data.formula || '');
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [availableFields, setAvailableFields] = useState<Array<{ name: string; type: string }>>(data.sourceFields || []);
  const [isCollapsed, setIsCollapsed] = useState(data.collapsed || false);

  // Dynamically compute available fields from connected edges
  useEffect(() => {
    const edges = getEdges();
    const nodes = getNodes();

    // Find all edges that connect TO this formula node (incoming edges)
    const incomingEdges = edges.filter(edge => edge.target === id && edge.targetHandle === 'input');

    // Extract field information from each incoming edge
    const fields: Array<{ name: string; type: string }> = [];

    incomingEdges.forEach(edge => {
      const sourceField = edge.data?.sourceField;
      if (sourceField) {
        // Try to find the source node to get field type
        const sourceNode = nodes.find(n => n.id === edge.source);
        const fieldData = sourceNode?.data?.fields?.find((f: any) => f.name === sourceField);

        fields.push({
          name: sourceField,
          type: fieldData?.type || 'unknown',
        });
      }
    });

    setAvailableFields(fields);

    // Update node data with new available fields for height calculation
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, sourceFields: fields } }
          : n
      )
    );
  }, [id, getEdges, getNodes, edgesLength, setNodes]);

  // Basic JSONata validation
  useEffect(() => {
    if (!formula.trim()) {
      setIsValid(false);
      setErrorMessage('Formula cannot be empty');
      return;
    }

    // Basic syntax check - just ensure it's not empty for now
    // In production, you'd use a proper JSONata parser
    setIsValid(true);
    setErrorMessage('');
  }, [formula]);

  const handleSave = () => {
    if (isValid) {
      // Update the node to collapsed state
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  formula,
                  collapsed: true
                }
              }
            : n
        )
      );
      setIsCollapsed(true);

      // Call the onSave callback if provided
      if (data.onSave) {
        data.onSave(formula);
      }
    }
  };

  const handleExpand = () => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? {
              ...n,
              data: {
                ...n.data,
                collapsed: false
              }
            }
          : n
      )
    );
    setIsCollapsed(false);
  };

  const handleDelete = () => {
    if (data.onDelete) {
      data.onDelete();
    }
  };

  const insertFieldReference = (fieldName: string) => {
    setFormula((prev) => prev + `$${fieldName}`);
  };

  // Collapsed view - compact display
  if (isCollapsed) {
    return (
      <div
        onClick={handleExpand}
        className={`bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg shadow-md border-2 ${
          selected ? 'border-purple-500' : 'border-purple-300'
        } cursor-pointer hover:shadow-lg transition-all flex items-center justify-center`}
        style={{
          width: '100px',
          height: '60px',
          padding: '8px',
        }}
        title="Click to edit formula"
      >
        {/* Input Handle - only show if not a constant formula */}
        {!data.isConstant && (
          <Handle
            type="target"
            position={Position.Left}
            id="input"
            style={{
              width: 12,
              height: 12,
              background: '#8b5cf6',
              border: '2px solid white',
            }}
          />
        )}

        <div className="flex flex-col items-center justify-center">
          <span className="text-xl text-purple-600">
            {data.isConstant ? '≡' : 'ƒ'}
          </span>
          <div className="text-xs font-semibold text-purple-700 mt-1">
            {data.isConstant ? 'Const' : 'Formula'}
          </div>
        </div>

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{
            width: 12,
            height: 12,
            background: '#8b5cf6',
            border: '2px solid white',
          }}
        />
      </div>
    );
  }

  // Expanded view - full editor
  return (
    <div
      className={`bg-white rounded-lg shadow-lg border-2 ${
        selected ? 'border-purple-500' : 'border-purple-300'
      }`}
      style={{
        transition: 'border-color 0.2s ease',
        width: '320px',
      }}
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 px-4 py-3 rounded-t-lg border-b-2 border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{data.isConstant ? '≡' : 'ƒ'}</span>
            <div>
              <div className="font-bold text-gray-900 text-sm">
                {data.isConstant ? 'Constant Value' : 'Formula Transformation'}
              </div>
              <div className="text-xs text-gray-600">
                {data.formulaLanguage || 'JSONata'}
              </div>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="nodrag nopan text-gray-400 hover:text-red-500 transition-colors"
            title="Delete formula node"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Input Handle (left) - only show if not a constant formula */}
      {!data.isConstant && (
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{
            width: 12,
            height: 12,
            background: '#8b5cf6',
            border: '2px solid white',
          }}
        />
      )}

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Available Fields Reference - only show for non-constant formulas */}
        {!data.isConstant && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">
                Available Fields
              </label>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="nodrag nopan text-xs text-purple-600 hover:text-purple-700"
              >
                {showHelp ? 'Hide Help' : 'Show Help'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {availableFields.length > 0 ? (
                availableFields.map((field) => (
                  <button
                    key={field.name}
                    onClick={() => insertFieldReference(field.name)}
                    className="nodrag nopan px-2 py-1 text-xs bg-purple-50 text-purple-700 rounded border border-purple-200 hover:bg-purple-100 transition-colors"
                    title={`Click to insert $${field.name}`}
                  >
                    <span className="font-mono">${field.name}</span>
                    <span className="ml-1 text-purple-400">({field.type})</span>
                  </button>
                ))
              ) : (
                <div className="text-xs text-gray-500 italic">
                  Connect fields from source schema to use in formula
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help Section */}
        {showHelp && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs space-y-1">
            <div className="font-semibold text-blue-900">JSONata Quick Reference:</div>
            <div className="text-blue-800 space-y-0.5 ml-2">
              <div>• <code>$fieldName</code> - Reference a field</div>
              <div>• <code>$uppercase(name)</code> - Convert to uppercase</div>
              <div>• <code>$number(price)</code> - Convert to number</div>
              <div>• <code>field1 &amp; " " &amp; field2</code> - Concatenate</div>
              <div>• <code>condition ? valueIfTrue : valueIfFalse</code> - Conditional</div>
            </div>
          </div>
        )}

        {/* Formula Editor */}
        <div>
          <label className="text-xs font-semibold text-gray-700 mb-1 block">
            {data.isConstant ? 'Constant Value Expression' : 'Formula Expression'}
          </label>
          <textarea
            value={formula}
            onChange={(e) => setFormula(e.target.value)}
            placeholder={data.isConstant
              ? 'Enter a constant value... e.g., "USD", true, 123'
              : 'Enter JSONata expression... e.g., $uppercase(name)'}
            className={`nodrag nopan w-full px-3 py-2 text-sm font-mono border rounded resize-none focus:outline-none focus:ring-2 ${
              isValid
                ? 'border-gray-300 focus:ring-purple-500'
                : 'border-red-300 focus:ring-red-500'
            }`}
            rows={4}
          />
          {!isValid && errorMessage && (
            <div className="text-xs text-red-600 mt-1 flex items-center gap-1">
              <span>⚠</span>
              <span>{errorMessage}</span>
            </div>
          )}
          {data.isConstant && (
            <div className="text-xs text-gray-500 mt-1">
              This formula generates a constant value without reading from source fields.
            </div>
          )}
        </div>

        {/* Target Field */}
        <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2">
          <div className="text-xs text-gray-600 mb-1">Maps to target field:</div>
          <div className="font-mono text-sm font-semibold text-gray-900">
            {data.targetField}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!isValid}
          className={`nodrag nopan w-full py-2 px-4 rounded font-medium text-sm transition-colors ${
            isValid
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Save Formula
        </button>
      </div>

      {/* Output Handle (right) */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          width: 12,
          height: 12,
          background: '#8b5cf6',
          border: '2px solid white',
        }}
      />
    </div>
  );
};

export default memo(FormulaNode);
