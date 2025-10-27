"""State definitions for the schema analysis agent."""

from typing import List, Dict, Any, Optional, TypedDict
from langgraph.graph import MessagesState
from models.schema_models import (
    SchemaInput,
    ExistingEntity,
    FieldMapping,
    CanonicalSchema,
    FieldDefinition
)


class SchemaAnalysisState(TypedDict):
    """State for the schema analysis workflow."""

    # Input data
    incoming_schema: SchemaInput
    existing_entities: List[ExistingEntity]

    # Analysis results from each node
    field_analysis: Optional[Dict[str, Any]]  # Detailed field type analysis
    normalization_suggestions: Optional[Dict[str, Any]]  # Field splitting suggestions
    entity_match_results: Optional[Dict[str, Any]]  # Entity matching scores

    # Final outputs
    action: Optional[str]  # "map_to_existing" or "create_new"
    entity_id: Optional[int]
    entity_name: Optional[str]
    source_schema_name: Optional[str]
    similarity_score: Optional[int]
    reasoning: Optional[str]
    canonical_schema: Optional[CanonicalSchema]
    field_mappings: Optional[List[FieldMapping]]

    # Tracking and debugging
    current_step: str
    error: Optional[str]
    processing_history: List[str]