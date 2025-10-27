# Changelog

## Stage 1: Project Setup - Completed

- Initialized project structure with Git repository.
- Created subdirectories: platform (Laravel), ingestion (Go), agent (LangChain).
- Planned and set up Docker containers via docker-compose.yml for development.
- Configured .gitignore for common patterns.
- Created README.md with project overview.
- Reviewed tech-stack.md (no changes needed).
- Planned shared configs in root (e.g., docker-compose.yml).

This completes the foundational setup, ready for Stage 2: Main Application Setup.

## Stage 2: Infrastructure Setup - Completed

- Configured central docker-compose.yml with services for PostgreSQL, RabbitMQ, and app placeholders.
- Set up PostgreSQL with initial schema for tenants and mappings.
- Configured RabbitMQ with queues for data ingestion and processing.
- Tested infrastructure by running services and verifying connections.

This completes the infrastructure setup, ready for Stage 3.

## Stage 3 Summary
Completed the main Laravel application setup, including initialization, Sail integration, Octane, models, API endpoints, authentication, multi-tenancy, RBAC, and testing.

## Stage 4 Summary

Completed frontend integration with React, Inertia.js, Shadcn UI, Tailwind, and TypeScript. Built dashboard, confirmation interface, and tenant management forms with role-based controls. Set up component testing with Vitest and verified key flows. This establishes the basic UI for the AI Data Lake application, ready for further enhancements in subsequent stages.

## Stage 5 Summary
- Initialized Go module, set up Docker configuration with volume mounts and Air for hot reloading, implemented basic server structure.
- Created WebSocket and HTTP POST endpoints with schema hashing and detection logic.
- Integrated RabbitMQ for queuing unmapped data, added CSV storage for bronze layer, and hooks for LLM mapping suggestions.
- Wrote unit and integration tests for endpoints, hashing, RabbitMQ, and CSV storage; verified functionality.

