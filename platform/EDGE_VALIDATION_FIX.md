# Edge Validation Fix for Formula/Connection Nodes

## Problem
Formula and connection nodes were creating edges with undefined handles when field information was missing from the intermediate node data, causing React Flow errors:
- `Couldn't create edge for target handle id: "customer__annual_revenue"`
- Handle mismatches showing "undefined" for new handles

## Root Cause
The `generateFieldLevelView` function in `edgeHelpers.ts` was:
1. Creating edges even when sourceFieldName or targetFieldName were empty/undefined
2. Not validating if target fields actually exist on the entity
3. Adding edges with undefined handles which React Flow couldn't connect

## Solution Implemented

### Added Three Levels of Validation

1. **Source Edge Validation** (Bronze → Intermediate)
   ```typescript
   // Skip edge if we don't have the necessary field information
   if (!sourceFieldName || !sourceSchemaHash) {
     console.warn(`Skipping edge: missing source field or schema hash`);
     return;
   }
   ```

2. **Target Edge Validation** (Intermediate → Silver)
   ```typescript
   // Skip edge if we don't have the necessary field information
   if (!targetFieldName || !targetEntityLabel) {
     console.warn(`Skipping edge: missing target field or entity label`);
     return;
   }
   ```

3. **Field Existence Validation**
   ```typescript
   // Check if target field exists on the entity
   const targetFieldExists = targetFields.some((tf: any) =>
     tf.name === targetFieldName ||
     tf.name.toLowerCase() === targetFieldName.toLowerCase()
   );

   if (!targetFieldExists) {
     console.warn(`Target field "${targetFieldName}" not found on entity`);
     return;
   }
   ```

## What This Prevents

### Before
- Edges added with `sourceHandle: undefined` or `targetHandle: undefined`
- React Flow errors when trying to connect to non-existent handles
- Formula nodes appearing disconnected or partially connected
- Console filled with "Couldn't create edge" errors

### After
- Only valid edges with proper handle IDs are added to the flow
- Edges skipped when field information is missing
- Edges skipped when target fields don't exist on the entity
- Clean console output with informative warnings instead of errors

## Files Modified
- `/platform/resources/js/utils/edgeHelpers.ts` - Lines 99-164
  - Added validation before creating edges
  - Skip edges with missing field information
  - Validate target field existence

## Expected Behavior
1. Formula/connection nodes that have proper field data will connect correctly
2. Formula/connection nodes missing field data will be displayed but not connected
3. No React Flow errors about missing handles
4. Console warnings (not errors) explain why certain edges were skipped

## Testing
- Build completed successfully
- Validation logic prevents undefined handles from being added
- React Flow should no longer show handle connection errors