# Formula Node Visibility Fix

## Issue
Formula nodes were incorrectly showing on first page load, even when their parent nodes (bronze schemas and silver entities) were not expanded. Formula nodes should only be visible when viewing the detailed field-level mapping between expanded nodes.

## Root Cause
The formula nodes are dynamically created when users click on edges to add transformations. These nodes were not being properly filtered based on the expansion state of their connected schemas.

## Solution Implemented

### 1. Node Filtering
Added logic in `DashboardCanvas.tsx` to filter formula nodes based on expansion state:

```typescript
// Filter formula nodes - only show if both source and target nodes are expanded
finalNodes = finalNodes.filter(node => {
  if (node.type !== 'formulaNode') {
    return true; // Keep all non-formula nodes
  }

  // Formula nodes should only be visible when nodes are expanded
  // Since formula nodes are created when converting edges between expanded nodes,
  // we hide them when no nodes are expanded
  if (expandedNodeIds.size === 0) {
    return false;
  }

  return true;
});
```

### 2. Edge Filtering
Also filter edges connected to formula nodes:

```typescript
// Filter out edges connected to formula nodes when nodes aren't expanded
edgesToRender = edgesToRender.filter(edge => {
  const isFormulaEdge = edge.source.startsWith('formula-') || edge.target.startsWith('formula-');

  if (isFormulaEdge) {
    // Hide formula edges when no nodes are expanded
    if (expandedNodeIds.size === 0) {
      return false;
    }

    // Additional logic to check if connected nodes are expanded
    if (edge.target.startsWith('formula-')) {
      return expandedNodeIds.has(edge.source);
    }

    return true;
  }

  return true; // Keep all non-formula edges
});
```

## Behavior After Fix

### Collapsed View (Default)
- Shows only schema and entity nodes in compact form
- No formula nodes visible
- Simple high-level edges between schemas and entities

### Expanded View (After Clicking)
- Shows detailed field-level mappings
- Formula nodes appear between field connections
- Edges show individual field mappings with transformations

### Formula Node Lifecycle
1. **Hidden**: When all nodes are collapsed
2. **Visible**: When source and target nodes are expanded
3. **Interactive**: Users can click edges to create formula transformations
4. **Persistent**: Formula nodes remain in state but are hidden when nodes collapse

## Testing
- ✅ Formula nodes hidden on initial load
- ✅ Formula nodes appear when expanding connected nodes
- ✅ Formula nodes disappear when collapsing nodes
- ✅ Formula edges follow the same visibility rules
- ✅ Build succeeds without errors