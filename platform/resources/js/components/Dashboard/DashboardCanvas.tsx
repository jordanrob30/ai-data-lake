import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  ReactFlow,
  Background,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionLineType,
  addEdge,
  Connection,
  useReactFlow,
  ReactFlowProvider,
  PanOnScrollMode,
  useUpdateNodeInternals,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { router, usePage } from '@inertiajs/react';
import { RotateCw } from 'lucide-react';
import Echo from '../../echo';
import { applyLayout } from '../../utils/layoutHelpers';
import SourceSchemaNode from '../FlowNodes/SourceSchemaNode';
import EntitySchemaNode from '../FlowNodes/EntitySchemaNode';
import SourceSchemaDetailNode from '../FlowNodes/SourceSchemaDetailNode';
import EntitySchemaDetailNode from '../FlowNodes/EntitySchemaDetailNode';
import { FlowData } from '../../types/flow.types';
import { Schema, PendingSchema } from '../../types/schema.types';
import { Entity } from '../../types/entity.types';
import { generateFieldLevelView } from '../../utils/edgeHelpers';
import { sanitizeEdgeHandleIds } from '../../utils/handleIdHelpers';
import { DashboardEmpty } from './DashboardEmpty';
import FieldViewer from '../FieldViewer/FieldViewer';
import PendingSchemaNode from '../FlowNodes/PendingSchemaNode';
import PendingSchemaDetailNode from '../FlowNodes/PendingSchemaDetailNode';
import AnalyzingSchemaNode from '../FlowNodes/AnalyzingSchemaNode';
import NewEntityNode from '../FlowNodes/NewEntityNode';
import FormulaNode from '../FlowNodes/FormulaNode';
import GroupedSourceSchemaNode from '../FlowNodes/GroupedSourceSchemaNode';
import ConnectionNode from '../FlowNodes/ConnectionNode';
import StaggeredEdge from '../FlowEdges/StaggeredEdge';
import FormulaEdge from '../FlowEdges/FormulaEdge';
import ConnectionEdge from '../FlowEdges/ConnectionEdge';

// Custom node types
const nodeTypes = {
  sourceSchema: SourceSchemaNode,
  entitySchema: EntitySchemaNode,
  sourceSchemaDetail: SourceSchemaDetailNode,
  entitySchemaDetail: EntitySchemaDetailNode,
  pendingSchema: PendingSchemaNode,
  pendingSchemaDetail: PendingSchemaDetailNode,
  analyzingSchema: AnalyzingSchemaNode,
  newEntity: NewEntityNode,
  formulaNode: FormulaNode,
  connectionNode: ConnectionNode, // Connection nodes between bronze and silver
  groupedSourceSchema: GroupedSourceSchemaNode, // Grouped bronze schemas
};

// Custom edge types
const edgeTypes = {
  staggered: StaggeredEdge,
  formula: FormulaEdge, // Smoother edge type for formula connections
  connection: ConnectionEdge, // Visual connection with plug icon for non-formula edges
};

interface DashboardCanvasProps {
  flowData: FlowData;
  pendingSchemas: PendingSchema[];
  tenantId?: string;
}

export const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
  flowData,
  pendingSchemas,
  tenantId,
}) => {
  // Track if we're initializing to prevent race conditions
  const isInitializing = useRef(false);
  const hasInitializedLayout = useRef<string>('');

  // Store connection edges for use in setEdges callback
  const connectionEdgesRef = useRef<Edge[]>([]);

  // Helper to always get detailed node type (expanded view)
  const getDetailedNodeType = (baseType: string): string => {
    switch (baseType) {
      case 'sourceSchema':
        return 'sourceSchemaDetail';
      case 'entitySchema':
        return 'entitySchemaDetail';
      case 'pendingSchema':
        return 'pendingSchemaDetail';
      case 'analyzingSchema':
        return 'analyzingSchemaNode';
      case 'newEntity':
        return 'newEntity';
      case 'groupedSourceSchema':
        return 'groupedSourceSchema'; // Already detailed, preserve type
      case 'connectionNode':
        return 'connectionNode'; // Preserve connection nodes
      case 'formulaNode':
        return 'formulaNode'; // Preserve formula nodes
      case 'sourceSchemaDetail':
      case 'entitySchemaDetail':
      case 'pendingSchemaDetail':
        return baseType; // Already detailed, don't add Detail again
      default:
        // Only add Detail if it doesn't already end with Detail
        if (baseType.endsWith('Detail')) {
          return baseType;
        }
        return baseType + 'Detail';
    }
  };

  // Sanitize the flow data to ensure all required properties exist
  const sanitizedFlowData = {
    nodes: flowData?.nodes || [],
    edges: sanitizeEdgeHandleIds(flowData?.edges || []), // Sanitize edge handle IDs to match new format
  };

  // Initialize with empty arrays to prevent flash of content
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Track mapping mode
  const [activeMappingNodes, setActiveMappingNodes] = useState<Set<string>>(new Set());

  const {
    project,
    getIntersectingNodes,
    screenToFlowPosition,
    fitView,
    getNodes,
    getEdges,
    zoomIn,
    zoomOut,
  } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  // Convert edge to formula edge
  const convertEdgeToFormula = useCallback((edgeId: string) => {
    console.log('Converting edge to formula:', edgeId);
    // This would typically update the edge data to indicate it's a formula edge
    // For now just log it
  }, []);

  // Auto-map fields between source and target (stub function)
  const autoMapFields = useCallback((
    sourceSchemaId: string,
    targetEntityId: string,
    sourceNodeId: string,
    targetNodeId: string,
    sourceHash: string,
    targetEntityName: string,
    convertToFormula: (edgeId: string) => void
  ) => {
    console.log('Auto-mapping fields:', {
      sourceSchemaId,
      targetEntityId,
      sourceNodeId,
      targetNodeId,
      sourceHash,
      targetEntityName
    });
    // This would typically perform auto-mapping logic
    // For now just log it
  }, []);

  // Helper function to enrich nodes with nested field information
  const enrichNodeWithNestedFields = useCallback((node: Node, edges: Edge[]) => {
    // Find edges connected to this node
    const connectedEdges = edges.filter(e => e.source === node.id || e.target === node.id);

    // If node has fields and edges have mappings, enrich the fields
    if (node.data?.fields && connectedEdges.length > 0) {
      // This would typically add nested field information based on edge mappings
      // For now, just return the node as-is
      return node;
    }

    return node;
  }, []);

  const clearMappingNodes = useCallback(() => {
    setActiveMappingNodes(new Set());
  }, []);

  /**
   * Auto-fit the view to show all nodes
   */
  const handleAutoFit = useCallback(() => {
    fitView({
      padding: 0.1,
      duration: 300,
      maxZoom: 1,
    });
  }, [fitView]);

  /**
   * Apply auto-layout to reorganize all nodes
   */
  const handleAutoLayout = useCallback(() => {
    const currentNodes = getNodes();
    const currentEdges = getEdges();

    // Apply the dagre layout
    const layoutedNodes = applyLayout(currentNodes, currentEdges);

    // Update nodes with new positions
    setNodes(layoutedNodes);

    // After layout, fit the view
    setTimeout(() => {
      fitView({
        padding: 0.2,
        duration: 500,
        maxZoom: 1,
      });
    }, 100);
  }, [getNodes, getEdges, setNodes, fitView]);

  /**
   * Add a new entity node connected to a schema node
   */
  const addNewEntityFromSchema = useCallback((entityName: string, sourceNodeId: string) => {
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;

    const entityNodeId = `entity-${Date.now()}`;
    const newNode: Node = {
      id: entityNodeId,
      type: 'newEntity',
      position: {
        x: sourceNode.position.x + 400,
        y: sourceNode.position.y,
      },
      data: {
        label: entityName,
        sourceSchemaId: sourceNodeId,
      },
    };

    setNodes((nds) => [...nds, newNode]);

    // Auto-fit after adding
    setTimeout(() => {
      updateNodeInternals(entityNodeId);
      updateNodeInternals(sourceNodeId);

      const updatedSourceNode = nodes.find(n => n.id === sourceNodeId);
      if (updatedSourceNode) {
        fitView({
          nodes: [updatedSourceNode, newNode],
          padding: 0.2,
          duration: 300,
        });
      }
    }, 150);

    return entityNodeId;
  }, [setNodes, nodes, fitView, updateNodeInternals]);

  /**
   * Add an existing entity node to the canvas
   */
  const addExistingEntityNode = useCallback((
    entityId: string,
    entityName: string,
    entityFields: any[],
    sourceNodeId: string
  ) => {
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return;

    const newNode: Node = {
      id: entityId,
      type: 'entitySchemaDetail',
      position: {
        x: sourceNode.position.x + 400,
        y: sourceNode.position.y,
      },
      data: {
        id: entityId,
        label: entityName,
        fields: entityFields,
        sourceSchemaId: sourceNodeId,
        type: 'entity',
      },
    };

    setNodes((nds) => [...nds, newNode]);

    // Focus on the new area
    setTimeout(() => {
      updateNodeInternals(entityId);
      updateNodeInternals(sourceNodeId);
      fitView({
        nodes: [sourceNode, newNode],
        padding: 0.2,
        duration: 300,
      });
    }, 150);

    return entityId;
  }, [setNodes, nodes, fitView, updateNodeInternals]);

  // Handle node click
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node.id, node.type);
    if (activeMappingNodes.has(node.id)) {
      clearMappingNodes();
    }
  }, [activeMappingNodes, clearMappingNodes]);

  // Handle node double-click
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node double-clicked:', node.id);
    // Could open a detail modal here
  }, []);

  // Handle edge click
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    console.log('Edge clicked:', edge);
    // Toggle formula mode for the edge
    if (edge.data?.mapping_definition) {
      convertEdgeToFormula(edge.id);
    }
  }, [convertEdgeToFormula]);

  // Handle connection
  const onConnect = useCallback((params: Connection) => {
    console.log('Connection params:', params);

    // Get source and target nodes
    const sourceNode = nodes.find(n => n.id === params.source);
    const targetNode = nodes.find(n => n.id === params.target);

    if (!sourceNode || !targetNode) return;

    // Create a new edge with formula support
    const newEdge: Edge = {
      ...params,
      id: `edge-${params.source}-${params.target}`,
      type: 'default',
      data: {
        isFormula: false,
        mapping_definition: {
          schema_mapping: {
            source_schema_id: params.source,
            target_entity_id: params.target,
            fields: [],
          },
        },
      },
    } as Edge;

    setEdges((eds) => addEdge(newEdge, eds));
  }, [nodes, setEdges]);

  // Listen for drag over events
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop events for creating new entities
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      const data = event.dataTransfer.getData('nodeData');

      if (!type || !data) return;

      const nodeData = JSON.parse(data);
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: nodeData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  // Handle edge hover to highlight formula transformation
  const onEdgeMouseEnter = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === edge.id) {
          return {
            ...e,
            animated: true,
            style: {
              ...e.style,
              stroke: '#8b5cf6',
              strokeWidth: 2,
            },
          };
        }
        return e;
      })
    );
  }, [setEdges]);

  const onEdgeMouseLeave = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id === edge.id) {
          return {
            ...e,
            animated: false,
            style: {
              ...e.style,
              stroke: undefined,
              strokeWidth: undefined,
            },
          };
        }
        return e;
      })
    );
  }, [setEdges]);

  // Setup keyboard shortcuts (commented out for now)
  // const shortcuts = useKeyboardShortcuts({
  //   onZoomIn: zoomIn,
  //   onZoomOut: zoomOut,
  //   onFitView: handleAutoFit,
  // });

  // Add new entity from schema (called by custom event)
  const handleAddNewEntity = useCallback((entityName: string, sourceNodeId: string) => {
    return addNewEntityFromSchema(entityName, sourceNodeId);
  }, [addNewEntityFromSchema]);

  // Add existing entity to mapping (called by custom event)
  const handleAddExistingEntity = useCallback((
    entityId: string,
    entityName: string,
    entityFields: any[],
    sourceNodeId: string
  ) => {
    return addExistingEntityNode(entityId, entityName, entityFields, sourceNodeId);
  }, [addExistingEntityNode]);

  // Listen for custom events from node components
  useEffect(() => {
    const handleCreateNewEntity = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const { entityName, sourceNodeId } = customEvent.detail;
      addNewEntityFromSchema(entityName, sourceNodeId);
    };

    const handleAddExistingEntity = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const { entityId, entityName, entityFields, sourceNodeId } = customEvent.detail;
      addExistingEntityNode(entityId, entityName, entityFields, sourceNodeId);
    };

    const handleAutoMapFields = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const { sourceSchemaId, targetEntityId, sourceNodeId, targetNodeId, sourceHash, targetEntityName } = customEvent.detail;
      autoMapFields(sourceSchemaId, targetEntityId, sourceNodeId, targetNodeId, sourceHash, targetEntityName, convertEdgeToFormula);
    };

    window.addEventListener('createNewEntity', handleCreateNewEntity);
    window.addEventListener('addExistingEntity', handleAddExistingEntity);
    window.addEventListener('autoMapFields', handleAutoMapFields);

    return () => {
      window.removeEventListener('createNewEntity', handleCreateNewEntity);
      window.removeEventListener('addExistingEntity', handleAddExistingEntity);
      window.removeEventListener('autoMapFields', handleAutoMapFields);
    };
  }, [addNewEntityFromSchema, addExistingEntityNode, autoMapFields, convertEdgeToFormula]);

  // Listen for Laravel Echo events for schema analysis
  useEffect(() => {
    if (!tenantId) {
      console.log('[DashboardCanvas] No tenant ID, skipping Echo setup');
      return;
    }

    console.log('[DashboardCanvas] Setting up Echo listener for tenant:', tenantId);

    // Subscribe to tenant-specific channel
    const channel = Echo.channel(`tenant.${tenantId}.schemas`);

    // Listen for schema analysis events
    const handleSchemaAnalysis = (event: any) => {
      console.log('[DashboardCanvas] Received schema analysis event:', event);

      if (event.status === 'started') {
        // Show analyzing state - this may be triggered while already showing analyzing node
        setNodes((currentNodes) => {
          const analyzingNodeId = `analyzing-${event.schema_id}`;

          // Check if analyzing node already exists
          const existingIndex = currentNodes.findIndex(n => n.id === analyzingNodeId);

          if (existingIndex >= 0) {
            // Already showing as analyzing, just update the data if needed
            const newNodes = [...currentNodes];
            newNodes[existingIndex] = {
              ...currentNodes[existingIndex],
              data: {
                ...currentNodes[existingIndex].data,
                label: event.data?.name || currentNodes[existingIndex].data.label,
                hash: event.data?.hash || currentNodes[existingIndex].data.hash,
                tenant: event.data?.tenant || currentNodes[existingIndex].data.tenant,
                fields: event.data?.detected_fields || currentNodes[existingIndex].data.fields,
                status: 'analyzing',
              },
            };
            return newNodes;
          } else {
            // This shouldn't normally happen since analyzing nodes are loaded from backend
            // But add it just in case
            console.log('[DashboardCanvas] Adding analyzing node for schema', event.schema_id);
            const analyzingNode: Node = {
              id: analyzingNodeId,
              type: 'analyzingSchema',
              position: { x: 100, y: 100 },
              data: {
                label: event.data?.name || `Schema ${event.data?.hash || ''}`,
                hash: event.data?.hash || '',
                tenant: event.data?.tenant || '',
                fields: event.data?.detected_fields || [],
                schema_id: event.schema_id,
                status: 'analyzing',
              },
            };
            return [...currentNodes, analyzingNode];
          }
        });
      } else if (event.status === 'completed') {
        // Handle completion - replace analyzing node with bronze and silver schemas
        console.log('[DashboardCanvas] Schema analysis completed', event);

        if (event.data?.bronze_schema && event.data?.silver_entity) {
          setNodes((currentNodes) => {
            const analyzingNodeId = `analyzing-${event.schema_id}`;

            // Remove the analyzing node
            const filteredNodes = currentNodes.filter(n => n.id !== analyzingNodeId);

            // Add the bronze schema node
            const bronzeNode: Node = {
              id: `schema-${event.data.bronze_schema.id}`,
              type: 'sourceSchemaDetail',
              position: { x: 100, y: 100 },
              data: {
                label: event.data.bronze_schema.name || `Schema ${event.data.bronze_schema.hash}`,
                hash: event.data.bronze_schema.hash,
                tenant: event.data.bronze_schema.tenant || '',
                fields: event.data.bronze_schema.detected_fields || [],
                pending_records: 0,
                created_at: event.data.bronze_schema.created_at,
                status: event.data.bronze_schema.status,
              },
            };

            // Add the silver entity node
            const silverNode: Node = {
              id: `entity-${event.data.silver_entity.id}`,
              type: 'entitySchemaDetail',
              position: { x: 400, y: 100 },
              data: {
                label: event.data.silver_entity.name,
                fields: event.data.silver_entity.detected_fields || [],
                type: event.data.silver_entity.type,
              },
            };

            // Add both nodes
            return [...filteredNodes, bronzeNode, silverNode];
          });

          // Add edges after nodes are added
          setTimeout(() => {
            if (event.data?.mappings_count && event.data.mappings_count > 0) {
              setEdges((currentEdges) => {
                const newEdge: Edge = {
                  id: `edge-${event.data.bronze_schema.id}-${event.data.silver_entity.id}`,
                  source: `schema-${event.data.bronze_schema.id}`,
                  target: `entity-${event.data.silver_entity.id}`,
                  type: 'staggered',
                  animated: false,
                  label: `${event.data.mappings_count} fields`,
                  markerEnd: {
                    type: 'arrowclosed',
                    color: '#6366f1',
                  },
                  style: {
                    stroke: '#6366f1',
                    strokeWidth: 2,
                  },
                };
                return [...currentEdges, newEdge];
              });
            }

            // Trigger layout update
            handleAutoLayout();
          }, 200);
        } else {
          // Fallback to refresh if data is incomplete
          setNodes((currentNodes) => {
            const analyzingNodeId = `analyzing-${event.schema_id}`;
            return currentNodes.filter(n => n.id !== analyzingNodeId);
          });

          setTimeout(() => {
            router.reload({ only: ['flowData', 'pendingSchemas', 'stats'] });
          }, 100);
        }
      } else if (event.status === 'failed') {
        // Remove analyzing node and refresh to show proper state
        setNodes((currentNodes) => {
          const analyzingNodeId = `analyzing-${event.schema_id}`;
          return currentNodes.filter(n => n.id !== analyzingNodeId);
        });

        console.error('[DashboardCanvas] Schema analysis failed:', event.data?.error);

        // Refresh to show the schema in failed state
        setTimeout(() => {
          router.reload({ only: ['flowData', 'pendingSchemas', 'stats'] });
        }, 100);
      }
    };

    channel.listen('.schema.analysis', handleSchemaAnalysis);

    // Cleanup on unmount
    return () => {
      console.log('[DashboardCanvas] Cleaning up Echo listener');
      channel.stopListening('.schema.analysis');
      Echo.leave(`tenant.${tenantId}.schemas`);
    };
  }, [tenantId, setNodes]);

  // Apply layout when data changes
  useEffect(() => {
    // Skip if already initializing or if no data
    if (isInitializing.current || sanitizedFlowData.nodes.length === 0) {
      return;
    }

    // Check if data actually changed
    const dataKey = JSON.stringify({
      nodeCount: sanitizedFlowData.nodes.length,
      edgeCount: sanitizedFlowData.edges.length,
      nodeIds: sanitizedFlowData.nodes.map(n => n.id).sort()
    });

    if (hasInitializedLayout.current === dataKey) {
      return;
    }
    hasInitializedLayout.current = dataKey;

    // Prevent re-triggering during the same render cycle
    isInitializing.current = true;

    console.log('[DashboardCanvas] Processing nodes - converting all to grouped format');

    // Track the final nodes that will be rendered for use in edge validation
    let finalNodesToRender: Node[] = [];

    // Update nodes
    setNodes((currentNodes) => {
      const flowDataNodeIds = new Set(sanitizedFlowData.nodes.map(n => n.id));
      const dynamicNodes = currentNodes.filter(n => !flowDataNodeIds.has(n.id));

      // Enrich nodes with field information
      const enrichedFlowNodes = sanitizedFlowData.nodes.map(node => {
        const hasEdges = sanitizedFlowData.edges.some(e => e.source === node.id || e.target === node.id);
        if (hasEdges) {
          return enrichNodeWithNestedFields(node, sanitizedFlowData.edges);
        }
        return node;
      });

      // Group bronze schemas by their target entity
      const schemaGroups = new Map<string, any[]>();
      const entityNodes: Node[] = [];
      const otherNodes: Node[] = [];

      // First, collect all source schemas and group by target entity
      console.log('[DashboardCanvas] Available edges:', sanitizedFlowData.edges.map(e => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type
      })));

      enrichedFlowNodes.forEach(node => {
        if (node.type === 'sourceSchema' || node.type === 'sourceSchemaDetail') {
          // Find ALL edges from this schema to find its target entity
          const edgesFromSchema = sanitizedFlowData.edges.filter(e => e.source === node.id);
          console.log(`[DashboardCanvas] Schema ${node.id} has edges:`, edgesFromSchema.map(e => ({
            target: e.target,
            targetType: enrichedFlowNodes.find(n => n.id === e.target)?.type
          })));

          // Find the entity node (not connection nodes or other intermediates)
          let targetEntityId = 'ungrouped';

          // First, try direct edges to entity nodes
          for (const edge of edgesFromSchema) {
            const targetNode = enrichedFlowNodes.find(n => n.id === edge.target);
            if (targetNode && (targetNode.type === 'entitySchema' || targetNode.type === 'entitySchemaDetail')) {
              targetEntityId = edge.target;
              break;
            }
          }

          // If no direct entity found, check if edge has entity info in data
          if (targetEntityId === 'ungrouped' && edgesFromSchema.length > 0) {
            // Check if the edge data contains target entity information
            const edgeWithEntity = edgesFromSchema.find(e => e.data?.target_entity_id || e.data?.targetEntityId);
            if (edgeWithEntity) {
              const entityId = edgeWithEntity.data?.target_entity_id || edgeWithEntity.data?.targetEntityId;
              if (typeof entityId === 'string') {
                targetEntityId = entityId;
              }
            }
          }

          console.log(`[DashboardCanvas] Schema ${node.id} (${node.data.label}) maps to entity: ${targetEntityId}`);

          if (!schemaGroups.has(targetEntityId)) {
            schemaGroups.set(targetEntityId, []);
          }

          schemaGroups.get(targetEntityId)!.push({
            id: node.id,
            label: node.data.label,
            hash: node.data.hash,
            tenant: node.data.tenant,
            fields: node.data.fields || [],
            pending_records: node.data.pending_records || 0,
            created_at: node.data.created_at,
            position: node.position, // Keep position for averaging
          });
        } else if (node.type === 'entitySchema' || node.type === 'entitySchemaDetail') {
          // Keep entity nodes as detailed
          entityNodes.push({
            ...node,
            type: 'entitySchemaDetail',
          });
        } else {
          // Keep other node types as-is
          otherNodes.push(node);
        }
      });

      // Create grouped nodes for each entity
      let localNodesToRender: Node[] = [];

      // Log the groups that were created
      console.log('[DashboardCanvas] Schema groups created:');
      schemaGroups.forEach((schemas, targetEntityId) => {
        console.log(`  Entity ${targetEntityId}: ${schemas.length} schemas:`, schemas.map(s => `${s.id} (${s.label})`));
      });

      // Add grouped nodes
      schemaGroups.forEach((schemas, targetEntityId) => {
        // Calculate average position for the group
        const avgX = schemas.reduce((sum, s) => sum + s.position.x, 0) / schemas.length;
        const avgY = schemas.reduce((sum, s) => sum + s.position.y, 0) / schemas.length;

        // Use the first schema's ID as the group ID, or create a unique one
        const groupId = schemas.length === 1 ? schemas[0].id : `group-${targetEntityId}`;

        const groupedNode: Node = {
          id: groupId,
          type: 'groupedSourceSchema',
          position: { x: avgX, y: avgY },
          data: {
            schemas: schemas.map(s => ({
              id: s.id,
              label: s.label,
              hash: s.hash,
              tenant: s.tenant,
              fields: s.fields,
              pending_records: s.pending_records,
              created_at: s.created_at,
            })),
            activeSchemaIndex: 0,
            groupId: groupId,
            targetEntityId: targetEntityId === 'ungrouped' ? null : targetEntityId,
          },
        };
        localNodesToRender.push(groupedNode);
      });

      // Add entity nodes and other nodes
      localNodesToRender.push(...entityNodes);
      localNodesToRender.push(...otherNodes);

      console.log('[DashboardCanvas] Converted nodes:', localNodesToRender.map(n => ({ id: n.id, type: n.type })));

      // Build a mapping from original schema IDs to group IDs
      const schemaToGroupMap = new Map<string, string>();
      schemaGroups.forEach((schemas, targetEntityId) => {
        const groupId = schemas.length === 1 ? schemas[0].id : `group-${targetEntityId}`;
        schemas.forEach(schema => {
          schemaToGroupMap.set(schema.id, groupId);
        });
      });

      // Transform edges to use group IDs
      const transformedEdges = sanitizedFlowData.edges.map(edge => {
        const newSource = schemaToGroupMap.get(edge.source) || edge.source;

        // Only transform if the source actually changed (was grouped)
        if (newSource !== edge.source) {
          return {
            ...edge,
            source: newSource,
            // Keep original source ID for reference in edge data
            data: {
              ...edge.data,
              originalSourceId: edge.source,
              isFromGroupedNode: true,
            },
          };
        }

        return edge;
      });

      // Generate detailed view with connection nodes
      const flowDataForFieldView = { ...sanitizedFlowData, nodes: localNodesToRender, edges: transformedEdges };
      const { nodes: detailedNodes, edges: detailedEdges } = generateFieldLevelView(flowDataForFieldView, convertEdgeToFormula);

      // Store detailed edges
      connectionEdgesRef.current = detailedEdges;

      // Extract connection nodes
      const connectionNodes = detailedNodes.filter(n => n.type === 'connectionNode');
      const nonConnectionNodes = detailedNodes.filter(n => n.type !== 'connectionNode');

      console.log('[DashboardCanvas] Connection nodes:', connectionNodes.map(n => ({ id: n.id, type: n.type })));

      // Combine all nodes for layout
      const allNodesToLayout = [...nonConnectionNodes, ...connectionNodes];
      // Use the detailed edges for layout (includes connection/formula edges)
      const layoutedNodes = applyLayout(allNodesToLayout, detailedEdges);

      // Add dynamic nodes (but don't change connection/formula node types)
      let updatedDynamicNodes = dynamicNodes.map(node => {
        const enrichedNode = enrichNodeWithNestedFields(node, sanitizedFlowData.edges);
        // Only apply detailed type to nodes that need it, not connection/formula nodes
        if (node.type === 'connectionNode' || node.type === 'formulaNode') {
          return enrichedNode;
        }
        const detailedType = getDetailedNodeType(node.type || '');
        return { ...enrichedNode, type: detailedType };
      });

      let finalNodes = [...layoutedNodes, ...updatedDynamicNodes];

      // Deduplicate nodes by ID
      const nodeMap = new Map<string, Node>();
      finalNodes.forEach(node => nodeMap.set(node.id, node));
      finalNodes = Array.from(nodeMap.values());

      // Filter for active mapping mode if needed
      if (activeMappingNodes.size > 0) {
        finalNodes = finalNodes.filter(node =>
          activeMappingNodes.has(node.id) ||
          node.type === 'formulaNode' ||
          node.type === 'newEntity'
        );
      }

      // Store for edge validation
      finalNodesToRender = finalNodes;

      console.log('[DashboardCanvas] Final nodes to render:', finalNodes.map(n => ({ id: n.id, type: n.type })));

      return finalNodes;
    });

    // Update edges after nodes are set
    setTimeout(() => {
      setEdges(() => {
        console.debug('[DashboardCanvas] Setting edges with', connectionEdgesRef.current.length, 'edges');

        // Use the detailed edges directly (they already include all connection/formula edges)
        let edgesToRender = [...connectionEdgesRef.current];

        // Make sure all edges reference nodes that exist
        const nodeIds = new Set(finalNodesToRender.map(n => n.id));
        const finalEdges = edgesToRender.filter(edge =>
          nodeIds.has(edge.source) && nodeIds.has(edge.target)
        );

        console.debug('[DashboardCanvas] Rendering', finalEdges.length, 'edges (filtered for valid nodes)');
        console.debug('[DashboardCanvas] Sample edges:', finalEdges.slice(0, 3).map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type
        })));

        return finalEdges;
      });
    }, 50);

    // Reset initialization flag
    setTimeout(() => {
      isInitializing.current = false;

      // Update all node internals
      getNodes().forEach(node => {
        updateNodeInternals(node.id);
      });

      // Initial auto-layout and fit if this is the first layout
      if (!hasInitializedLayout.current && sanitizedFlowData.nodes.length > 0) {
        setTimeout(() => {
          // Trigger auto-layout first
          const currentNodes = getNodes();
          const currentEdges = getEdges();
          const layoutedNodes = applyLayout(currentNodes, currentEdges);
          setNodes(layoutedNodes);

          // Then fit view after layout is applied
          setTimeout(() => {
            fitView({
              padding: 0.2,
              duration: 500,
              maxZoom: 1,
            });
          }, 200);
        }, 200);
      }
    }, 100);
  }, [
    sanitizedFlowData,
    activeMappingNodes,
    setNodes,
    setEdges,
    convertEdgeToFormula,
    enrichNodeWithNestedFields,
    updateNodeInternals,
    getNodes,
    getEdges,
    getDetailedNodeType,
    fitView,
  ]);

  // Edge hover effect
  const hoveredEdge = useRef<string | null>(null);

  useEffect(() => {
    if (hoveredEdge.current) {
      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          if (edge.id === hoveredEdge.current) {
            return {
              ...edge,
              animated: true,
              style: { ...edge.style, strokeWidth: 3 },
            };
          }
          return edge;
        })
      );
    } else {
      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          if (edge.id === hoveredEdge.current) {
            return {
              ...edge,
              animated: false,
              style: { ...edge.style, strokeWidth: undefined },
            };
          }
          return edge;
        })
      );
    }
  }, [hoveredEdge.current, setEdges]);

  // Set up control buttons
  const controlButtons = (
    <div className="absolute top-4 right-4 flex gap-2 z-10">
      <button
        onClick={handleAutoLayout}
        className="bg-white px-3 py-1.5 rounded shadow hover:shadow-lg transition-shadow flex items-center gap-1"
        title="Auto-layout nodes"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h7" />
        </svg>
        <span className="text-sm">Auto Layout</span>
      </button>
      <button
        onClick={handleAutoFit}
        className="bg-white px-3 py-1.5 rounded shadow hover:shadow-lg transition-shadow"
        title="Fit to view"
      >
        <RotateCw className="w-5 h-5" />
      </button>
    </div>
  );

  // Show empty state if no nodes
  if (!nodes || nodes.length === 0) {
    if (sanitizedFlowData.nodes.length === 0) {
      return <DashboardEmpty />;
    }
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onEdgeClick={onEdgeClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onEdgeMouseEnter={onEdgeMouseEnter}
        onEdgeMouseLeave={onEdgeMouseLeave}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        minZoom={0.1}
        maxZoom={2}
        panOnScroll={false}
        panOnDrag={true}
        panOnScrollMode={PanOnScrollMode.Free}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <MiniMap />
        <Controls />
        {controlButtons}
        {activeMappingNodes.size > 0 && (
          <button
            onClick={clearMappingNodes}
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded shadow hover:bg-red-700 z-10"
          >
            Exit Mapping Mode
          </button>
        )}
      </ReactFlow>
    </div>
  );
};

// Export wrapped in provider
export default function DashboardCanvasWrapper(props: DashboardCanvasProps) {
  return (
    <ReactFlowProvider>
      <DashboardCanvas {...props} />
    </ReactFlowProvider>
  );
}