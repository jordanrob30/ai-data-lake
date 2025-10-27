import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface AnalyzingSchemaNodeData {
  label: string;
  hash: string;
  tenant?: string;
  fields?: any[];
}

/**
 * Faded "ghost" node shown during AI analysis
 * Displays with pulsing animation to indicate processing
 */
const AnalyzingSchemaNode = ({ data }: NodeProps<AnalyzingSchemaNodeData>) => {
  const fieldCount = data.fields?.length || 0;

  return (
    <div className="relative">
      {/* Pulsing glow effect */}
      <div className="absolute inset-0 bg-blue-400/20 rounded-lg animate-pulse blur-md" />

      {/* Main node container - faded appearance */}
      <div className="relative bg-white/60 border-2 border-blue-300 border-dashed rounded-lg shadow-sm backdrop-blur-sm w-64 opacity-70">
        {/* Header */}
        <div className="px-4 py-3 border-b border-blue-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Spinning loader icon */}
              <svg
                className="animate-spin h-5 w-5 text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <div>
                <div className="text-sm font-semibold text-blue-700">
                  Analyzing Schema...
                </div>
                {data.tenant && (
                  <div className="text-xs text-gray-500">{data.tenant}</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          <div className="text-xs text-gray-500 mb-2">
            Hash: <span className="font-mono">{data.hash}</span>
          </div>

          {fieldCount > 0 && (
            <div className="text-xs text-gray-500">
              Detected {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
            </div>
          )}

          <div className="mt-3 flex items-center space-x-2 text-xs text-blue-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>AI is determining schema mapping...</span>
          </div>
        </div>
      </div>

      {/* Output handle for potential edges (hidden but present for positioning) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-blue-400 !border-2 !border-white opacity-50"
      />
    </div>
  );
};

export default memo(AnalyzingSchemaNode);
