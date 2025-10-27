# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered data lake with intelligent schema detection and mapping. The system ingests data from multiple sources via WebSocket/HTTP, uses AI to suggest field mappings, and maintains bronze/silver data layers with human-in-the-loop confirmation workflows. Built for multi-tenancy with role-based access control.

**Key Architecture Pattern**: Unconfirmed schemas queue data in Kafka until mapping is approved, then data flows to bronze layer CSV storage. Platform service manages mappings and confirmations; ingestion service handles intake and schema detection.

## Key Features

### Dashboard - Schema Mapping Visualization
- **React Flow visualization** showing data flow from bronze schemas to silver entities
- **Interactive nodes** displaying schema metadata (tenant, fields, pending records)
- **Toggle for field mappings** - shows/hides detailed field-level mapping labels on edges
- **Auto-layout** - automatically positions nodes in left-to-right flow
- **Source Schema Nodes** (Blue) - Bronze tier schemas from ingestion
- **Entity Schema Nodes** (Green) - Silver tier entities for structured data
- **Edges** - Represent mappings from schemas to entities
- **Stats Dashboard** - Quick overview of total schemas, entities, and mappings
- Located at: `platform/resources/js/Pages/Dashboard.tsx`

### Intelligent Schema Detection
- **Enhanced type detection** with metadata capture:
  - Date/time formats (10+ formats including ISO8601, YYYY-MM-DD, unix timestamps)
  - Numeric precision (decimal places) and scale (total digits)
  - Min/max values from samples
  - String patterns (email, URL, UUID, phone, JSON)
- **Schema Comparison Service** - Intelligently matches incoming schemas with existing entities
  - Fuzzy field name matching (Levenshtein distance)
  - Type compatibility checking
  - Format compatibility analysis
  - Similarity scoring with recommendations
  - Automatic transformation suggestions
- Located at: `ingestion/main.go`, `platform/app/Services/SchemaComparisonService.php`

### Confirmation & Mapping Workflow
- **Pending Confirmations** - Review detected schemas before processing
- **Interactive JSON Renderer** - Hover over data structures to create entity mappings
- **Entity Matching Suggestions** - AI-powered recommendations for mapping to existing entities
- **Field Metadata Display** - Shows formats, precision, and constraints
- **Format Transformation Warnings** - Identifies incompatible formats requiring conversion
- Located at: `platform/resources/js/Pages/Confirmations.tsx`, `ConfigureMappings.tsx`

## Services Architecture

### Platform (Laravel - Port 80)
- **Purpose**: Core business logic, API, schema management, user authentication, tenant isolation
- **Stack**: Laravel 12 + Octane (FrankenPHP), Inertia.js, React, TypeScript, Tailwind, PostgreSQL
- **Key Dependencies**: Spatie Permissions (RBAC), Stancl Tenancy (multi-tenancy), Laravel Sanctum (auth)
- **Database**: PostgreSQL (port 5433 externally, 5432 internally)

### Ingestion (Go - Port 8080)
- **Purpose**: High-performance data intake, schema hashing, Kafka queuing
- **Endpoints**:
  - `POST /tenant/{tenant_id}/ingest` - HTTP ingestion
  - `WS /tenant/{tenant_id}/ws` - WebSocket ingestion
  - `GET /kafka/topic/schema-{hash}/count` - Get pending record count
- **Flow**: Detects schema → checks if confirmed → if yes, stores bronze CSV; if no, queues in Kafka topic `schema-{hash}`
- **Schema Detection**: SHA256 hash of sorted field names+types (first 16 chars)

### Queue Worker (Laravel)
- Processes background jobs from Laravel queue
- Handles async tasks for confirmed schema processing

### Observability Stack
- **Grafana** (port 3000): Dashboards and visualization
- **Loki** (port 3100): Log aggregation
- **Promtail**: Log shipping from containers and platform logs

### Infrastructure
- **Kafka + Zookeeper**: Message queuing for unconfirmed schemas (Kafka port 9092)
- **PostgreSQL**: Shared database for platform and tenancy

## Development Commands

### Starting the System
```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up platform
docker-compose up ingestion
```

### Platform (Laravel)

**Running in Docker:**
```bash
# Access platform container shell
docker-compose exec platform bash

# Run artisan commands
docker-compose exec platform php artisan {command}

# Run migrations
docker-compose exec platform php artisan migrate

# Run tests
docker-compose exec platform php artisan test

# Run specific test
docker-compose exec platform php artisan test --filter={TestName}

# Code formatting
docker-compose exec platform ./vendor/bin/pint

# Queue worker (already running in separate container)
docker-compose logs -f queue-worker
```

**Alternative - Use composer scripts (from platform dir):**
```bash
cd platform
composer test          # Run tests
composer dev          # Run server + queue + logs + vite concurrently
```

**Frontend Development:**
```bash
# From platform directory
npm install          # Install dependencies (run after adding new packages)
npm run dev           # Start Vite dev server (port 5173)
npm run build         # Build production assets
npm test             # Run Vitest tests
```

**IMPORTANT: After adding new npm packages:**
- Run `npm install` in the platform directory
- Vite dev server has hot-reload - changes appear automatically
- React Flow is used for the Dashboard schema visualization

### Ingestion (Go)

**IMPORTANT: The ingestion service has automatic hot-reload via Air in Docker.**
- DO NOT run `go build` or `go run` commands manually
- Just edit `.go` files and save - Air will automatically rebuild and restart
- Check `docker-compose logs -f ingestion` to see compilation errors or successful restarts

```bash
# Run tests (only time you need to manually run Go commands)
cd ingestion
go test ./...

# View logs to see hot-reload in action
docker-compose logs -f ingestion

# If you need to force a rebuild of the container
docker-compose up --build ingestion
```

**How Air works:**
- Watches all `.go` files in the ingestion directory
- On file change: builds, restarts service automatically
- Build errors appear in the logs
- Volume mount (`./ingestion:/app`) keeps files in sync

### Database Management

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U user -d ai_data_lake

# Run migrations
docker-compose exec platform php artisan migrate

# Fresh migration with seeding
docker-compose exec platform php artisan migrate:fresh --seed

# Create migration
docker-compose exec platform php artisan make:migration {name}
```

### Kafka Operations

```bash
# List topics
docker-compose exec kafka kafka-topics --list --bootstrap-server localhost:9092

# View messages in topic
docker-compose exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic schema-{hash} --from-beginning

# Create topic (done automatically by ingestion service)
docker-compose exec kafka kafka-topics --create --topic schema-{hash} --bootstrap-server localhost:9092
```

### Logs and Monitoring

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f platform
docker-compose logs -f ingestion

# View Laravel logs with Pail (pretty output)
docker-compose exec platform php artisan pail

# Access Grafana
open http://localhost:3000  # user: admin, pass: admin
```

## Important Code Patterns

### Schema Hash Generation
Located in `ingestion/main.go:111-123`. Creates consistent 16-char hash from sorted `field:type` pairs. Must match exactly between ingestion and platform services.

### Tenant Isolation
- **Platform**: Uses Stancl Tenancy with tenant-scoped routes in `routes/tenant.php`
- **Ingestion**: Tenant ID extracted from URL path `/tenant/{tenant_id}/*` and passed to platform API
- **Bronze Storage**: Separated by tenant directory `bronze/tenant_{id}/{schema_hash}.csv`

### Confirmation Workflow
1. New schema detected → `POST /api/schemas` creates pending schema
2. Kafka topic `schema-{hash}` created and data queued
3. Platform UI shows pending confirmation at `/schemas`
4. User confirms → schema status = 'confirmed'
5. Agent service (when implemented) processes Kafka queue → bronze layer

### API Communication
- Ingestion → Platform: Schema checks via `platform/client.go`
- Platform base URL: `http://platform` (internal Docker network)
- Key endpoints used by ingestion:
  - `GET /api/schemas/hash/{hash}` - Check schema status
  - `POST /api/schemas` - Create new schema
  - `POST /api/schemas/hash/{hash}/increment` - Increment pending count

### Testing Patterns

**Platform (PHPUnit):**
- Feature tests in `platform/tests/Feature/`
- Unit tests in `platform/tests/Unit/`
- Use `RefreshDatabase` trait for DB tests

**Frontend (Vitest):**
- Tests in `platform/resources/js/**/*.test.tsx`
- Uses `@testing-library/react`

**Ingestion (Go):**
- Test files: `*_test.go`
- Run with `go test ./...`

## Key Files Reference

### Configuration
- `docker-compose.yml` - Service orchestration
- `platform/composer.json` - PHP dependencies, custom scripts
- `platform/package.json` - Frontend dependencies
- `ingestion/go.mod` - Go dependencies
- `platform/config/tenancy.php` - Multi-tenancy config

### Core Application Logic
- `platform/app/Models/Schema.php` - Schema model with confirmation status
- `platform/app/Http/Controllers/Api/SchemaController.php` - Schema API
- `platform/app/Services/SchemaService.php` - Schema business logic
- `ingestion/main.go` - Main ingestion logic, schema detection
- `ingestion/kafka/producer.go` - Kafka operations
- `ingestion/platform/client.go` - Platform API client

### Routing
- `platform/routes/api.php` - API routes for ingestion service
- `platform/routes/web.php` - Web routes for UI
- `platform/routes/tenant.php` - Tenant-scoped routes

## Environment Variables

Key variables in docker-compose.yml:
- `DB_*` - Database connection (shared across services)
- `KAFKA_BROKERS=kafka:29092` - Ingestion service
- `PLATFORM_API_URL=http://platform` - Ingestion → Platform communication
- Laravel Octane runs with `--watch` flag for hot reload

## Common Workflows

### Adding a New Schema Field Type
1. Update `ingestion/main.go` - `detectFieldType()` or `detectStringType()`
2. Update platform migrations if new DB column needed
3. Update frontend TypeScript types in `platform/resources/js/types/`

### Testing Data Ingestion
1. Send POST to `http://localhost:8080/tenant/1/ingest`
2. Check schema created: `docker-compose exec platform php artisan tinker` → `Schema::all()`
3. Check Kafka queue: `docker-compose exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic schema-{hash} --from-beginning`
4. Check bronze CSV: `ls bronze/tenant_1/`

### Debugging
- **Platform errors**: Check `docker-compose logs -f platform` or `platform/storage/logs/laravel.log`
- **Ingestion errors**: Check `docker-compose logs -f ingestion`
- **Database issues**: `docker-compose exec postgres psql -U user -d ai_data_lake`
- **Queue issues**: `docker-compose logs -f queue-worker`
