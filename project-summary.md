# AI Data Lake Project Summary

## Overview
This project aims to build an AI-powered data lake tool that enables seamless, automated data ingestion and mapping across multiple tenants. The core concept revolves around a single ingestion point (via WebSocket or HTTP webhook) that intelligently processes and maps incoming data from various sources, using AI to suggest mappings and human confirmation to ensure accuracy. Data is segmented by tenants to maintain isolation and security.

This document represents an early phase of the project, focusing on establishing the foundational architecture, services, and workflows. The ultimate goal is to achieve fully automated ingestion and mapping, reducing human intervention over time while ensuring high-quality data transformation from raw (bronze) to processed (silver) layers.

## Current Goals
- **Ingestion and Mapping Foundation**: Set up a robust system for ingesting data, detecting schemas via intelligent hashing, and using LLMs to propose mappings to existing schemas (e.g., unifying analytics data from multiple platforms).
- **Human-in-the-Loop**: Incorporate confirmation workflows where humans review and approve AI-suggested mappings before data is processed into silver layers.
- **Tenant Segmentation**: Ensure all data handling respects multi-tenancy, with role-based access controls for landlords (admins) and tenants.
- **Development Focus**: Use containerized environments (Docker Compose, Laravel Sail) for easy development with hot reloading. Temporarily store bronze and silver data as CSV files to prioritize mapping quality over scalable storage in this phase.
- **Tech Integration**: Build interconnected services including a Laravel main app for core logic and UI, a Go-based ingestion service, and a LangChain agent for AI mapping.

## Key Components
- **Main Application (Laravel)**: Handles mapping storage in PostgreSQL, API endpoints, authentication (with RBAC via Spatie), and a React frontend (Shadcn, Tailwind, TypeScript) for user interactions like mapping confirmations.
- **Ingestion Service (Go)**: Exposes WebSocket and HTTP POST endpoints for data intake, uses RabbitMQ for queuing unmapped data, and stores raw (bronze) data temporarily as CSVs.
- **Agent Service (LangChain)**: Analyzes new data sources, suggests mappings using LLMs, and processes confirmed data into silver layer CSVs.
- **Infrastructure**: Centralized docker-compose.yml for all services, including Postgres and RabbitMQ, with hot reloading for development efficiency.

## Overall Project Goals
The long-term vision is to evolve this system into a fully automated AI data lake where:
- Data ingestion is entirely hands-off, with AI confidently mapping and transforming data without human intervention in most cases.
- Advanced storage solutions (e.g., S3-compatible object storage or big data tools like Apache Spark) replace temporary CSVs for scalable bronze, silver, and gold layers.
- Enhanced analytics, querying, and AI-driven insights become available on the processed data.
- The system supports high volumes of data from diverse sources, with robust error handling, monitoring, and scalability.

This summary can be updated in future phases to refine steering and incorporate new requirements as the project progresses.
