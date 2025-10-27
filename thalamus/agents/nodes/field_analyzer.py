"""Field analyzer node for deep field type and pattern analysis."""

import json
import structlog
from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, SystemMessage
from agents.llm_config import get_bedrock_llm

logger = structlog.get_logger()


async def analyze_fields(state: Dict[str, Any]) -> Dict[str, Any]:
    """
    Analyze each field in the incoming schema to understand:
    - Actual data types beyond basic detection
    - Format patterns (dates, phone numbers, addresses)
    - Composite fields that should be split
    - Data quality issues
    """
    logger.info("Starting field analysis", schema_hash=state["incoming_schema"]["hash"])

    # Initialize Bedrock client with configured credentials
    llm = get_bedrock_llm(temperature=0.2, max_tokens=4096)

    # Build the analysis prompt
    prompt = _build_field_analysis_prompt(
        state["incoming_schema"]["detected_fields"],
        state["incoming_schema"].get("sample_data", [])
    )

    messages = [
        SystemMessage(content="""You are a data engineering expert specializing in field type analysis and data quality assessment.
Your task is to deeply analyze each field in the schema and identify:
1. True data types and formats
2. Composite fields that violate normalization (like full names, addresses)
3. Data quality issues
4. Format patterns and constraints

Respond with a JSON object only, no markdown or explanations."""),
        HumanMessage(content=prompt)
    ]

    try:
        response = await llm.ainvoke(messages)
        field_analysis = json.loads(response.content)

        # Update state with analysis results
        state["field_analysis"] = field_analysis
        state["processing_history"].append("field_analysis_completed")

        logger.info(
            "Field analysis completed",
            schema_hash=state["incoming_schema"]["hash"],
            composite_fields_found=len(field_analysis.get("composite_fields", [])),
        )

        return state

    except Exception as e:
        logger.error(
            "Field analysis failed",
            schema_hash=state["incoming_schema"]["hash"],
            error=str(e)
        )
        state["error"] = f"Field analysis failed: {str(e)}"
        return state


def _build_field_analysis_prompt(fields: List[Dict], sample_data: List[Dict]) -> str:
    """Build the prompt for field analysis."""

    prompt = f"""Analyze the following schema fields and sample data:

## Detected Fields:
{json.dumps(fields, indent=2)}

## Sample Data (first 5 records):
{json.dumps(sample_data[:5], indent=2)}

## Analysis Required:

Examine each field and provide a detailed analysis including:

1. **Field Type Assessment**: Beyond basic type detection, identify:
   - Specific formats (ISO8601 dates, phone numbers, emails, URLs)
   - Numeric precision and scale
   - String patterns (UUID, postal codes, IDs)

2. **Composite Field Detection**: Identify fields that contain multiple data points:
   - Full names (should be first_name, last_name)
   - Complete addresses (should be street, city, state, zip)
   - Combined date-time strings
   - Any field with delimiters suggesting multiple values

3. **Data Quality Issues**:
   - Inconsistent formats within the same field
   - Fields that should be different types
   - Missing or null patterns

4. **Suggested Improvements**:
   - How composite fields should be split
   - Type conversions needed
   - Format standardizations required

Return your analysis as a JSON object with this structure:
{{
    "field_details": [
        {{
            "name": "field_name",
            "detected_type": "string",
            "actual_type": "full_name",  // or "address", "datetime", "phone", etc.
            "format_pattern": "First Last",
            "is_composite": true,
            "composite_components": ["first_name", "last_name"],
            "quality_issues": ["inconsistent_casing", "missing_middle_names"],
            "sample_values": ["John Smith", "Jane Doe"]
        }}
    ],
    "composite_fields": [
        {{
            "field": "name",
            "should_split_to": ["first_name", "middle_name", "last_name"],
            "split_pattern": "space_delimited"
        }}
    ],
    "type_corrections": [
        {{
            "field": "date",
            "current_type": "string",
            "correct_type": "datetime",
            "format": "YYYY-MM-DD"
        }}
    ],
    "overall_quality_score": 0.75,
    "recommendations": [
        "Split the 'name' field into first_name and last_name",
        "Convert date strings to proper datetime type"
    ]
}}"""

    return prompt