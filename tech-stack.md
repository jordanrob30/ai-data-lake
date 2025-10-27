# Tech Stack Overview

This document outlines the technology stacks for each component of the AI Data Lake monorepo project. This helps in understanding dependencies, development requirements, and collaboration.

## Overall Project
- **Monorepo Management**: Turborepo or Lerna (to be decided) for managing multiple packages.
- **Containerization**: Docker and Docker Compose for development and deployment.
- **Version Control**: Git.
- **CI/CD**: To be determined (e.g., GitHub Actions).

## Main Application
- **Backend Framework**: Laravel (PHP) - Handles core logic, API endpoints, mapping storage, and human-in-the-loop confirmations.
- **Database**: PostgreSQL - Stores mappings, tenant data, and configuration.
- **Frontend**: React.js with Shadcn UI components, Tailwind CSS for styling, and TypeScript for type safety. Integrated via Laravel's frontend scaffolding (e.g., Breeze or Inertia.js).
- **Additional**: Hot reloading via Laravel Mix or Vite.
- **Performance**: Laravel Octane (Swoole) for high-performance serving.
- **Authorization**: Spatie Laravel Permissions for role-based access control (RBAC).
- **Development Environment**: Laravel Sail for containerized development.

## Ingestion Service
- **Language**: Go (Golang) - For high-performance ingestion handling.
- **Endpoints**: WebSocket for real-time ingestion and HTTP POST for batch ingestion.
- **Messaging/Queuing**: RabbitMQ - To queue incoming data for processing, especially for human-in-the-loop mapping.
- **Additional**: Intelligent hashing for schema detection, temporary storage for unmapped data.

## Agent Service
- **Framework**: LangChain (likely in Python or JavaScript) - For LLM-based mapping suggestions and data schema analysis.
- **LLM Integration**: Integration with models like OpenAI or local models for intelligent mapping.
- **Purpose**: Analyzes new data sources, suggests mappings to existing schemas, and interacts with the ingestion service.

## Infrastructure
- **Orchestration**: Central docker-compose.yml in the project root for managing all services (Postgres, RabbitMQ, Main App, Ingestion, Agent).
- **Data Layers**: Bronze (raw data) and Silver (mapped/processed data) - Temporarily using CSV files for development focus on mapping quality; TBD for production (e.g., S3-like or database tables).
- **Development Features**: Hot reloading for all services where applicable.

This stack ensures scalability, ease of development, and alignment with the project's goals of intelligent data ingestion and mapping.


If you wish to use php or composer commands you can run docker-compose exec platform {CMD} from the root of the project