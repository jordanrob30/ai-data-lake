"""Schema normalizer node for creating properly normalized canonical schemas."""

import json
import structlog
from typing import Dict, Any, List
from agents.llm_config import get_bedrock_llm
from langchain_core.messages import HumanMessage, SystemMessage

logger = structlog.get_logger()


async def normalize_schema(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create a properly normalized canonical schema by:
    - Splitting composite fields into atomic components
    - Standardizing field names and types
    - Adding necessary metadata fields
    - Following data warehouse best practices
    """
    logger.info(
        "Starting schema normalization",
        schema_hash=state["incoming_schema"]["hash"],
        action=state.get("action", "unknown")
    )

    # Initialize Bedrock client
    llm = get_bedrock_llm(temperature=0.1, max_tokens=4096)

    # Build normalization prompt based on action
    if state.get("action") == "map_to_existing":
        # Get the target entity structure
        target_entity = _find_entity_by_id(
            state["existing_entities"],
            state.get("entity_id")
        )
        prompt = _build_mapping_normalization_prompt(
            state["incoming_schema"],
            target_entity,
            state.get("field_analysis", {})
        )
    else:
        # Create new canonical schema
        prompt = _build_new_entity_normalization_prompt(
            state["incoming_schema"],
            state.get("field_analysis", {}),
            state.get("entity_match_results", {})
        )

    messages = [
        SystemMessage(content="""You are a data warehouse architect expert in schema normalization and dimensional modeling.
Your task is to design properly normalized canonical schemas following these principles:
- Every field must be atomic (single piece of information)
- Use consistent, descriptive snake_case naming
- Apply proper data types
- Follow dimensional modeling best practices
- Include necessary metadata fields

CRITICAL: Always split composite fields:
- Names → first_name, middle_name, last_name
- Addresses → street_address, city, state, postal_code, country
- Phone numbers → country_code, area_code, number, extension

Respond with a JSON object only, no markdown or explanations."""),
        HumanMessage(content=prompt)
    ]

    try:
        response = await llm.ainvoke(messages)
        normalization_result = json.loads(response.content)

        # Update state with normalization results
        state["normalization_suggestions"] = normalization_result
        state["entity_name"] = normalization_result["entity_name"]
        state["source_schema_name"] = normalization_result["source_schema_name"]
        state["canonical_schema"] = normalization_result["canonical_schema"]
        state["reasoning"] = normalization_result.get("reasoning", "")

        state["processing_history"].append("normalization_completed")

        logger.info(
            "Schema normalization completed",
            schema_hash=state["incoming_schema"]["hash"],
            entity_name=state["entity_name"],
            canonical_fields_count=len(normalization_result["canonical_schema"]["fields"])
        )

        return state

    except Exception as e:
        logger.error(
            "Schema normalization failed",
            schema_hash=state["incoming_schema"]["hash"],
            error=str(e)
        )
        state["error"] = f"Schema normalization failed: {str(e)}"
        return state


def _find_entity_by_id(entities: List[Dict], entity_id: int) -> Dict:
    """Find an entity by its ID."""
    for entity in entities:
        if entity["id"] == entity_id:
            return entity
    return {}


def _build_mapping_normalization_prompt(
    incoming_schema: Dict,
    target_entity: Dict,
    field_analysis: Dict
) -> str:
    """Build prompt for normalizing schema when mapping to existing entity."""

    prompt = f"""Design field transformations to map the incoming schema to an existing canonical entity.

## Incoming Schema:
Name: {incoming_schema['name']}
Fields: {json.dumps(incoming_schema['detected_fields'], indent=2)}
Sample Data: {json.dumps(incoming_schema.get('sample_data', [])[:2], indent=2)}

## Field Analysis:
{json.dumps(field_analysis, indent=2)}

## Target Canonical Entity:
Name: {target_entity.get('name', 'Unknown')}
Fields: {json.dumps(target_entity.get('fields', []), indent=2)}

## Task:

Design how to transform the incoming schema to fit the canonical entity structure.
Focus on:
1. Splitting composite fields to match atomic canonical fields
2. Data type conversions
3. Format standardizations
4. Handling missing or extra fields

Return a JSON object:
{{
    "entity_name": "{target_entity.get('name', 'Unknown')}",
    "source_schema_name": "descriptive_name_for_bronze_schema",
    "canonical_schema": {{
        "fields": {json.dumps(target_entity.get('fields', []))}
    }},
    "field_transformations": [
        {{
            "source_field": "full_name",
            "target_fields": ["first_name", "last_name"],
            "transformation_type": "split",
            "description": "Split full name into first and last name"
        }}
    ],
    "reasoning": "Explanation of normalization decisions"
}}"""

    return prompt


def _build_new_entity_normalization_prompt(
    incoming_schema: Dict,
    field_analysis: Dict,
    match_results: Dict
) -> str:
    """Build prompt for creating a new normalized canonical entity."""

    prompt = f"""Design a new properly normalized canonical entity schema based on the incoming data.

## Incoming Schema:
Name: {incoming_schema['name']}
Fields: {json.dumps(incoming_schema['detected_fields'], indent=2)}
Sample Data: {json.dumps(incoming_schema.get('sample_data', [])[:2], indent=2)}

## Field Analysis:
{json.dumps(field_analysis, indent=2)}

## Why Creating New Entity:
{match_results.get('reason', 'No matching existing entity found')}

## Normalization Requirements:

1. **Split ALL Composite Fields**:
   - "name" or "full_name" → first_name, middle_name, last_name
   - "address" → street_address, unit_number, city, state_province, postal_code, country_code
   - "phone" → country_code, area_code, phone_number, extension

2. **Standardize Field Names**:
   - Use descriptive snake_case
   - Be specific (customer_first_name not fname)
   - Follow data warehouse conventions

3. **Apply Proper Types**:
   - Dates: datetime or date type
   - Numbers: integer or decimal with precision
   - Identifiers: string with format constraints
   - Booleans: boolean type

4. **Add Metadata Fields** (if appropriate):
   - source_system
   - created_at
   - updated_at
   - is_active

Return a JSON object:
{{
    "entity_name": "ProperPascalCaseName",  // e.g., Customer, Order, Product
    "source_schema_name": "descriptive_bronze_name",  // e.g., shopify_orders, stripe_payments
    "canonical_schema": {{
        "fields": [
            {{
                "name": "field_name",
                "type": "string|integer|decimal|datetime|boolean",
                "required": true|false,
                "format": "optional_format"
            }}
        ]
    }},
    "field_transformations": [
        {{
            "source_field": "name",
            "target_fields": ["first_name", "last_name"],
            "transformation_type": "split",
            "description": "Split full name"
        }}
    ],
    "reasoning": "Explanation of design decisions and why this structure was chosen"
}}

REMEMBER: The canonical schema should be designed for long-term use in a data warehouse, not just for this specific source."""

    return prompt