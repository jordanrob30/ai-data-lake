# AI Schema Mapping Source Field Fix

## Problem Identified
Some formula nodes in the visualization were missing connections from the bronze (source) side. Investigation revealed that the AI was generating field mappings without `source_field` values for transformations that should have them.

## Root Cause
The AI prompt was not explicit enough about when to use `source_field` vs when to leave it empty. This led to scenarios where:
- Split transformations (e.g., splitting "name" into "first_name" and "last_name") had empty source_field
- Formula transformations that read from source fields had empty source_field
- Only constant values should have empty source_field

## Solution Implemented

### 1. Updated AI Prompt Structure
Modified the field_mappings JSON structure documentation to clarify:
```json
{
  "source_field": "name_in_incoming_schema (or empty string '' for constant values)",
  "target_field": "name_in_canonical_schema",
  "transformation": "direct | formula | split | combine | format_conversion | constant",
  // ...
}
```

### 2. Added Critical Field Mapping Rules (Section 6)
Created explicit rules for when to use source_field:

**Regular Field Mappings**: ALWAYS set source_field
- Example: `{"source_field": "customer_name", "target_field": "first_name", ...}`

**Constant Value Mappings**: Set source_field to empty string ONLY for constants
- Example: `{"source_field": "", "target_field": "source_system", "transformation": "constant", "jsonata_formula": "\"HubSpot\""}`
- Use for: source_system, default values, static metadata

**Split Field Mappings**: MUST have source_field set to the composite field
- WRONG: `{"source_field": "", "target_field": "first_name", "jsonata_formula": "$split(name, ' ')[0]"}`
- CORRECT: `{"source_field": "name", "target_field": "first_name", "jsonata_formula": "$split(name, ' ')[0]"}`

### 3. Enhanced Examples
Added Example 4 showing proper constant value usage:
- source_system (constant string)
- import_date (constant function: $now())
- is_active (constant boolean: true)

### 4. Critical Instructions
Added explicit warning at the end:
> CRITICAL: For split/transform operations, ALWAYS set source_field to the field being transformed. Only use empty source_field for true constant values.

## Expected Impact

### Before Fix
- AI might generate: `{"source_field": "", "target_field": "first_name", "jsonata_formula": "$split(name, ' ')[0]"}`
- Result: Formula node has no connection from bronze schema

### After Fix
- AI will generate: `{"source_field": "name", "target_field": "first_name", "jsonata_formula": "$split(name, ' ')[0]"}`
- Result: Formula node properly connected from "name" field in bronze schema

## Visual Representation

### Correct Behavior
```
Bronze Schema              Formula Nodes           Silver Entity
┌─────────────┐           ┌────────────┐          ┌─────────────┐
│ name ────────┼──────────▶│ ƒ first_nm │─────────▶│ first_name  │
│             │           └────────────┘          │             │
│             │           ┌────────────┐          │             │
│             └──────────▶│ ƒ last_nm  │─────────▶│ last_name   │
│                         └────────────┘          │             │
│                         ┌────────────┐          │             │
│                         │ ≡ source   │─────────▶│ source_sys  │
│                         └────────────┘          │             │
└─────────────┘           (no input needed)       └─────────────┘
```

## Files Modified
- `/platform/app/Services/AISchemaService.php` - Enhanced prompt with explicit source_field rules

## Testing Recommendations
1. Trigger new AI schema analysis for existing schemas
2. Verify all split/transform formulas have source_field populated
3. Verify only true constants have empty source_field
4. Check visualization shows proper bronze-to-formula connections