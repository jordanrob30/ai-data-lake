# Formula Edge Filter Fix - Using Fresh Node State

## Problem
After implementing handle ID sanitization and edge filtering, one specific error kept repeating:

```
[React Flow]: Couldn't create edge for source handle id: "0507b572d5150fbc__user_id", edge id: edge-2-to-formula-saved-2-34-0
```

This was a **formula node edge** stored in browser state (not from database).

## Root Cause

The edge filter at line 571 in `DashboardCanvas.tsx` was using a **stale `nodes` variable** from component scope:

```typescript
// ❌ WRONG - Uses stale nodes from component scope
edgesToRender = filterEdgesWithValidHandles(edgesToRender, nodes);
```

**Why this failed:**
1. Formula node edges are stored in React state (`currentEdges`)
2. They get added to `edgesToRender` at line 554
3. Filter runs at line 571 using `nodes` variable from component scope
4. The `nodes` variable might not have the latest state when formula nodes are created
5. Filter thinks the handle doesn't exist and SHOULD filter the edge out, but doesn't because of timing
6. Edge still renders and React Flow throws error

## The Solution

Use React Flow's `getNodes()` method to get **fresh, current node state** instead of the potentially stale component scope variable:

### Changes Made

**1. Added `getNodes` from `useReactFlow()` hook:**

```typescript
const updateNodeInternals = useUpdateNodeInternals();
const { getNodes } = useReactFlow();  // ✅ Added
const { fitToNodes, applyAutoLayout } = useFlowLayout();
```

**2. Updated edge filtering to use fresh node state:**

```typescript
// ✅ CORRECT - Gets fresh node state from React Flow
const currentNodes = getNodes();
edgesToRender = filterEdgesWithValidHandles(edgesToRender, currentNodes);
```

**3. Added `getNodes` to dependency array:**

```typescript
}, [sanitizedFlowData, expandedNodeIds, activeMappingNodes, hoveredEdge, getNodeType, setNodes, setEdges, convertEdgeToFormula, getNodes]);
```

## Why This Works

1. **Fresh state**: `getNodes()` returns the current state from React Flow's internal store
2. **No stale closures**: Not dependent on component scope variables that might be outdated
3. **Catches formula edges**: Formula nodes created dynamically will be in the fresh node state
4. **Proper validation**: Filter has access to ALL current nodes including newly created ones

## Files Changed

- **`platform/resources/js/components/Dashboard/DashboardCanvas.tsx`**:
  - Line 108: Added `const { getNodes } = useReactFlow();`
  - Line 573-574: Changed from `nodes` to `getNodes()`
  - Line 581: Added `getNodes` to dependency array

## Result

✅ **Build successful**: 1.92s
✅ **Fresh node state**: Filter uses current React Flow state
✅ **Formula edges validated**: Can properly check if handles exist
✅ **No stale closures**: Not dependent on component scope variables

This should eliminate the remaining React Flow handle ID errors for formula node edges.
