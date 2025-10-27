import { useState } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../components/Layout';

interface DetectedField {
  name: string;
  type: string;
  required: boolean;
  sample_value?: any;
}

interface TargetSchema {
  id: number;
  name: string;
  type: string;
  sample_data: any;
  detected_fields: DetectedField[];
}

interface SchemaMapping {
  id: number;
  field_path: string;
  is_array: boolean;
  target_schema: TargetSchema;
  mapping_definition: any;
}

interface Schema {
  id: number;
  name: string | null;
  hash: string;
  tenant: string;
  tenant_id: string;
  type: string;
  sample_data: any;
  detected_fields: DetectedField[];
  created_at: string;
  updated_at: string;
  pending_records: number;
}

interface Props {
  schema: Schema;
  mappings: SchemaMapping[];
}

const SchemaDetail = ({ schema, mappings }: Props) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'entities' | 'source-data' | 'mappings'>('overview');
  const [selectedEntity, setSelectedEntity] = useState<SchemaMapping | null>(null);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  // Helper to get value at a specific path
  const getValueAtPath = (data: any, path: string): any => {
    const parts = path.split('.');
    let current = data;
    
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      
      // Handle array notation like items[0]
      if (part.includes('[') && part.includes(']')) {
        const [arrayName, indexStr] = part.split('[');
        const index = parseInt(indexStr.replace(']', ''), 10);
        current = current[arrayName]?.[index];
      } else {
        current = current[part];
      }
    }
    
    return current;
  };

  // Get mapping for a specific path
  const getMappingForPath = (path: string): SchemaMapping | null => {
    return mappings.find(mapping => mapping.field_path === path) || null;
  };

  const renderJsonValue = (value: any, level: number = 0, currentPath: string = ''): JSX.Element => {
    const indent = '  '.repeat(level);
    
    if (value === null) {
      return <span className="text-gray-400">null</span>;
    }
    
    if (typeof value === 'string') {
      return <span className="text-green-600">"{value}"</span>;
    }
    
    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>;
    }
    
    if (typeof value === 'boolean') {
      return <span className="text-purple-600">{value.toString()}</span>;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span>[]</span>;
      }
      
      const mapping = getMappingForPath(currentPath);
      const isHighlighted = hoveredPath === currentPath;
      
      return (
        <div className={`relative ${mapping ? 'bg-blue-50 border-l-4 border-blue-400 pl-2 rounded' : ''} ${isHighlighted ? 'bg-yellow-100' : ''}`}>
          {mapping && (
            <div className="absolute -left-2 top-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-r">
              → {mapping.target_schema.name}
            </div>
          )}
          <span>[</span>
          {value.slice(0, 3).map((item, index) => (
            <div key={index} style={{ paddingLeft: `${(level + 1) * 20}px` }}>
              {renderJsonValue(item, level + 1, currentPath ? `${currentPath}[${index}]` : `[${index}]`)}
              {index < Math.min(value.length - 1, 2) && <span>,</span>}
            </div>
          ))}
          {value.length > 3 && (
            <div style={{ paddingLeft: `${(level + 1) * 20}px` }} className="text-gray-500">
              ... {value.length - 3} more items
            </div>
          )}
          <span>]</span>
        </div>
      );
    }
    
    if (typeof value === 'object') {
      const entries = Object.entries(value);
      if (entries.length === 0) {
        return <span>{'{}'}</span>;
      }
      
      const mapping = getMappingForPath(currentPath);
      const isHighlighted = hoveredPath === currentPath;
      
      return (
        <div className={`relative ${mapping ? 'bg-green-50 border-l-4 border-green-400 pl-2 rounded' : ''} ${isHighlighted ? 'bg-yellow-100' : ''}`}>
          {mapping && (
            <div className="absolute -left-2 top-0 bg-green-500 text-white text-xs px-2 py-1 rounded-r">
              → {mapping.target_schema.name}
            </div>
          )}
          <span>{'{'}</span>
          {entries.slice(0, 5).map(([key, val], index) => {
            const fieldPath = currentPath ? `${currentPath}.${key}` : key;
            return (
              <div key={key} style={{ paddingLeft: `${(level + 1) * 20}px` }}>
                <span className="text-purple-600">"{key}"</span>: {renderJsonValue(val, level + 1, fieldPath)}
                {index < Math.min(entries.length - 1, 4) && <span>,</span>}
              </div>
            );
          })}
          {entries.length > 5 && (
            <div style={{ paddingLeft: `${(level + 1) * 20}px` }} className="text-gray-500">
              ... {entries.length - 5} more fields
            </div>
          )}
          <span>{'}'}</span>
        </div>
      );
    }
    
    return <span>{String(value)}</span>;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <button
                  onClick={() => router.visit('/schemas')}
                  className="flex items-center text-indigo-600 hover:text-indigo-800 mb-4"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Schemas
                </button>
                <h1 className="text-3xl font-bold text-gray-900">Entity Schema Details</h1>
                <p className="mt-2 text-gray-600">
                  View detailed entity mappings and source data for this schema.
                </p>
              </div>
            </div>
          </div>

          {/* Schema Info Card */}
          <div className="bg-white rounded-lg shadow mb-8 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Schema Hash</h3>
                <p className="mt-1 font-mono text-sm text-gray-900">{schema.hash}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Tenant</h3>
                <p className="mt-1 text-sm font-semibold text-indigo-600">{schema.tenant}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <div className="mt-1 flex items-center space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {mappings.length} entities mapped
                  </span>
                  {schema.pending_records > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {schema.pending_records} pending
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
              Created: {schema.created_at} • Updated: {schema.updated_at}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {[
                  { id: 'overview', name: 'Overview', count: mappings.length },
                  { id: 'mappings', name: 'Visual Mappings', count: null },
                  { id: 'entities', name: 'Entity Details', count: null },
                  { id: 'source-data', name: 'Source Data', count: null },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                    {tab.count !== null && (
                      <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                        activeTab === tab.id ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-900'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Entity Mappings Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {mappings.map((mapping) => (
                        <div
                          key={mapping.id}
                          onClick={() => setSelectedEntity(mapping)}
                          className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{mapping.target_schema.name}</h4>
                              <p className="text-sm text-gray-500 mt-1">
                                {mapping.field_path}
                                {mapping.is_array && ' (Array)'}
                              </p>
                              <div className="mt-2">
                                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                  {mapping.target_schema.detected_fields.length} fields
                                </span>
                              </div>
                            </div>
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Mappings Tab */}
              {activeTab === 'mappings' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Source Data with Mappings */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Source Data
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          (mapped sections highlighted)
                        </span>
                      </h3>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-96">
                        <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                          {renderJsonValue(schema.sample_data, 0, '')}
                        </pre>
                      </div>
                      
                      {/* Legend */}
                      <div className="mt-4 flex flex-wrap gap-4 text-xs">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-400 border-l-4 border-green-600 mr-2"></div>
                          <span>Object → Entity</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-400 border-l-4 border-blue-600 mr-2"></div>
                          <span>Array → Entity</span>
                        </div>
                      </div>
                    </div>

                    {/* Entity Mappings List */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Entity Mappings</h3>
                      <div className="space-y-4">
                        {mappings.map((mapping) => (
                          <div
                            key={mapping.id}
                            onMouseEnter={() => setHoveredPath(mapping.field_path)}
                            onMouseLeave={() => setHoveredPath(null)}
                            className={`border rounded-lg p-4 transition-all cursor-pointer ${
                              hoveredPath === mapping.field_path
                                ? 'border-yellow-400 bg-yellow-50 shadow-md'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold text-gray-900">{mapping.target_schema.name}</h4>
                                <p className="text-sm text-gray-600 font-mono">
                                  {mapping.field_path}
                                  {mapping.is_array && <span className="text-blue-600 ml-1">(Array)</span>}
                                </p>
                              </div>
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {mapping.target_schema.detected_fields.length} fields
                              </span>
                            </div>
                            
                            {/* Entity Fields Preview */}
                            <div className="space-y-1">
                              {mapping.target_schema.detected_fields.slice(0, 3).map((field, index) => (
                                <div key={index} className="flex items-center text-xs">
                                  <span className="font-mono text-purple-600 mr-2">{field.name}</span>
                                  <span className="text-blue-600">{field.type}</span>
                                  {field.required && <span className="text-red-500 ml-1">*</span>}
                                </div>
                              ))}
                              {mapping.target_schema.detected_fields.length > 3 && (
                                <div className="text-xs text-gray-500">
                                  +{mapping.target_schema.detected_fields.length - 3} more fields
                                </div>
                              )}
                            </div>
                            
                            {/* Mapping Arrow */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center text-xs text-gray-500">
                                <span>Source Path:</span>
                                <span className="font-mono ml-2 text-gray-700">{mapping.field_path}</span>
                                <svg className="w-4 h-4 mx-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                                <span className="font-semibold text-green-600">{mapping.target_schema.name}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Entities Tab */}
              {activeTab === 'entities' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Select Entity</h3>
                      <div className="space-y-2">
                        {mappings.map((mapping) => (
                          <button
                            key={mapping.id}
                            onClick={() => setSelectedEntity(mapping)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              selectedEntity?.id === mapping.id
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="font-medium">{mapping.target_schema.name}</div>
                            <div className="text-sm text-gray-500">{mapping.field_path}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      {selectedEntity ? (
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-4">
                            {selectedEntity.target_schema.name} Structure
                          </h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="space-y-3">
                              {selectedEntity.target_schema.detected_fields.map((field, index) => (
                                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 last:border-b-0">
                                  <div className="flex items-center space-x-3">
                                    <span className="font-mono text-sm font-medium text-purple-600">
                                      {field.name}
                                    </span>
                                    {field.required && (
                                      <span className="text-red-500 text-xs">*</span>
                                    )}
                                  </div>
                                  <div className="text-sm">
                                    <span className="font-medium text-blue-600">{field.type}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          <div className="text-4xl mb-4">👆</div>
                          <p>Select an entity to view its structure</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Source Data Tab */}
              {activeTab === 'source-data' && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Original Input Data</h3>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
                    <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                      {renderJsonValue(schema.sample_data, 0, '')}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SchemaDetail;
