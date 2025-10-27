# Nodes Disappearing Fix

## Problem
After implementing handle ID sanitization, nodes and edges would appear briefly on page load and then immediately disappear.

## Root Cause
The `sanitizedFlowData` object was being created on every render without memoization:

```typescript
// ❌ WRONG - Creates new object on every render
const sanitizedFlowData = {
  ...flowData,
  edges: sanitizeEdgeHandleIds(flowData.edges),
};
```

This caused an infinite loop:
1. Component renders with `sanitizedFlowData`
2. `useEffect` runs (because `sanitizedFlowData` is in dependencies)
3. `useEffect` updates state
4. State update triggers re-render
5. Re-render creates **new** `sanitizedFlowData` object (different reference)
6. Go back to step 2 → infinite loop

The React Flow state would get cleared/reset on each iteration, causing nodes and edges to disappear.

## Solution
Wrap `sanitizedFlowData` in `useMemo` to ensure it only recreates when `flowData` actually changes:

```typescript
// ✅ CORRECT - Only creates new object when flowData changes
const sanitizedFlowData = useMemo(() => ({
  ...flowData,
  edges: sanitizeEdgeHandleIds(flowData.edges),
}), [flowData]);
```

## What useMemo Does
- **Memoizes** the sanitized flow data object
- **Returns same reference** on subsequent renders if `flowData` hasn't changed
- **Prevents unnecessary re-renders** of child components and useEffect hooks
- **Breaks the infinite loop** by maintaining stable object reference

## Changes Made
1. Added `useMemo` import to DashboardCanvas.tsx
2. Wrapped `sanitizedFlowData` creation in `useMemo` with `[flowData]` dependency

## Result
✅ Nodes and edges render once and stay visible
✅ No infinite re-render loop
✅ useEffect only runs when flowData actually changes
✅ Better performance - fewer unnecessary renders
