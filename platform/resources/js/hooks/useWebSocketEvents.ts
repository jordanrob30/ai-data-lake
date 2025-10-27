/**
 * Custom hook for WebSocket event handling
 */

import { useEffect } from 'react';
import { Node, Edge, useReactFlow } from '@xyflow/react';
import { usePage } from '@inertiajs/react';
import { SchemaAnalysisEvent } from '../types';

interface UseWebSocketEventsProps {
  tenantId?: string;
  onSchemaAnalysisComplete?: (bronze: any, silver: any, mappingsCount: number) => void;
}

export function useWebSocketEvents({ tenantId, onSchemaAnalysisComplete }: UseWebSocketEventsProps = {}) {
  const { setNodes, setEdges, getNodes } = useReactFlow();
  const page = usePage();
  const effectiveTenantId = tenantId || (page.props.auth as any)?.user?.tenant_id;

  useEffect(() => {
    if (!effectiveTenantId || !window.Echo) {
      return;
    }

    const channel = window.Echo.channel(`tenant.${effectiveTenantId}.schemas`);

    channel.listen('.schema.analysis', (event: SchemaAnalysisEvent) => {
      if (event.status === 'started') {
        const analyzingNode: Node = {
          id: `analyzing-${event.schema_id}`,
          type: 'analyzingSchema',
          position: { x: 100, y: getNodes().length * 250 + 100 },
          data: {
            label: 'Analyzing Schema...',
            hash: event.data?.hash || 'unknown',
            tenant: event.tenant_id,
            fields: event.data?.detected_fields || [],
          },
        };
        setNodes((nds) => [...nds, analyzingNode]);
      }

      if (event.status === 'completed') {
        // Remove analyzing node
        setNodes((nds) => nds.filter(n => n.id !== `analyzing-${event.schema_id}`));

        const bronze = event.data?.bronze_schema;
        const silver = event.data?.silver_entity;
        const mappingsCount = event.data?.mappings_count || 0;

        if (!bronze || !silver) {
          return;
        }

        // Use callback if provided
        if (onSchemaAnalysisComplete) {
          onSchemaAnalysisComplete(bronze, silver, mappingsCount);
          return;
        }

        // Default behavior
        const entityNodeId = `entity-${silver.id}`;
        const currentNodes = getNodes();
        const entityExists = currentNodes.some(n => n.id === entityNodeId);

        // Calculate Y position for new nodes
        const maxY = currentNodes.reduce((max, n) => Math.max(max, n.position.y), 0);
        const newY = maxY + 350;

        // Find existing entity position if it exists
        const existingEntity = currentNodes.find(n => n.id === entityNodeId);
        const entityY = existingEntity ? existingEntity.position.y : newY;

        // Add bronze (source) node
        const bronzeNode: Node = {
          id: `schema-${bronze.id}`,
          type: 'sourceSchema',
          position: { x: 100, y: entityExists ? entityY : newY },
          data: {
            label: bronze.name || `Schema ${bronze.hash}`,
            hash: bronze.hash,
            tenant: event.tenant_id,
            fields: bronze.detected_fields || [],
            pending_records: 0,
            created_at: bronze.created_at,
          },
        };

        // Create silver (entity) node only if it doesn't exist
        const silverNode: Node = {
          id: entityNodeId,
          type: 'entitySchema',
          position: { x: 650, y: entityY },
          data: {
            label: silver.name,
            fields: silver.detected_fields || [],
          },
        };

        // Add edge connecting them
        const edge: Edge = {
          id: `edge-${bronze.id}-${silver.id}`,
          source: `schema-${bronze.id}`,
          target: entityNodeId,
          type: 'staggered',
          animated: false,
          label: `${mappingsCount} fields`,
          style: {
            stroke: '#6366f1',
            strokeWidth: 2,
          },
          data: {
            offset: 0,
          },
        };

        // Add bronze node and conditionally add silver node
        const newNodes = [bronzeNode];
        if (!entityExists) {
          newNodes.push(silverNode);
        }
        setNodes((nds) => [...(nds as Node[]), ...newNodes] as any);
        setEdges((eds) => [...(eds as Edge[]), edge] as any);
      }

      if (event.status === 'failed') {
        setNodes((nds) => nds.filter(n => n.id !== `analyzing-${event.schema_id}`));
      }
    });

    return () => {
      channel.stopListening('.schema.analysis');
      window.Echo.leaveChannel(`tenant.${effectiveTenantId}.schemas`);
    };
  }, [effectiveTenantId, setNodes, setEdges, getNodes, onSchemaAnalysisComplete]);
}