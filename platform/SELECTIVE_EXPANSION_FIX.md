# Selective Node Expansion Fix

## Problem

When clicking on a bronze (source) node that shares a target with other bronze nodes, ALL connected bronze nodes were expanding, not just the clicked one.

### Example Scenario:
```
Bronze A ──┐
           ├──→ Silver Entity X
Bronze B ──┘
```

**Before Fix:**
- Click Bronze A
- Both Bronze A AND Bronze B expanded (incorrect)
- Silver Entity X expanded (correct)

**Expected Behavior:**
- Click Bronze A
- Only Bronze A expands
- Only Silver Entity X expands
- Bronze B stays collapsed

## Root Cause

In `useNodeExpansion.ts`, the expansion logic was bidirectional for both source and entity nodes:

```typescript
// OLD CODE - Bidirectional expansion for all nodes
if (isEntityNode || isSourceNode) {
  edges.forEach(edge => {
    if (edge.source === nodeId) {
      nodesToExpand.add(edge.target);  // Downstream
    }
    if (edge.target === nodeId) {
      nodesToExpand.add(edge.source);  // Upstream - PROBLEM!
    }
  });
}
```

This meant:
- Clicking Bronze A → expand Silver X (correct)
- Silver X expansion → expand ALL sources (Bronze A, B, C...)
- Result: All bronze nodes sharing the target expanded

## Solution

Made expansion **directional** based on node type:

```typescript
// NEW CODE - Directional expansion
if (isSourceNode) {
  // For source/bronze nodes: only expand downstream targets (silver entities)
  // Don't expand other source nodes that share the same target
  edges.forEach(edge => {
    if (edge.source === nodeId) {
      nodesToExpand.add(edge.target);
    }
  });
} else if (isEntityNode) {
  // For entity/silver nodes: expand all connected sources (bronze schemas)
  edges.forEach(edge => {
    if (edge.target === nodeId) {
      nodesToExpand.add(edge.source);
    }
  });
}
```

## Behavior After Fix

### Clicking Bronze Node
✅ **Expands:**
- The clicked bronze node
- Its connected silver entities

❌ **Does NOT expand:**
- Other bronze nodes (even if they share the same target)

### Clicking Silver Entity
✅ **Expands:**
- The clicked silver entity
- ALL connected bronze schemas

❌ **Does NOT expand:**
- Other unrelated entities

## Use Cases

### Multiple Sources → Single Target
```
Bronze Schema A ──┐
Bronze Schema B ──┼──→ Silver Entity (Customer)
Bronze Schema C ──┘
```

**Click Bronze A:**
- ✅ Bronze A expands (detailed view)
- ✅ Customer expands (detailed view)
- ✅ Bronze B stays collapsed
- ✅ Bronze C stays collapsed

**Click Customer:**
- ✅ Customer expands
- ✅ Bronze A expands
- ✅ Bronze B expands
- ✅ Bronze C expands
- (All sources shown because user wants to see what feeds into Customer)

### Single Source → Multiple Targets
```
                    ┌──→ Silver Entity (Customer)
Bronze Schema A ────┼──→ Silver Entity (Order)
                    └──→ Silver Entity (Invoice)
```

**Click Bronze A:**
- ✅ Bronze A expands
- ✅ Customer expands
- ✅ Order expands
- ✅ Invoice expands
- (All targets shown because they're all fed by this source)

### Complex Many-to-Many
```
Bronze A ──┬──→ Silver X
           │
Bronze B ──┼──→ Silver Y
           │
Bronze C ──┴──→ Silver Z
```

**Click Bronze A:**
- ✅ Bronze A expands
- ✅ Silver X expands
- ✅ Silver Y expands
- ❌ Bronze B stays collapsed
- ❌ Bronze C stays collapsed
- ❌ Silver Z stays collapsed

## Logic Summary

### Source/Bronze Node Expansion
**Direction:** Downstream only
**Expands:**
- Self
- All targets (entities it feeds)

**Does NOT Expand:**
- Other sources
- Unconnected entities

### Entity/Silver Node Expansion
**Direction:** Upstream only
**Expands:**
- Self
- All sources (schemas that feed it)

**Does NOT Expand:**
- Other entities
- Downstream consumers (if any)

## Benefits

### ✅ Focused View
- Only see what you clicked and its direct connections
- Not overwhelmed by unrelated nodes
- Easier to trace specific data flows

### ✅ Predictable Behavior
- Click bronze → see where it goes
- Click silver → see where it comes from
- Intuitive directional logic

### ✅ Better for Complex Graphs
- Many bronze schemas → one entity
- Still usable, not chaotic
- Can explore one source at a time

### ✅ Performance
- Fewer nodes to render
- Fewer edges to calculate
- Faster layout recalculation

## Edge Cases Handled

### Already Expanded Nodes
- Clicking again collapses only the related nodes
- Other expanded nodes stay expanded
- Independent expansion states

### Formula Nodes
- Formula nodes between bronze and silver
- Expand with their connected nodes
- Follow the same directional rules

### Multiple Clicks
- Each click is independent
- Can have multiple bronze nodes expanded to same target
- Layout handles it gracefully

## Testing

### Build Status
✅ Build succeeds
✅ No TypeScript errors
✅ No runtime errors

### Expected Behavior
✅ Click bronze A → only A and its targets expand
✅ Click bronze B → only B and its targets expand
✅ Click silver X → X and all its sources expand
✅ Collapse works correctly
✅ Auto-layout repositions properly

## User Experience

### Before (Confusing)
1. Click Bronze Schema A
2. Bronze A, B, and C all expand
3. "Why did B and C expand? I didn't click them!"
4. Hard to focus on one data flow

### After (Intuitive)
1. Click Bronze Schema A
2. Only Bronze A and Customer expand
3. "Perfect! I can see where A's data goes"
4. Easy to trace this specific schema's mapping

## Conclusion
The selective expansion fix makes the dashboard behavior more intuitive and focused. Users can now explore individual data flows without being overwhelmed by unrelated schema expansions, while still being able to see all sources feeding into an entity when clicking on that entity.