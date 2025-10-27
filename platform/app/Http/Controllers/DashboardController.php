<?php

namespace App\Http\Controllers;

use App\Models\Schema;
use App\Models\SchemaMapping;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();

        // Get all schemas that have mappings (regardless of confirmation status)
        $schemasQuery = Schema::with(['tenant', 'sourceMappings.targetSchema'])
            ->has('sourceMappings'); // Only get schemas that have mappings

        if (!$user->hasRole('landlord')) {
            $schemasQuery->where('tenant_id', $user->tenant_id);
        }

        $schemas = $schemasQuery->get();

        // Get analyzing schemas (schemas currently being analyzed by AI or waiting to be analyzed)
        $analyzingSchemasQuery = Schema::with(['tenant'])
            ->where('status', 'pending')
            ->whereIn('ai_analysis_status', ['pending', 'processing']) // Show both pending and processing as analyzing
            ->doesntHave('sourceMappings');

        if (!$user->hasRole('landlord')) {
            $analyzingSchemasQuery->where('tenant_id', $user->tenant_id);
        }

        $analyzingSchemas = $analyzingSchemasQuery->get();

        // Get pending schemas (schemas without mappings that need confirmation)
        // Only show schemas after AI analysis completes or is disabled
        $pendingSchemasQuery = Schema::with(['tenant'])
            ->where('status', 'pending')
            ->whereIn('ai_analysis_status', ['completed', 'failed', 'disabled']) // Only completed/failed/disabled
            ->doesntHave('sourceMappings');

        if (!$user->hasRole('landlord')) {
            $pendingSchemasQuery->where('tenant_id', $user->tenant_id);
        }

        $pendingSchemas = $pendingSchemasQuery->get();

        // Build visualization data
        $nodes = [];
        $edges = [];
        $formulaNodeCounter = 0;

        foreach ($schemas as $schema) {
            // Add source schema node (all schemas from query have mappings)
            $nodes[] = [
                'id' => "schema-{$schema->id}",
                'type' => 'sourceSchema',
                'data' => [
                    'label' => $schema->name ?? "Schema {$schema->hash}",
                    'hash' => $schema->hash,
                    'tenant' => $schema->tenant->name ?? 'Unknown',
                    'fields' => $schema->detected_fields ?? [],
                    'pending_records' => $schema->pending_records ?? 0,
                    'created_at' => $schema->created_at->format('Y-m-d'),
                ],
                'position' => ['x' => 0, 'y' => 0], // Will be auto-laid out
            ];

            // Separate formula mappings from regular mappings
            $formulaMappings = [];
            $regularMappings = [];

            foreach ($schema->sourceMappings as $mapping) {
                if (!empty($mapping->formula_expression)) {
                    $formulaMappings[] = $mapping;
                } else {
                    $regularMappings[] = $mapping;
                }
            }

            // Process formula mappings - each creates a formula node with edges on both sides
            foreach ($formulaMappings as $mapping) {
                $formulaNodeCounter++;
                $targetSchema = $mapping->targetSchema;
                $targetNodeId = "entity-{$targetSchema->id}";

                // Add target entity node if not already added
                if (!collect($nodes)->contains('id', $targetNodeId)) {
                    $nodes[] = [
                        'id' => $targetNodeId,
                        'type' => 'entitySchema',
                        'data' => [
                            'label' => $targetSchema->name,
                            'fields' => $targetSchema->detected_fields ?? [],
                        ],
                        'position' => ['x' => 0, 'y' => 0],
                    ];
                }

                // Get field info from mapping definition
                $field = $mapping->mapping_definition['schema_mapping']['fields'][0] ?? [];
                $sourcePath = $field['sourcePath'] ?? $mapping->field_path;
                $fieldName = $field['fieldName'] ?? $mapping->field_path;

                // Get source fields from field mapping (for formulas that use multiple inputs)
                $sourceFields = $field['sourceFields'] ?? [];
                if (empty($sourceFields)) {
                    // Fallback: parse comma-separated sourcePath or use single field
                    $sourcePathParts = explode(',', $sourcePath);
                    $fieldType = $field['fieldType'] ?? $field['sourceType'] ?? 'string';
                    $sourceFields = array_map(function($path) use ($fieldType) {
                        return [
                            'name' => trim($path),
                            'type' => $fieldType,
                        ];
                    }, $sourcePathParts);
                }

                // Create formula node
                $formulaNodeId = "formula-saved-{$schema->id}-{$mapping->id}";
                $nodes[] = [
                    'id' => $formulaNodeId,
                    'type' => 'formulaNode',
                    'data' => [
                        'label' => "Transform: {$sourcePath} → {$fieldName}",
                        'formula' => $mapping->formula_expression,
                        'formulaLanguage' => $mapping->formula_language ?? 'JSONata',
                        'sourceFields' => $sourceFields,
                        'targetField' => $fieldName,
                        'collapsed' => true, // Start in collapsed state
                    ],
                    'position' => ['x' => 0, 'y' => 0],
                ];

                // Create edges from each source field to formula node
                foreach ($sourceFields as $index => $sourceFieldInfo) {
                    $sourceFieldName = $sourceFieldInfo['name'];
                    $edges[] = [
                        'id' => "edge-{$schema->id}-to-{$formulaNodeId}-{$index}",
                        'source' => "schema-{$schema->id}",
                        'target' => $formulaNodeId,
                        'sourceHandle' => "{$schema->hash}-{$sourceFieldName}", // Connect to specific field on source schema
                        'targetHandle' => 'input', // Connect to input handle on formula node
                        'type' => 'staggered',
                        'animated' => false,
                        'label' => $sourceFieldName,
                        'labelStyle' => [
                            'fill' => '#8b5cf6',
                            'fontWeight' => 500,
                            'fontSize' => 10,
                        ],
                        'labelBgStyle' => [
                            'fill' => '#ffffff',
                            'fillOpacity' => 0.95,
                        ],
                        'labelBgPadding' => [3, 2],
                        'labelBgBorderRadius' => 3,
                        'markerEnd' => [
                            'type' => 'arrowclosed',
                            'color' => '#8b5cf6',
                        ],
                        'style' => [
                            'stroke' => '#8b5cf6',
                            'strokeWidth' => 2,
                        ],
                        'data' => [
                            'offset' => 0,
                            'sourceField' => $sourceFieldName,
                            'mappingType' => 'formula',
                        ],
                    ];
                }

                // Edge from formula node to target entity
                $edges[] = [
                    'id' => "edge-{$formulaNodeId}-to-{$targetNodeId}",
                    'source' => $formulaNodeId,
                    'target' => $targetNodeId,
                    'sourceHandle' => 'output', // Connect to output handle on formula node
                    'targetHandle' => "{$targetSchema->name}-{$fieldName}", // Connect to specific field on target entity
                    'type' => 'staggered',
                    'animated' => false,
                    'label' => $fieldName,
                    'labelStyle' => [
                        'fill' => '#8b5cf6',
                        'fontWeight' => 500,
                        'fontSize' => 10,
                    ],
                    'labelBgStyle' => [
                        'fill' => '#ffffff',
                        'fillOpacity' => 0.95,
                    ],
                    'labelBgPadding' => [3, 2],
                    'labelBgBorderRadius' => 3,
                    'markerEnd' => [
                        'type' => 'arrowclosed',
                        'color' => '#8b5cf6',
                    ],
                    'style' => [
                        'stroke' => '#8b5cf6',
                        'strokeWidth' => 2,
                    ],
                    'data' => [
                        'offset' => 0,
                        'sourceField' => $fieldName,
                        'mappingType' => 'formula',
                    ],
                ];
            }

            // Group regular (non-formula) mappings by target schema
            $mappingsByTarget = [];
            foreach ($regularMappings as $mapping) {
                $targetId = $mapping->target_schema_id;
                if (!isset($mappingsByTarget[$targetId])) {
                    $mappingsByTarget[$targetId] = [];
                }
                $mappingsByTarget[$targetId][] = $mapping;
            }

            // Process each schema-to-entity connection for regular mappings
            foreach ($mappingsByTarget as $targetId => $mappings) {
                $firstMapping = $mappings[0];
                $targetSchema = $firstMapping->targetSchema;
                $targetNodeId = "entity-{$targetSchema->id}";

                // Add target entity node if not already added
                if (!collect($nodes)->contains('id', $targetNodeId)) {
                    $nodes[] = [
                        'id' => $targetNodeId,
                        'type' => 'entitySchema',
                        'data' => [
                            'label' => $targetSchema->name,
                            'fields' => $targetSchema->detected_fields ?? [],
                        ],
                        'position' => ['x' => 0, 'y' => 0],
                    ];
                }

                // Collect all field mappings for this connection
                $fieldMappings = [];
                foreach ($mappings as $mapping) {
                    $field = $mapping->mapping_definition['schema_mapping']['fields'][0] ?? [];
                    $sourcePath = $field['sourcePath'] ?? $mapping->field_path;
                    $fieldName = $field['fieldName'] ?? $mapping->field_path;
                    $fieldType = $field['fieldType'] ?? $field['sourceType'] ?? 'string';

                    if ($sourcePath && $fieldName) {
                        $fieldMappings[] = [
                            'sourcePath' => $sourcePath,
                            'fieldName' => $fieldName,
                            'sourceType' => $fieldType,
                            'type' => $fieldType,
                        ];
                    }
                }

                // Create ONE edge for this connection with all field mappings in data
                if (count($fieldMappings) > 0) {
                    $edges[] = [
                        'id' => "edge-{$schema->id}-{$targetSchema->id}",
                        'source' => "schema-{$schema->id}",
                        'target' => $targetNodeId,
                        'type' => 'staggered',
                        'animated' => false,
                        'label' => count($fieldMappings) . ' fields',
                        'markerEnd' => [
                            'type' => 'arrowclosed',
                            'color' => '#6366f1',
                        ],
                        'style' => [
                            'stroke' => '#6366f1',
                            'strokeWidth' => 2,
                        ],
                        'data' => [
                            'offset' => 0,
                            'mapping_definition' => [
                                'schema_mapping' => [
                                    'fields' => $fieldMappings
                                ]
                            ]
                        ],
                    ];
                }
            }
        }

        // Get standalone entity schemas first (needed for available entities list)
        $entitySchemas = Schema::where('type', 'struct')
            ->where('status', 'confirmed');

        if (!$user->hasRole('landlord')) {
            $entitySchemas->where('tenant_id', $user->tenant_id);
        }

        $entitySchemasList = $entitySchemas->get();

        // Prepare available entities for mapping dropdown
        $availableEntities = $entitySchemasList->map(fn($entity) => [
            'id' => $entity->id,
            'name' => $entity->name,
            'fields' => $entity->detected_fields ?? [],
        ])->values()->toArray();

        // Add analyzing schemas (schemas being analyzed by AI)
        foreach ($analyzingSchemas as $analyzingSchema) {
            $nodes[] = [
                'id' => "analyzing-{$analyzingSchema->id}",
                'type' => 'analyzingSchema',
                'data' => [
                    'label' => $analyzingSchema->name ?? "Schema {$analyzingSchema->hash}",
                    'hash' => $analyzingSchema->hash,
                    'tenant' => $analyzingSchema->tenant->name ?? 'Unknown',
                    'fields' => $analyzingSchema->detected_fields ?? [],
                    'pending_records' => $analyzingSchema->pending_records ?? 0,
                    'created_at' => $analyzingSchema->created_at->format('Y-m-d'),
                    'status' => 'analyzing',
                    'schema_id' => $analyzingSchema->id,
                ],
                'position' => ['x' => 0, 'y' => 0],
            ];
        }

        // Add pending schemas (need confirmation/mapping)
        foreach ($pendingSchemas as $pendingSchema) {
            $nodes[] = [
                'id' => "pending-{$pendingSchema->id}",
                'type' => 'pendingSchema',
                'data' => [
                    'label' => $pendingSchema->name ?? "Schema {$pendingSchema->hash}",
                    'hash' => $pendingSchema->hash,
                    'tenant' => $pendingSchema->tenant->name ?? 'Unknown',
                    'fields' => $pendingSchema->detected_fields ?? [],
                    'pending_records' => $pendingSchema->pending_records ?? 0,
                    'created_at' => $pendingSchema->created_at->format('Y-m-d'),
                    'status' => 'pending',
                    'sample_data' => $pendingSchema->sample_data,
                    'schema_id' => $pendingSchema->id,
                    'available_entities' => $availableEntities,
                ],
                'position' => ['x' => 0, 'y' => 0],
            ];
        }

        // Add standalone entity schema nodes to the graph

        foreach ($entitySchemasList as $entity) {
            $entityNodeId = "entity-{$entity->id}";
            if (!collect($nodes)->contains('id', $entityNodeId)) {
                $nodes[] = [
                    'id' => $entityNodeId,
                    'type' => 'entitySchema',
                    'data' => [
                        'label' => $entity->name,
                        'fields' => $entity->detected_fields ?? [],
                        'standalone' => true,
                    ],
                    'position' => ['x' => 0, 'y' => 0],
                ];
            }
        }

        // Calculate stats with tenant filtering
        $statsQuery = Schema::query();
        $mappingsQuery = SchemaMapping::query();

        if (!$user->hasRole('landlord')) {
            $statsQuery->where('tenant_id', $user->tenant_id);
            $mappingsQuery->whereHas('sourceSchema', function ($q) use ($user) {
                $q->where('tenant_id', $user->tenant_id);
            });
        }

        return Inertia::render('Dashboard', [
            'flowData' => [
                'nodes' => $nodes,
                'edges' => $edges,
            ],
            'stats' => [
                'total_schemas' => (clone $statsQuery)->has('sourceMappings')->count(),
                'total_entities' => (clone $statsQuery)->where('type', 'struct')->count(),
                'total_mappings' => $mappingsQuery->count(),
                'pending_confirmations' => $pendingSchemas->count(),
            ],
            'pendingSchemas' => $pendingSchemas->map(fn($schema) => [
                'id' => $schema->id,
                'hash' => $schema->hash,
                'name' => $schema->name,
                'tenant' => $schema->tenant->name ?? 'Unknown',
                'tenant_id' => $schema->tenant_id,
                'sample_data' => $schema->sample_data,
                'detected_fields' => $schema->detected_fields,
                'pending_records' => $schema->pending_records,
                'created_at' => $schema->created_at->format('Y-m-d H:i:s'),
            ]),
        ]);
    }
}
