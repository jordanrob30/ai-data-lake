# Handle ID Sanitization Fix

## Issues Identified from Error Messages

### 1. Handle Format Mismatches
- **Problem**: Edge handle IDs were using old format with hyphens (e.g., `customer-created_at`)
- **Expected**: Double underscore format (e.g., `customer__created_at`)
- **Cause**: Existing edges from database had old format

### 2. Special Characters in Field Names
- **Problem**: Fields with dots weren't sanitized (e.g., `properties.firstname`)
- **Expected**: All special chars converted to underscores (e.g., `properties_firstname`)
- **Errors**: "Couldn't create edge for source handle id: 2d0ec41da5ed132f-properties.firstname"

### 3. Formula Edges Not Connecting
- **Problem**: Formula node edges to silver entities weren't connecting properly
- **Cause**: Existing formula edges had incorrect handle IDs that weren't being corrected

## Solution Implemented

### 1. Applied Edge Sanitization on Load
```typescript
// DashboardCanvas.tsx
const sanitizedFlowData = {
  nodes: flowData?.nodes || [],
  edges: sanitizeEdgeHandleIds(flowData?.edges || []), // NOW SANITIZING!
};
```

### 2. Fixed Existing Formula/Connection Edge Handles
```typescript
// For edges from grouped nodes to intermediate nodes
if (isGroupedToIntermediate) {
  const properSourceHandle = generateSourceHandleId(sourceSchemaHash, sourceFieldName);
  // Override any existing incorrect handle
  edge.sourceHandle = properSourceHandle;
}

// For edges from intermediate nodes to entities
if (isIntermediateToEntity) {
  const properTargetHandle = generateTargetHandleId(targetEntityLabel, targetFieldName);
  // Override any existing incorrect handle
  edge.targetHandle = properTargetHandle;
}
```

### 3. Added Debug Logging
```typescript
// Log handle mismatches for debugging
if (edge.targetHandle !== properTargetHandle) {
  console.log(`[Handle Mismatch] Edge ${edge.id}:
    old="${edge.targetHandle}", new="${properTargetHandle}"`);
}
```

## Handle ID Format

### Before (Incorrect)
- `customer-created_at` (hyphen separator)
- `2d0ec41da5ed132f-properties.firstname` (dots in field name)
- `customer-` (empty field name)

### After (Correct)
- `customer__created_at` (double underscore)
- `2d0ec41da5ed132f__properties_firstname` (sanitized dots)
- `customer__field` (proper field name required)

## What sanitizeEdgeHandleIds Does

1. **Detects old format**: `prefix-field` or `prefix_field`
2. **Converts to new format**: `prefix__field`
3. **Sanitizes special characters**: Dots, hyphens, spaces → underscores
4. **Preserves formula node handles**: Leaves `input`/`output` unchanged

## Files Modified

1. **`/platform/resources/js/components/Dashboard/DashboardCanvas.tsx`**
   - Added import for `sanitizeEdgeHandleIds`
   - Applied sanitization to incoming edges

2. **`/platform/resources/js/utils/edgeHelpers.ts`**
   - Fixed handle generation for existing formula/connection edges
   - Added logging for handle mismatches
   - Override incorrect handles with properly generated ones

## Result

✅ **Edges now connect properly to:**
- Field-specific handles on bronze schemas
- Field-specific handles on silver entities
- Formula and connection nodes with correct routing

✅ **No more console errors about missing handles**

✅ **Visual improvements:**
- All formula nodes properly connected
- Field-to-field mappings clearly visible
- 3-column layout maintained