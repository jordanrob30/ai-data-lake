# Constant-Value Formula Nodes Fix

## Issue
Some formula nodes were showing errors for missing bronze field connections. These were actually constant-value formulas that generate static values without reading from any source fields.

## Examples of Constant Formulas
- `"HubSpot"` - Returns string constant
- `"USD"` - Returns currency code
- `true` / `false` - Boolean constants
- `123` - Numeric constants

## Solution Implemented

### 1. Detection of Constant Formulas
In `edgeHelpers.ts`, we now detect constant formulas by checking:
- No source field specified (`!sourceFieldName`)
- Empty sourceFields array
- Marked as constant during creation (`isConstant` flag)

### 2. Edge Creation Logic
For constant formulas:
- **Skip bronze-to-formula edges** - These nodes don't read from source fields
- **Keep formula-to-silver edges** - They still write to target fields
- **Mark nodes with `isConstant: true`** flag for visual differentiation

### 3. Visual Differentiation
Updated `FormulaNode.tsx` to show constant formulas differently:
- **Icon**: Uses `≡` instead of `ƒ`
- **Label**: Shows "Constant" instead of "Formula"
- **No input handle** - Since they don't accept input connections
- **Help text** - Explains that the formula generates a constant value

### 4. Code Changes

#### edgeHelpers.ts
```typescript
// Check if this is a constant-value formula
const isConstantFormula = !sourceFieldName || sourceFieldName === '';

if (formula) {
  // Create formula node with isConstant flag
  detailedNodes.push({
    id: formulaNodeId,
    type: 'formulaNode',
    data: {
      formula: formula,
      sourceField: sourceFieldName || '',
      targetField: targetFieldName,
      isConstant: isConstantFormula,
      // ...
    },
  });

  // Only create bronze-to-formula edge if not constant
  if (!isConstantFormula) {
    // Create edge from source to formula
  }
}
```

#### FormulaNode.tsx
```typescript
// Show different icon and label for constants
<span className="text-2xl">{data.isConstant ? '≡' : 'ƒ'}</span>

// Hide input handle for constants
{!data.isConstant && (
  <Handle type="target" position={Position.Left} id="input" />
)}
```

## Visual Result

### Regular Formula Node
```
Bronze Field → [ƒ] → Silver Field
```

### Constant Formula Node
```
              [≡] → Silver Field
```
(No connection from bronze)

## Behavior
1. Constant formulas appear in the middle column with other intermediate nodes
2. They only have output connections to silver entities
3. They're visually distinct with the `≡` symbol
4. When expanded, they show "Constant Value Expression" as the label

## Files Modified
- `/platform/resources/js/utils/edgeHelpers.ts` - Detection and edge logic
- `/platform/resources/js/components/FlowNodes/FormulaNode.tsx` - Visual representation