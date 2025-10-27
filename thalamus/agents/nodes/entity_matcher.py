"""Entity matcher node for comparing against existing canonical entities."""

import json
import structlog
from typing import Dict, Any, List
from agents.llm_config import get_bedrock_llm
from langchain_core.messages import HumanMessage, SystemMessage

logger = structlog.get_logger()


async def match_entities(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compare the incoming schema against existing canonical entities to determine:
    - Whether to map to an existing entity or create new
    - Similarity scores for each existing entity
    - Best match recommendation
    """
    logger.info(
        "Starting entity matching",
        schema_hash=state["incoming_schema"]["hash"],
        existing_entities_count=len(state["existing_entities"])
    )

    # Skip if no existing entities
    if not state["existing_entities"]:
        logger.info("No existing entities to match against")
        state["entity_match_results"] = {
            "best_match": None,
            "should_create_new": True,
            "reason": "No existing canonical entities in the system"
        }
        state["processing_history"].append("entity_matching_skipped")
        return state

    # Initialize Bedrock client
    llm = get_bedrock_llm(temperature=0.1, max_tokens=4096)

    # Build the matching prompt
    prompt = _build_entity_matching_prompt(
        state["incoming_schema"],
        state["existing_entities"],
        state.get("field_analysis", {})
    )

    messages = [
        SystemMessage(content="""You are a data architect expert in entity matching and schema comparison.
Your task is to determine if an incoming schema should map to an existing canonical entity or if a new entity should be created.
Consider semantic meaning, business context, and data structure compatibility.

Key principles:
- Entities should represent the same business concept to be matched
- Field overlap of 75%+ with same semantic meaning suggests a match
- Different business contexts warrant separate entities even with similar fields
- Consider the normalized form of fields (after splitting composites)

Respond with a JSON object only, no markdown or explanations."""),
        HumanMessage(content=prompt)
    ]

    try:
        response = await llm.ainvoke(messages)

        # Try to parse the JSON response
        try:
            match_results = json.loads(response.content)
        except json.JSONDecodeError as json_err:
            logger.warning(
                "Failed to parse LLM JSON response, attempting to extract JSON",
                error=str(json_err),
                response_content=response.content[:500]  # Log first 500 chars
            )
            # Try to extract JSON from the response if it's wrapped in text
            import re
            json_match = re.search(r'\{.*\}', response.content, re.DOTALL)
            if json_match:
                try:
                    match_results = json.loads(json_match.group())
                except:
                    # Fallback to default
                    match_results = {"best_match": None, "candidates": []}
            else:
                match_results = {"best_match": None, "candidates": []}

        # Update state with matching results
        state["entity_match_results"] = match_results

        # Set action based on results - ensure action is always set
        if match_results.get("best_match") and match_results["best_match"].get("similarity_score", 0) >= 75:
            state["action"] = "map_to_existing"
            state["entity_id"] = match_results["best_match"]["entity_id"]
            state["similarity_score"] = match_results["best_match"]["similarity_score"]
        else:
            state["action"] = "create_new"
            state["entity_id"] = None
            state["similarity_score"] = None

        state["processing_history"].append("entity_matching_completed")

        logger.info(
            "Entity matching completed",
            schema_hash=state["incoming_schema"]["hash"],
            action=state["action"],
            best_match_score=match_results.get("best_match", {}).get("similarity_score", 0) if match_results.get("best_match") else 0
        )

        return state

    except Exception as e:
        logger.error(
            "Entity matching failed",
            schema_hash=state["incoming_schema"]["hash"],
            error=str(e),
            exc_info=True
        )
        # Always set action even on error
        state["error"] = f"Entity matching failed: {str(e)}"
        state["action"] = "create_new"  # Default to creating new on error
        state["entity_id"] = None
        state["similarity_score"] = None
        state["processing_history"].append("entity_matching_failed")
        return state


def _build_entity_matching_prompt(
    incoming_schema: Dict,
    existing_entities: List[Dict],
    field_analysis: Dict
) -> str:
    """Build the prompt for entity matching."""

    # Include field analysis insights if available
    composite_fields = field_analysis.get("composite_fields", []) if field_analysis else []

    prompt = f"""Compare the incoming schema against existing canonical entities to determine the best match.

## Incoming Schema:
Name: {incoming_schema['name']}
Fields: {json.dumps(incoming_schema['detected_fields'], indent=2)}
Sample Data: {json.dumps(incoming_schema.get('sample_data', [])[:2], indent=2)}

## Field Analysis Insights:
Composite fields to be normalized: {json.dumps(composite_fields, indent=2)}

## Existing Canonical Entities:
"""

    for entity in existing_entities:
        prompt += f"""
### Entity: {entity['name']} (ID: {entity['id']})
Fields: {json.dumps(entity['fields'], indent=2)}
"""

    prompt += """

## Matching Task:

For each existing entity, calculate:
1. **Field Overlap**: How many fields match semantically (not just by name)
2. **Business Context Match**: Does it represent the same business concept?
3. **Data Type Compatibility**: Are the field types compatible?
4. **Transformation Feasibility**: Can the incoming data be transformed to fit?

Consider that the incoming schema fields will be normalized (composite fields split) before mapping.

Return your analysis as a JSON object:
{
    "entity_comparisons": [
        {
            "entity_id": 1,
            "entity_name": "Customer",
            "similarity_score": 85,
            "matching_fields": ["name->first_name,last_name", "email", "phone"],
            "missing_fields": ["address"],
            "extra_fields": ["company_name"],
            "semantic_match": true,
            "business_context_match": true,
            "recommendation": "Good match - same business concept with high field overlap"
        }
    ],
    "best_match": {
        "entity_id": 1,
        "entity_name": "Customer",
        "similarity_score": 85,
        "confidence": 0.9
    },
    "should_create_new": false,
    "reason": "Incoming schema matches Customer entity with 85% similarity",
    "alternative_matches": [
        {
            "entity_id": 2,
            "entity_name": "Contact",
            "similarity_score": 65,
            "reason": "Partial match but different business context"
        }
    ]
}

If no good match exists (similarity < 75%), set "should_create_new": true and "best_match": null."""

    return prompt