# Real-time Broadcasting Setup with Soketi

## Summary

Added real-time WebSocket broadcasting to show live schema analysis progress on the dashboard.

## What Was Added

### 1. Docker Infrastructure
- **Soketi container** added to `docker-compose.yml`
  - Runs on port 6001 (WebSocket)
  - Metrics on port 9601
  - App ID: `ai-data-lake`
  - App Key: `app-key`
  - App Secret: `app-secret`

### 2. Environment Configuration
Updated `.env.example` with:
```env
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=ai-data-lake
PUSHER_APP_KEY=app-key
PUSHER_APP_SECRET=app-secret
PUSHER_HOST=soketi
PUSHER_PORT=6001
PUSHER_SCHEME=http
PUSHER_APP_CLUSTER=mt1

VITE_PUSHER_APP_KEY="${PUSHER_APP_KEY}"
VITE_PUSHER_HOST="${PUSHER_HOST}"
VITE_PUSHER_PORT="${PUSHER_PORT}"
VITE_PUSHER_SCHEME="${PUSHER_SCHEME}"
VITE_PUSHER_APP_CLUSTER="${PUSHER_APP_CLUSTER}"
```

**User Action Required**: Copy these to your `.env` file

### 3. Backend Broadcasting

#### New Files Created:
- **`app/Events/SchemaAnalysisEvent.php`**
  - Broadcasts on channel: `tenant.{tenant_id}.schemas`
  - Event name: `schema.analysis`
  - Statuses: `started`, `completed`, `failed`
  - Includes schema and entity data

#### Modified Files:
- **`composer.json`** - Added `pusher/pusher-php-server: ^7.2`
- **`app/Jobs/AnalyzeSchemaJob.php`** - Broadcasts events at:
  - Analysis start (with analyzing node data)
  - Analysis completion (with bronze + silver schema data)
  - Analysis failure (with error details)

### 4. Frontend Components

#### New Files Created:
- **`resources/js/components/FlowNodes/AnalyzingSchemaNode.tsx`**
  - Faded/translucent appearance
  - Pulsing glow animation
  - Spinning loader icon
  - Shows "Analyzing Schema..." message
  - Displays field count

#### Modified Files:
- **`package.json`** - Added dependencies:
  - `laravel-echo: ^1.18.0`
  - `pusher-js: ^8.4.0-rc2`
- **`resources/js/Pages/Dashboard.tsx`**
  - Registered `analyzingSchema` node type
  - Added imports for Echo and Pusher

## How It Works

### Workflow:

1. **Data Ingested** → Schema created with `ai_analysis_status = 'pending'`

2. **AI Analysis Starts** → Job dispatched
   - Broadcasts `started` event
   - Frontend adds faded "Analyzing Schema..." node to dashboard
   - Node appears with pulsing animation

3. **AI Completes** → Canonical entity created, mappings established
   - Broadcasts `completed` event with full schema data
   - Frontend receives bronze + silver schema + mappings
   - Frontend **pushes** new nodes to graph (doesn't reload)
   - Removes analyzing node, adds real nodes with edges

4. **If AI Fails** →
   - Broadcasts `failed` event with error
   - Frontend shows error state or removes analyzing node

## Next Steps for Full Implementation

### Still Need To Do:

1. **Install npm packages**:
   ```bash
   cd platform
   npm install
   ```

2. **Install composer packages**:
   ```bash
   docker-compose exec platform composer install
   ```

3. **Create Echo bootstrap file** (`resources/js/echo.ts`):
   ```typescript
   import Echo from 'laravel-echo';
   import Pusher from 'pusher-js';

   window.Pusher = Pusher;

   window.Echo = new Echo({
       broadcaster: 'pusher',
       key: import.meta.env.VITE_PUSHER_APP_KEY,
       wsHost: import.meta.env.VITE_PUSHER_HOST,
       wsPort: import.meta.env.VITE_PUSHER_PORT,
       wssPort: import.meta.env.VITE_PUSHER_PORT,
       forceTLS: (import.meta.env.VITE_PUSHER_SCHEME ?? 'https') === 'https',
       enabledTransports: ['ws', 'wss'],
       cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
       disableStats: true,
   });
   ```

4. **Add Echo listener to Dashboard** (in `DashboardFlow` component after state declarations):
   ```typescript
   const page = usePage();
   const tenantId = (page.props.auth as any)?.user?.tenant_id;

   // WebSocket listener for real-time schema updates
   useEffect(() => {
       if (!tenantId) return;

       const channel = window.Echo.channel(`tenant.${tenantId}.schemas`);

       channel.listen('.schema.analysis', (event: any) => {
           console.log('Schema analysis event:', event);

           if (event.status === 'started') {
               // Add analyzing node
               const analyzingNode: Node = {
                   id: `analyzing-${event.schema_id}`,
                   type: 'analyzingSchema',
                   position: { x: 100, y: 100 },
                   data: {
                       label: `Analyzing Schema...`,
                       hash: event.data.hash,
                       fields: event.data.detected_fields,
                   },
               };
               setNodes((nds) => [...nds, analyzingNode]);
           }

           if (event.status === 'completed') {
               // Remove analyzing node
               setNodes((nds) => nds.filter(n => n.id !== `analyzing-${event.schema_id}`));

               // Add bronze (source) node
               const bronzeNode: Node = {
                   id: `schema-${event.data.bronze_schema.id}`,
                   type: 'sourceSchema',
                   position: { x: 100, y: nodes.length * 300 },
                   data: {
                       label: event.data.bronze_schema.name || `Schema ${event.data.bronze_schema.hash}`,
                       hash: event.data.bronze_schema.hash,
                       fields: event.data.bronze_schema.detected_fields,
                       created_at: event.data.bronze_schema.created_at,
                   },
               };

               // Add silver (entity) node
               const silverNode: Node = {
                   id: `entity-${event.data.silver_entity.id}`,
                   type: 'entitySchema',
                   position: { x: 600, y: nodes.length * 300 },
                   data: {
                       label: event.data.silver_entity.name,
                       fields: event.data.silver_entity.detected_fields,
                   },
               };

               // Add edge connecting them
               const edge: Edge = {
                   id: `edge-${event.data.bronze_schema.id}-${event.data.silver_entity.id}`,
                   source: `schema-${event.data.bronze_schema.id}`,
                   target: `entity-${event.data.silver_entity.id}`,
                   type: 'staggered',
                   animated: false,
                   label: `${event.data.mappings_count} fields`,
               };

               setNodes((nds) => [...nds, bronzeNode, silverNode]);
               setEdges((eds) => [...eds, edge]);
           }

           if (event.status === 'failed') {
               // Remove analyzing node and optionally show error
               setNodes((nds) => nds.filter(n => n.id !== `analyzing-${event.schema_id}`));
               console.error('Schema analysis failed:', event.data.error);
           }
       });

       return () => {
           channel.stopListening('.schema.analysis');
       };
   }, [tenantId, setNodes, setEdges, nodes.length]);
   ```

5. **Start Soketi container**:
   ```bash
   docker-compose up -d soketi
   ```

6. **Restart platform and queue-worker** to pick up new code:
   ```bash
   docker-compose restart platform queue-worker
   ```

## Testing

1. Send data through ingestion service
2. Dashboard should immediately show faded "Analyzing Schema..." node
3. After ~15-60 seconds, analyzing node disappears
4. Bronze (blue) and Silver (green) nodes appear with mapping edge
5. No page reload required!

## Channel Security

Currently using **public channel** for simplicity. For production, consider:
- Private channels with authentication
- Per-user channels
- Encrypted payloads for sensitive data
