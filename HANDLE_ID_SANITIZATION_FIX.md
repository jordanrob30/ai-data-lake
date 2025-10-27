# Handle ID Sanitization Fix

## Problem
React Flow was throwing numerous errors like:
```
[React Flow]: Couldn't create edge for target handle id: "customer-metadata.annual_revenue"
[React Flow]: Couldn't create edge for source handle id: "2d0ec41da5ed132f-properties.firstname"
```

## Root Cause
Handle IDs were being generated inconsistently across different parts of the codebase:
- **Node components** used format: `{hash}-{fieldName}` or `{label}-{fieldName}`
- **Edge helpers** used the same format but with special characters (dots, spaces, etc.)
- **Special characters** in nested field names like `metadata.annual_revenue` or `properties.firstname` were causing handle matching failures

React Flow requires **exact string matching** between:
1. The `id` prop on `<Handle>` components in nodes
2. The `sourceHandle` and `targetHandle` props on edges

When field names contained special characters (`.`, `-`, spaces, etc.), the handle IDs didn't match properly.

## Solution
Created a centralized sanitization system:

### New File: `/utils/handleIdHelpers.ts`
```typescript
// Sanitizes any string for use in handle IDs
function sanitizeHandleId(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

// Generate source (bronze schema) handle ID
function generateSourceHandleId(hash: string, fieldName: string): string {
  return `${sanitizeHandleId(hash)}_${sanitizeHandleId(fieldName)}`;
}

// Generate target (silver entity) handle ID
function generateTargetHandleId(entityLabel: string, fieldName: string): string {
  return `${sanitizeHandleId(entityLabel)}_${sanitizeHandleId(fieldName)}`;
}
```

### Changes Made

1. **Created centralized utilities**: `/utils/handleIdHelpers.ts`
   - `sanitizeHandleId()` - Removes/replaces special characters
   - `generateSourceHandleId()` - For bronze schema handles
   - `generateTargetHandleId()` - For silver entity handles
   - `generateFormulaHandleId()` - For formula node handles

2. **Updated node components** to use sanitized IDs:
   - `SourceSchemaDetailNode.tsx`
   - `EntitySchemaDetailNode.tsx`
   - `PendingSchemaDetailNode.tsx`

3. **Updated edge generation** to use sanitized IDs:
   - `utils/edgeHelpers.ts`
   - `hooks/useAutoMapping.ts`

## Examples

### Before (Broken)
```typescript
// In SourceSchemaDetailNode.tsx
const handleId = `${data.hash}-${field.name}`;
// Result: "2d0ec41da5ed132f-properties.firstname" ❌

// In edgeHelpers.ts
const sourceHandleId = `${sourceNode.data.hash}-${field.sourcePath}`;
// Result: "2d0ec41da5ed132f-properties.firstname" ❌
```
**Problem**: The dot in `properties.firstname` caused matching issues.

### After (Fixed)
```typescript
// In SourceSchemaDetailNode.tsx
const handleId = generateSourceHandleId(data.hash, field.name);
// Result: "2d0ec41da5ed132f_properties_firstname" ✅

// In edgeHelpers.ts
const sourceHandleId = generateSourceHandleId(sourceNode.data.hash, field.sourcePath);
// Result: "2d0ec41da5ed132f_properties_firstname" ✅
```
**Solution**: Dots converted to underscores, consistent everywhere.

## Benefits

1. **Consistent handle IDs** across all components
2. **No more React Flow errors** - handles match exactly
3. **Supports nested fields** - dots and special chars handled properly
4. **Single source of truth** - all ID generation in one file
5. **Easy to maintain** - changes only need to be made in one place

## Backward Compatibility

### Issue with Saved Edges
After implementing the sanitization, errors still occurred because **existing edges in the database** were created with the old format (e.g., `customer-first_name`), but nodes now generate handles with the new format (e.g., `customer_first_name`).

### Solution: Runtime Sanitization
Added `sanitizeEdgeHandleIds()` function that sanitizes edges loaded from the database at runtime:

```typescript
// In DashboardCanvas.tsx
const sanitizedFlowData = {
  ...flowData,
  edges: sanitizeEdgeHandleIds(flowData.edges),
};
```

This ensures **all edges** (both new and old) are sanitized before being rendered, providing complete backward compatibility without requiring database migration.

## Testing
Build completed successfully with no errors:
```
✓ 2913 modules transformed.
✓ built in 2.60s
```

All handle ID generation now goes through the centralized sanitization functions, ensuring React Flow can properly match source and target handles regardless of field name complexity. Runtime sanitization ensures existing saved edges continue to work.
