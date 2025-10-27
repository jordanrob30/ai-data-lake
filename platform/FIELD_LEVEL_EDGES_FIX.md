# Field-Level Edge Connection Fix

## Problem
Edges were connecting at the node level (one edge per node) instead of field level (one edge per field mapping).

## Solution
Fixed the edge handle IDs to properly connect to individual field handles on both bronze schemas and silver entities.

## Key Changes

### 1. Proper Handle ID Generation
- **Bronze (Source) Handles**: Using `generateSourceHandleId(hash, fieldName)` format
  - Example: `09f6b8bf91b890db__first_name`
- **Silver (Target) Handles**: Using `generateTargetHandleId(label, fieldName)` format
  - Example: `customer__first_name`

### 2. Updated Edge Creation in `edgeHelpers.ts`
```typescript
// For edges connecting to bronze schemas (source)
sourceHandle: generateSourceHandleId(sourceSchemaHash, sourceFieldName)

// For edges connecting to silver entities (target)
targetHandle: generateTargetHandleId(targetEntityLabel, targetFieldName)
```

### 3. Data Extraction
- Extract schema hash from grouped node's matching schema
- Extract entity label from target node data
- Pass these to handle ID generation functions

## Visual Result

### Before (Incorrect)
```
[Bronze Schema] ─────→ [Silver Entity]
   Field A                Field A
   Field B                Field B
   Field C                Field C
```
One edge connecting the entire nodes

### After (Correct)
```
[Bronze Schema]         [Silver Entity]
   Field A ─→ [🔌] ─→     Field A
   Field B ─→ [fx] ─→     Field B
   Field C ─→ [🔌] ─→     Field C
```
Individual edges per field mapping through connection/formula nodes

## How It Works

1. **GroupedSourceSchemaNode** creates handles with IDs like:
   - `{schemaHash}__{fieldName}` using `generateSourceHandleId()`

2. **EntitySchemaDetailNode** creates handles with IDs like:
   - `{entityLabel}__{fieldName}` using `generateTargetHandleId()`

3. **Edge Creation** in `edgeHelpers.ts`:
   - Extracts source schema hash (from grouped node's active schema)
   - Extracts target entity label (from entity node data)
   - Creates edges with proper handle IDs to connect specific fields

4. **Connection/Formula Nodes**:
   - Act as intermediaries between bronze and silver
   - Don't specify handle IDs (use default handles)
   - Positioned in middle column by dagre algorithm

## Files Modified
- `/platform/resources/js/utils/edgeHelpers.ts` - Fixed handle ID generation for edges
- Previous fixes remain in place (infinite loop, node type preservation)