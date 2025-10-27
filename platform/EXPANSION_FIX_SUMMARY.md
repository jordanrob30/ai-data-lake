# Node Expansion Fix Summary

## Issue
When expanding a bronze (source schema) node, the detailed field-level edges and formula nodes between the bronze schema and connected silver entities were not showing up. Only the high-level edge was visible.

## Root Cause
The edge rendering logic was only processing edges from `flowData` (original edges from the server) and not including the dynamically created formula edges stored in the component's edge state. Additionally, formula edges were being filtered out incorrectly.

## Solution

### 1. Include Current Edge State
Modified the edge processing to include both:
- Original edges from `flowData` (server data)
- Dynamically created edges from user interactions (formula edges)

```typescript
// First, get all current edges including dynamically created formula edges
const currentEdges = edges; // This includes formula edges created by user

// Process original flowData edges
flowData.edges.forEach(edge => {
  // ... handle original edges
});

// Add formula edges that exist in current state but not in flowData
currentEdges.forEach(edge => {
  const isFormulaRelated = edge.source.startsWith('formula-') || edge.target.startsWith('formula-');
  if (isFormulaRelated) {
    // Add formula edges when appropriate nodes are expanded
  }
});
```

### 2. Proper Formula Edge Visibility
Formula edges are now shown when:
- The source schema node they're connected to is expanded
- Any nodes are expanded (for formula-to-target edges)

### 3. Removed Over-Aggressive Filtering
Removed the secondary filter that was preventing formula edges from appearing even when they should be visible.

## Expected Behavior Now

### When Bronze Node is Collapsed
- Shows compact bronze schema node
- Shows simple high-level edge to silver entity
- No formula nodes or detailed edges visible

### When Bronze Node is Expanded
- Bronze schema shows detailed field handles
- Connected silver entity automatically expands too
- **ALL field-level edges appear** between bronze and silver
- **Formula nodes appear** if any field transformations exist
- **Formula edges connect** properly between fields and formula nodes

### Formula Node Creation Flow
1. Expand a bronze schema node
2. Field-level edges appear
3. Click on a field edge to convert to formula
4. Formula node appears inline with proper connections
5. Formula persists when collapsing/expanding nodes

## Benefits
- ✅ Complete visibility of all mappings when expanded
- ✅ Formula transformations are properly shown
- ✅ Consistent expansion behavior
- ✅ No missing edges or nodes
- ✅ Proper state management between expansions

## Testing Checklist
- ✅ Build succeeds without errors
- ✅ Bronze node expansion shows all edges
- ✅ Formula nodes appear when they exist
- ✅ Formula edges connect properly
- ✅ Collapse hides all details
- ✅ Re-expand restores all connections