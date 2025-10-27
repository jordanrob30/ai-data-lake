"""FastAPI server for Thalamus schema analysis service."""

import os
import sys
import json
import asyncio
import structlog
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# Configure AWS credentials from environment
if os.getenv("AWS_ACCESS_KEY_ID"):
    os.environ["AWS_DEFAULT_REGION"] = os.getenv("AWS_REGION", "eu-west-2")

# Add the project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure LangSmith for observability before importing LangChain
if os.getenv("LANGSMITH_ENABLED", "false").lower() == "true":
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_ENDPOINT"] = os.getenv("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")
    if os.getenv("LANGSMITH_API_KEY"):
        os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGSMITH_API_KEY")
    if os.getenv("LANGSMITH_PROJECT"):
        os.environ["LANGCHAIN_PROJECT"] = os.getenv("LANGSMITH_PROJECT", "thalamus-schema-analyzer")

from config import settings
from models import SchemaAnalysisRequest, SchemaAnalysisResponse
from agents.schema_analyzer import analyze_schema

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer() if settings.log_format == "json"
        else structlog.dev.ConsoleRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    # Startup
    logger.info(
        "Starting Thalamus Schema Analyzer",
        version=settings.app_version,
        debug=settings.debug
    )

    # Test AWS Bedrock connection if credentials are provided
    if settings.aws_access_key_id:
        logger.info("AWS Bedrock credentials configured", region=settings.aws_region)
    else:
        logger.warning("AWS Bedrock credentials not configured - using environment defaults")

    # Log LangSmith configuration
    if settings.langsmith_enabled and settings.langsmith_api_key:
        logger.info(
            "LangSmith tracing enabled",
            project=settings.langsmith_project,
            endpoint=settings.langsmith_endpoint
        )
    else:
        logger.info("LangSmith tracing disabled")

    yield

    # Shutdown
    logger.info("Shutting down Thalamus Schema Analyzer")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint providing service information."""
    return {
        "service": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "endpoints": {
            "analyze": "/analyze-schema",
            "health": "/health",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_name,
        "version": settings.app_version
    }


@app.post("/analyze-schema", response_model=SchemaAnalysisResponse)
async def analyze_schema_endpoint(
    request: SchemaAnalysisRequest,
    background_tasks: BackgroundTasks
) -> SchemaAnalysisResponse:
    """
    Analyze an incoming schema and generate recommendations.

    This endpoint performs a multi-step analysis:
    1. Deep field analysis to understand data types and patterns
    2. Entity matching against existing canonical entities
    3. Schema normalization to create properly structured canonical schema
    4. Mapping generation with precise JSONata transformations

    Returns:
        SchemaAnalysisResponse with action, entity details, and field mappings
    """
    try:
        logger.info(
            "Received schema analysis request",
            schema_hash=request.incoming_schema.hash,
            schema_name=request.incoming_schema.name,
            fields_count=len(request.incoming_schema.detected_fields),
            existing_entities_count=len(request.existing_entities)
        )

        # Convert Pydantic models to dicts for the agent
        request_dict = {
            "incoming_schema": request.incoming_schema.model_dump(),
            "existing_entities": [e.model_dump() for e in request.existing_entities]
        }

        # Run the analysis
        result = await analyze_schema(request_dict)

        # Log the result
        logger.info(
            "Schema analysis completed",
            schema_hash=request.incoming_schema.hash,
            action=result.get("action"),
            entity_name=result.get("entity_name"),
            mappings_count=len(result.get("field_mappings", []))
        )

        # Create and validate response
        response = SchemaAnalysisResponse(**result)

        return response

    except Exception as e:
        logger.error(
            "Schema analysis failed",
            schema_hash=request.incoming_schema.hash if request else "unknown",
            error=str(e),
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler."""
    logger.error(
        "Unhandled exception",
        path=request.url.path,
        method=request.method,
        error=str(exc),
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.debug else "An error occurred"
        }
    )


# Compatibility endpoint matching Laravel's expected format
@app.post("/api/analyze-schema")
async def analyze_schema_compat(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compatibility endpoint for direct Laravel integration.
    Accepts raw JSON matching Laravel's format.
    """
    try:
        # Convert to Pydantic models for validation
        analysis_request = SchemaAnalysisRequest(
            incoming_schema=request["incoming_schema"],
            existing_entities=request.get("existing_entities", [])
        )

        # Process through main endpoint
        response = await analyze_schema_endpoint(analysis_request, BackgroundTasks())

        # Return as dict for Laravel compatibility
        return response.model_dump(exclude_none=True)

    except Exception as e:
        logger.error(
            "Compatibility endpoint error",
            error=str(e),
            exc_info=True
        )
        raise HTTPException(status_code=500, detail=str(e))


def run_server():
    """Run the FastAPI server."""
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    run_server()