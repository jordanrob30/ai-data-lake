"""Mapping generator node for creating precise JSONata transformation expressions."""

import json
import structlog
from typing import Dict, Any, List
from agents.llm_config import get_bedrock_llm
from langchain_core.messages import HumanMessage, SystemMessage

logger = structlog.get_logger()


async def generate_mappings(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate precise field mappings with JSONata expressions for:
    - Direct field mappings
    - Field splits (names, addresses)
    - Type conversions
    - Format transformations
    - Constant values for metadata
    """
    logger.info(
        "Starting mapping generation",
        schema_hash=state["incoming_schema"]["hash"],
        entity_name=state.get("entity_name", "unknown")
    )

    # Initialize Bedrock client
    llm = get_bedrock_llm(temperature=0.1, max_tokens=8192)

    # Build the mapping generation prompt
    prompt = _build_mapping_prompt(
        state["incoming_schema"],
        state.get("canonical_schema", {}),
        state.get("normalization_suggestions", {}),
        state.get("field_analysis", {})
    )

    messages = [
        SystemMessage(content="""You are an expert in JSONata expressions and data transformation.
Your task is to generate precise field mappings with JSONata formulas for transforming source data to canonical format.

Key JSONata patterns to use:
- Split strings: $split(field, ' ')[0] for first element
- Trim whitespace: $trim(field)
- Extract patterns: $match(field, /regex/)
- Date conversion: $fromMillis($toMillis(field, '[M01]/[D01]/[Y0001]'), '[Y0001]-[M01]-[D01]')
- Conditionals: condition ? true_value : false_value
- Default values: field ? field : 'default'
- Constants: For metadata, use empty source_field and constant transformation

CRITICAL RULES:
1. ALWAYS set source_field to the actual field name being transformed
2. Only use empty source_field ("") for true constant values
3. For splits, source_field must be the composite field being split
4. Each mapping must have either a source field OR be a constant, never neither

Respond with a JSON object only, no markdown or explanations."""),
        HumanMessage(content=prompt)
    ]

    try:
        response = await llm.ainvoke(messages)

        # Try to parse the JSON response
        try:
            mappings_result = json.loads(response.content)
        except json.JSONDecodeError as json_err:
            logger.warning(
                "Failed to parse LLM JSON response, attempting to extract JSON",
                error=str(json_err),
                response_length=len(response.content)
            )
            # Try to extract JSON from the response
            import re
            # Look for the largest JSON object in the response
            json_matches = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response.content, re.DOTALL)
            mappings_result = None
            for match in json_matches:
                try:
                    potential_json = json.loads(match)
                    if "field_mappings" in potential_json:
                        mappings_result = potential_json
                        break
                except:
                    continue

            if not mappings_result:
                # Fallback to empty mappings
                logger.error("Could not extract valid JSON from LLM response")
                mappings_result = {"field_mappings": []}

        # Validate and clean up mappings
        field_mappings = _validate_mappings(mappings_result.get("field_mappings", []))

        # Update state with final mappings
        state["field_mappings"] = field_mappings
        state["processing_history"].append("mapping_generation_completed")

        logger.info(
            "Mapping generation completed",
            schema_hash=state["incoming_schema"]["hash"],
            mappings_count=len(field_mappings),
            formula_mappings=sum(1 for m in field_mappings if m.get("transformation") != "direct")
        )

        return state

    except Exception as e:
        logger.error(
            "Mapping generation failed",
            schema_hash=state["incoming_schema"]["hash"],
            error=str(e)
        )
        state["error"] = f"Mapping generation failed: {str(e)}"
        # Provide basic fallback mappings
        state["field_mappings"] = _generate_fallback_mappings(
            state["incoming_schema"]["detected_fields"],
            state.get("canonical_schema", {}).get("fields", [])
        )
        return state


def _build_mapping_prompt(
    incoming_schema: Dict,
    canonical_schema: Dict,
    normalization_suggestions: Dict,
    field_analysis: Dict
) -> str:
    """Build the prompt for generating mappings."""

    # Get transformation suggestions from normalization
    transformations = normalization_suggestions.get("field_transformations", [])

    prompt = f"""Generate precise JSONata field mappings to transform incoming data to canonical format.

## Incoming Schema:
Fields: {json.dumps(incoming_schema['detected_fields'], indent=2)}
Sample Data: {json.dumps(incoming_schema.get('sample_data', [])[:3], indent=2)}

## Target Canonical Schema:
Fields: {json.dumps(canonical_schema.get('fields', []), indent=2)}

## Required Transformations:
{json.dumps(transformations, indent=2)}

## Field Analysis Insights:
{json.dumps(field_analysis.get('composite_fields', []), indent=2)}

## Generate Mappings:

Create a field mapping for EVERY field in the canonical schema. Use these patterns:

### 1. Direct Mappings (field exists with same/compatible type):
{{
    "source_field": "email",
    "target_field": "email",
    "transformation": "direct",
    "jsonata_formula": "email",
    "confidence": 1.0,
    "explanation": "Direct mapping of email field"
}}

### 2. Name Splitting:
{{
    "source_field": "full_name",
    "target_field": "first_name",
    "transformation": "split",
    "jsonata_formula": "$split($trim(full_name), ' ')[0]",
    "confidence": 0.9,
    "explanation": "Extract first name from full name"
}}
{{
    "source_field": "full_name",
    "target_field": "last_name",
    "transformation": "split",
    "jsonata_formula": "$split($trim(full_name), ' ')[-1]",
    "confidence": 0.9,
    "explanation": "Extract last name from full name"
}}

### 3. Address Parsing:
{{
    "source_field": "address",
    "target_field": "street_address",
    "transformation": "split",
    "jsonata_formula": "$trim($split(address, ',')[0])",
    "confidence": 0.8,
    "explanation": "Extract street from comma-separated address"
}}

### 4. Type Conversion:
{{
    "source_field": "date_string",
    "target_field": "date",
    "transformation": "format_conversion",
    "jsonata_formula": "$fromMillis($toMillis(date_string, '[M01]/[D01]/[Y0001]'), '[Y0001]-[M01]-[D01]')",
    "confidence": 0.95,
    "explanation": "Convert MM/DD/YYYY to ISO date"
}}

### 5. Constant Values (for metadata):
{{
    "source_field": "",
    "target_field": "source_system",
    "transformation": "constant",
    "jsonata_formula": "\\"DataLake\\"",
    "confidence": 1.0,
    "explanation": "Set constant value for source system"
}}
{{
    "source_field": "",
    "target_field": "import_timestamp",
    "transformation": "constant",
    "jsonata_formula": "$now()",
    "confidence": 1.0,
    "explanation": "Set current timestamp for import"
}}

### 6. Complex Extraction:
{{
    "source_field": "phone",
    "target_field": "phone_number",
    "transformation": "formula",
    "jsonata_formula": "$replace(phone, /[^0-9]/g, '')",
    "confidence": 0.85,
    "explanation": "Extract digits from phone number"
}}

Return your complete mapping set as:
{{
    "field_mappings": [
        // One mapping object for each canonical field
        {{
            "source_field": "source_field_name or empty for constants",
            "target_field": "canonical_field_name",
            "transformation": "direct|formula|split|combine|format_conversion|constant",
            "jsonata_formula": "JSONata expression",
            "confidence": 0.0-1.0,
            "explanation": "Why this mapping makes sense"
        }}
    ],
    "unmapped_source_fields": ["fields not used in mapping"],
    "missing_target_fields": ["canonical fields without source data"]
}}

REMEMBER:
- Every canonical field needs a mapping
- Set source_field="" ONLY for constant values
- For splits, source_field must be the composite field
- Escape quotes in JSONata strings: \\"value\\"
- Use $now() for timestamps, not string dates"""

    return prompt


def _validate_mappings(mappings: List[Dict]) -> List[Dict]:
    """Validate and clean up generated mappings."""
    validated = []

    # Valid transformation types as per schema
    VALID_TRANSFORMATIONS = {
        "direct", "formula", "split", "combine", "format_conversion", "constant"
    }

    # Map common LLM-generated transformations to valid types
    TRANSFORMATION_MAPPING = {
        "extract": "formula",  # Extraction is done via formula
        "uppercase": "formula",  # Case conversion is a formula
        "lowercase": "formula",
        "trim": "formula",
        "unix_to_datetime": "format_conversion",  # Unix timestamp conversion
        "date_format": "format_conversion",
        "parse": "formula",
        "concat": "combine",
        "concatenate": "combine",
        "merge": "combine",
        "join": "combine",
    }

    for mapping in mappings:
        # Ensure required fields exist
        if not mapping.get("target_field"):
            continue

        # Normalize transformation type
        transformation = mapping.get("transformation", "direct").lower()

        # Map non-standard transformations to valid ones
        if transformation not in VALID_TRANSFORMATIONS:
            transformation = TRANSFORMATION_MAPPING.get(transformation, "formula")
            logger.debug(
                f"Mapped transformation '{mapping.get('transformation')}' to '{transformation}'"
            )

        mapping["transformation"] = transformation

        if "confidence" not in mapping:
            mapping["confidence"] = 0.8

        if "jsonata_formula" not in mapping or not mapping["jsonata_formula"]:
            # Generate simple formula for direct mappings
            if mapping["transformation"] == "direct" and mapping.get("source_field"):
                mapping["jsonata_formula"] = mapping["source_field"]
            elif mapping["transformation"] == "constant":
                mapping["jsonata_formula"] = '""'  # Empty constant as fallback

        # Validate source_field
        if "source_field" not in mapping:
            mapping["source_field"] = ""

        validated.append(mapping)

    return validated


def _generate_fallback_mappings(
    source_fields: List[Dict],
    target_fields: List[Dict]
) -> List[Dict]:
    """Generate basic fallback mappings when AI fails."""
    mappings = []

    # Create a map of source fields by name
    source_map = {f["name"]: f for f in source_fields}

    for target_field in target_fields:
        target_name = target_field["name"]

        # Try direct name match first
        if target_name in source_map:
            mappings.append({
                "source_field": target_name,
                "target_field": target_name,
                "transformation": "direct",
                "jsonata_formula": target_name,
                "confidence": 0.9,
                "explanation": "Direct field name match"
            })
        # Try common variations
        elif target_name.replace("_", "") in source_map:
            source_name = target_name.replace("_", "")
            mappings.append({
                "source_field": source_name,
                "target_field": target_name,
                "transformation": "direct",
                "jsonata_formula": source_name,
                "confidence": 0.7,
                "explanation": "Field name match with underscore variation"
            })
        # Default to null for missing fields
        else:
            mappings.append({
                "source_field": "",
                "target_field": target_name,
                "transformation": "constant",
                "jsonata_formula": "null",
                "confidence": 0.5,
                "explanation": "No matching source field found"
            })

    return mappings