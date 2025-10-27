"""Main schema analyzer graph orchestrator using LangGraph."""

import structlog
from typing import Dict, Any
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from .state import SchemaAnalysisState
from .nodes import (
    analyze_fields,
    match_entities,
    normalize_schema,
    generate_mappings
)
from models.schema_models import (
    SchemaAnalysisResponse,
    FieldMapping,
    CanonicalSchema
)

logger = structlog.get_logger()


def create_schema_analyzer_graph():
    """Create the LangGraph workflow for schema analysis."""

    # Create the graph
    workflow = StateGraph(SchemaAnalysisState)

    # Add nodes
    workflow.add_node("analyze_fields", analyze_fields)
    workflow.add_node("match_entities", match_entities)
    workflow.add_node("normalize_schema", normalize_schema)
    workflow.add_node("generate_mappings", generate_mappings)
    workflow.add_node("prepare_response", prepare_response)

    # Define the workflow edges
    workflow.set_entry_point("analyze_fields")

    # Linear flow through the analysis pipeline
    workflow.add_edge("analyze_fields", "match_entities")
    workflow.add_edge("match_entities", "normalize_schema")
    workflow.add_edge("normalize_schema", "generate_mappings")
    workflow.add_edge("generate_mappings", "prepare_response")
    workflow.add_edge("prepare_response", END)

    # Compile the graph with memory for state tracking
    memory = MemorySaver()
    graph = workflow.compile(checkpointer=memory)

    return graph


def prepare_response(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Prepare the final response from the accumulated state.
    This node formats the state into the expected response structure.
    """
    logger.info(
        "Preparing final response",
        schema_hash=state["incoming_schema"]["hash"],
        action=state.get("action", "unknown")
    )

    try:
        # Build the response matching Laravel's expected format
        response = {
            "action": state.get("action", "create_new"),
            "entity_id": state.get("entity_id"),
            "entity_name": state.get("entity_name", "UnknownEntity"),
            "source_schema_name": state.get("source_schema_name", state["incoming_schema"]["name"]),
            "similarity_score": state.get("similarity_score"),
            "reasoning": state.get("reasoning", ""),
            "canonical_schema": state.get("canonical_schema", {"fields": []}),
            "field_mappings": state.get("field_mappings", [])
        }

        # Validate and clean the response
        response = _validate_response(response, state)

        state["final_response"] = response
        state["processing_history"].append("response_prepared")

        logger.info(
            "Response prepared successfully",
            schema_hash=state["incoming_schema"]["hash"],
            mappings_count=len(response["field_mappings"])
        )

        return state

    except Exception as e:
        logger.error(
            "Failed to prepare response",
            schema_hash=state["incoming_schema"]["hash"],
            error=str(e)
        )
        # Return a minimal valid response on error
        state["final_response"] = _create_error_response(state, str(e))
        return state


def _validate_response(response: Dict[str, Any], state: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and clean the response data."""

    # Ensure canonical_schema has the correct structure
    if not response.get("canonical_schema") or not response["canonical_schema"].get("fields"):
        # Try to build from normalization suggestions
        if state.get("normalization_suggestions", {}).get("canonical_schema"):
            response["canonical_schema"] = state["normalization_suggestions"]["canonical_schema"]
        else:
            # Fallback to creating from detected fields
            response["canonical_schema"] = {
                "fields": [
                    {
                        "name": field["name"],
                        "type": field["type"],
                        "required": field.get("required", False)
                    }
                    for field in state["incoming_schema"]["detected_fields"]
                ]
            }

    # Ensure field_mappings is a list
    if not isinstance(response.get("field_mappings"), list):
        response["field_mappings"] = []

    # Validate each field mapping
    validated_mappings = []
    for mapping in response["field_mappings"]:
        if isinstance(mapping, dict) and mapping.get("target_field"):
            # Ensure all required fields are present
            validated_mapping = {
                "source_field": mapping.get("source_field", ""),
                "target_field": mapping["target_field"],
                "transformation": mapping.get("transformation", "direct"),
                "jsonata_formula": mapping.get("jsonata_formula", ""),
                "confidence": mapping.get("confidence", 0.8),
                "explanation": mapping.get("explanation", "")
            }
            validated_mappings.append(validated_mapping)

    response["field_mappings"] = validated_mappings

    # Set default values for optional fields
    if not response.get("source_schema_name"):
        response["source_schema_name"] = f"source_{state['incoming_schema']['hash'][:8]}"

    if not response.get("entity_name"):
        response["entity_name"] = "DataEntity"

    if not response.get("reasoning"):
        response["reasoning"] = "Schema analyzed through multi-step agent pipeline"

    return response


def _create_error_response(state: Dict[str, Any], error: str) -> Dict[str, Any]:
    """Create a minimal valid response when processing fails."""

    # Create basic canonical schema from incoming fields
    canonical_fields = []
    field_mappings = []

    for field in state["incoming_schema"]["detected_fields"]:
        # Add to canonical schema
        canonical_fields.append({
            "name": field["name"],
            "type": field["type"],
            "required": field.get("required", False)
        })

        # Create direct mapping
        field_mappings.append({
            "source_field": field["name"],
            "target_field": field["name"],
            "transformation": "direct",
            "jsonata_formula": field["name"],
            "confidence": 0.5,
            "explanation": "Fallback direct mapping due to processing error"
        })

    return {
        "action": "create_new",
        "entity_id": None,
        "entity_name": "DataEntity",
        "source_schema_name": state["incoming_schema"]["name"],
        "similarity_score": None,
        "reasoning": f"Fallback response due to error: {error}",
        "canonical_schema": {
            "fields": canonical_fields
        },
        "field_mappings": field_mappings
    }


async def analyze_schema(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Main entry point for schema analysis.

    Args:
        request: Dictionary containing incoming_schema and existing_entities

    Returns:
        Analysis results matching Laravel's expected format
    """
    logger.info(
        "Starting schema analysis",
        schema_hash=request["incoming_schema"]["hash"],
        existing_entities_count=len(request.get("existing_entities", []))
    )

    # Create the graph
    graph = create_schema_analyzer_graph()

    # Initialize state
    initial_state = {
        "incoming_schema": request["incoming_schema"],
        "existing_entities": request.get("existing_entities", []),
        "current_step": "starting",
        "processing_history": [],
        "field_analysis": None,
        "normalization_suggestions": None,
        "entity_match_results": None,
        "action": None,
        "entity_id": None,
        "entity_name": None,
        "source_schema_name": None,
        "similarity_score": None,
        "reasoning": None,
        "canonical_schema": None,
        "field_mappings": None,
        "error": None
    }

    try:
        # Run the graph
        config = {"configurable": {"thread_id": request["incoming_schema"]["hash"]}}
        final_state = await graph.ainvoke(initial_state, config)

        # Extract the final response
        if "final_response" in final_state:
            return final_state["final_response"]
        else:
            # Build response from state if prepare_response didn't run
            # Ensure action is always set
            if not final_state.get("action"):
                logger.warning("Action not set in final state, defaulting to 'create_new'")
                final_state["action"] = "create_new"

            return _validate_response({
                "action": final_state.get("action", "create_new"),
                "entity_id": final_state.get("entity_id"),
                "entity_name": final_state.get("entity_name", f"Entity_{final_state['incoming_schema']['hash'][:8]}"),
                "source_schema_name": final_state.get("source_schema_name", final_state["incoming_schema"].get("name", "unknown")),
                "similarity_score": final_state.get("similarity_score"),
                "reasoning": final_state.get("reasoning", "Schema analyzed"),
                "canonical_schema": final_state.get("canonical_schema", {"fields": []}),
                "field_mappings": final_state.get("field_mappings", [])
            }, final_state)

    except Exception as e:
        logger.error(
            "Schema analysis failed",
            schema_hash=request["incoming_schema"]["hash"],
            error=str(e),
            exc_info=True
        )
        # Return error response
        return _create_error_response(
            {"incoming_schema": request["incoming_schema"]},
            str(e)
        )