"""Pydantic models for schema analysis."""

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class FieldDefinition(BaseModel):
    """Definition of a field in a schema."""

    name: str
    type: str
    format: Optional[str] = None
    required: bool = False
    metadata: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra='allow')


class SchemaInput(BaseModel):
    """Input schema to be analyzed."""

    id: int
    hash: str
    name: str
    tenant_id: int
    detected_fields: List[FieldDefinition]
    sample_data: Optional[List[Dict[str, Any]]] = Field(default_factory=list)

    model_config = ConfigDict(extra='allow')


class ExistingEntity(BaseModel):
    """Existing canonical entity for comparison."""

    id: int
    name: str
    fields: List[FieldDefinition]

    model_config = ConfigDict(extra='allow')


class FieldMapping(BaseModel):
    """Mapping from source field to target field."""

    source_field: str = Field(
        description="Name of field in incoming schema, or empty string for constants"
    )
    target_field: str = Field(
        description="Name of field in canonical schema"
    )
    transformation: Literal[
        "direct", "formula", "split", "combine", "format_conversion", "constant"
    ] = Field(default="direct")
    jsonata_formula: Optional[str] = Field(
        default=None,
        description="JSONata expression for transformation"
    )
    confidence: float = Field(
        ge=0.0, le=1.0,
        description="Confidence score for this mapping"
    )
    explanation: str = Field(
        description="Explanation of why this mapping makes sense"
    )

    model_config = ConfigDict(extra='allow')


class CanonicalSchema(BaseModel):
    """Canonical schema definition."""

    fields: List[FieldDefinition]

    model_config = ConfigDict(extra='allow')


class SchemaAnalysisRequest(BaseModel):
    """Request for schema analysis."""

    incoming_schema: SchemaInput
    existing_entities: List[ExistingEntity] = Field(default_factory=list)

    model_config = ConfigDict(extra='allow')


class SchemaAnalysisResponse(BaseModel):
    """Response from schema analysis."""

    action: Literal["map_to_existing", "create_new"]
    entity_id: Optional[int] = None
    entity_name: str = Field(
        description="Suggested silver/canonical entity name in PascalCase"
    )
    source_schema_name: str = Field(
        description="Descriptive name for the bronze/source schema"
    )
    similarity_score: Optional[int] = Field(
        None,
        ge=0, le=100,
        description="Similarity score when mapping to existing entity"
    )
    reasoning: str = Field(
        description="Detailed explanation of the recommendation"
    )
    canonical_schema: CanonicalSchema
    field_mappings: List[FieldMapping]

    # Metadata for tracking
    analysis_timestamp: datetime = Field(default_factory=datetime.now)
    agent_version: str = Field(default="1.0.0")

    model_config = ConfigDict(extra='allow')