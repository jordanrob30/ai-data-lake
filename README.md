# AI Data Lake Project

## Overview

This project aims to build an AI-powered data lake tool that enables seamless, automated data ingestion and mapping across multiple tenants. The core concept revolves around a single ingestion point (via WebSocket or HTTP webhook) that intelligently processes and maps incoming data from various sources, using AI to suggest mappings and human confirmation to ensure accuracy. Data is segmented by tenants to maintain isolation and security.

This is an early phase focusing on foundational architecture, services, and workflows. The goal is to achieve fully automated ingestion and mapping, reducing human intervention while ensuring high-quality data transformation from raw (bronze) to processed (silver) layers.

## Current Goals

- **Ingestion and Mapping Foundation**: Set up ingestion, schema detection, and LLM-based mapping suggestions.
- **Human-in-the-Loop**: Confirmation workflows for AI-suggested mappings.
- **Tenant Segmentation**: Multi-tenancy with RBAC.
- **Development Focus**: Containerized env with Docker Compose, temporary CSV storage for data layers.
- **Tech Integration**: Laravel for main app, Go for ingestion, LangChain for AI agent.

## Key Components

- **Platform (Laravel)**: Core logic, API, UI for confirmations.
- **Ingestion Service (Go)**: WebSocket/HTTP endpoints, queuing with RabbitMQ, bronze CSV storage.
- **Agent Service (LangChain)**: Mapping suggestions, silver layer processing.
- **Infrastructure**: Docker Compose for services including Postgres and RabbitMQ.

For more details, see [project-summary.md](project-summary.md) and [tech-stack.md](tech-stack.md).

## Setup

1. Clone the repository.
2. Run `docker-compose up` to start services.
3. Follow setup instructions in each subdirectory.

