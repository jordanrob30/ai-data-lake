# Formula Node Connection and Edge Overlap Fix

## Issues Fixed

### 1. Formula Nodes Not Connected
**Problem**: Formula nodes were floating disconnected in the visualization
**Cause**: When existing formula/connection nodes were in the flow, edges connecting to them weren't getting proper handle IDs
**Solution**: Updated edge processing for existing intermediate nodes to add field-specific handle IDs

### 2. Edge Overlap
**Problem**: Too many overlapping edges making the visualization hard to follow
**Solution**: Changed edge styling and routing for cleaner visualization

## Code Changes

### Formula/Connection Node Edge Fix
In `generateFieldLevelView` function, added logic to handle existing formula/connection nodes:

```typescript
// For edges from grouped schemas to intermediate nodes
if (isGroupedToIntermediate) {
  // Extract field names from intermediate node
  sourceFieldName = intermediateNode.data.sourceField

  // Get schema hash for handle generation
  sourceSchemaHash = matchingSchema?.hash

  // Add source handle to edge
  sourceHandle: generateSourceHandleId(sourceSchemaHash, sourceFieldName)
}

// For edges from intermediate nodes to entities
if (isIntermediateToEntity) {
  // Extract field names from intermediate node
  targetFieldName = intermediateNode.data.targetField

  // Get entity label for handle generation
  targetEntityLabel = targetNode.data?.label

  // Add target handle to edge
  targetHandle: generateTargetHandleId(targetEntityLabel, targetFieldName)
}
```

### Edge Styling Improvements
Changed all field-level edges from `smoothstep` to `default` type for cleaner routing:

```typescript
// Before
type: 'smoothstep',
style: {
  stroke: typeColor,
  strokeWidth: 2,
}

// After
type: 'default',  // Straight lines reduce overlap
style: {
  stroke: typeColor,
  strokeWidth: 1.5,  // Thinner lines for less visual weight
  strokeDasharray: '0',
}
markerEnd: {
  type: MarkerType.ArrowClosed,
  color: typeColor,
  width: 15,  // Smaller arrows
  height: 15,
}
```

## Visual Improvements

### Before
- Formula nodes floating unconnected
- Thick overlapping smoothstep edges
- Hard to trace individual field mappings

### After
- Formula nodes properly connected between fields
- Cleaner straight-line edges with less overlap
- Each field connection clearly visible
- Thinner lines with smaller arrowheads

## Edge Flow Pattern
```
Bronze Field → [Connection/Formula Node] → Silver Field
    ↓                    ↓                      ↓
Field Handle      No Handles            Field Handle
(specified)       (internal)            (specified)
```

## Files Modified
- `/platform/resources/js/utils/edgeHelpers.ts`
  - Lines 72-139: Handle existing intermediate nodes
  - Lines 203-245: Update connection node edge styling
  - Lines 331-377: Update formula node edge styling
  - Lines 396-442: Update additional connection node edges

## Result
- All formula nodes now properly connected
- Reduced visual clutter from edge overlap
- Cleaner, more readable field-to-field mapping visualization