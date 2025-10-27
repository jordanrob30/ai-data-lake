# AI Schema Analysis Integration Guide

This document explains how the AI-powered schema analysis system works and how to integrate it into the frontend.

## Overview

The system now includes AI-powered schema analysis using AWS Bedrock (Claude 3.5 Sonnet) to automatically:
- Analyze incoming schemas
- Recommend mappings to existing canonical entities OR suggest creating new ones
- Generate JSONata transformation formulas for field mappings
- Provide confidence scores and explanations

## Backend Components (✅ Completed)

### 1. Database Schema
**Migration**: `2025_10_22_123016_add_ai_recommendations_to_schemas_table.php`

New columns on `schemas` table:
- `ai_recommendations` (JSON) - Stores the AI analysis results
- `ai_analysis_status` (ENUM) - 'pending' | 'completed' | 'failed' | 'disabled'
- `ai_analyzed_at` (TIMESTAMP) - When analysis was performed
- `ai_analysis_error` (TEXT) - Error message if analysis failed

### 2. AISchemaService
**Location**: `platform/app/Services/AISchemaService.php`

**Key Methods**:
- `analyzeSchema(Schema $incomingSchema): array` - Main entry point for AI analysis
- `buildAnalysisPrompt()` - Constructs detailed prompt with context
- `parseAIResponse()` - Parses and validates AI response

**Features**:
- Connects to AWS Bedrock using configured credentials
- Compares incoming schema with all existing canonical entities
- Uses detailed prompt engineering for accurate recommendations
- Validates and structures AI responses
- Comprehensive error handling and logging

### 3. API Endpoints
**Routes**: `platform/routes/api.php`

```php
POST /api/schemas/{schema}/analyze
GET /api/schemas/{schema}/ai-recommendations
```

**Controllers**: `platform/app/Http/Controllers/Api/SchemaController.php`
- `analyzeSchema()` - Triggers AI analysis
- `getAIRecommendations()` - Retrieves stored recommendations

### 4. Configuration
**File**: `platform/config/services.php`

```php
'bedrock' => [
    'key' => env('AWS_ACCESS_KEY_ID'),
    'secret' => env('AWS_SECRET_ACCESS_KEY'),
    'region' => env('AWS_BEDROCK_REGION', 'us-east-1'),
    'model_id' => env('AWS_BEDROCK_MODEL_ID', 'anthropic.claude-3-5-sonnet-20241022-v2:0'),
    'enabled' => env('AI_SCHEMA_ANALYSIS_ENABLED', true),
    'timeout' => env('AI_SCHEMA_ANALYSIS_TIMEOUT', 30),
],
```

**Environment Variables** (`.env.example`):
```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_BEDROCK_REGION=us-east-1
AWS_BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
AI_SCHEMA_ANALYSIS_ENABLED=true
AI_SCHEMA_ANALYSIS_TIMEOUT=30
```

## Frontend Components (✅ Created, Integration Needed)

### 1. TypeScript Types
**Location**: `platform/resources/js/partials/ConfigureMappings/types.ts`

```typescript
export interface AIRecommendations {
  action: 'map_to_existing' | 'create_new';
  entity_id: number | null;
  entity_name: string;
  similarity_score?: number;
  reasoning: string;
  canonical_schema: {
    fields: AICanonicalField[];
  };
  field_mappings: AIFieldMapping[];
}

export interface AIFieldMapping {
  source_field: string;
  target_field: string;
  transformation: 'direct' | 'formula' | 'split' | 'combine' | 'format_conversion';
  jsonata_formula: string;
  confidence: number;
  explanation: string;
}
```

### 2. AIRecommendationPanel Component
**Location**: `platform/resources/js/Components/AIRecommendationPanel.tsx`

A fully-featured React component that displays:
- AI reasoning and recommendation summary
- Entity name (editable)
- Canonical schema fields
- Field mappings table with editable JSONata formulas
- Confidence indicators (color-coded)
- Accept/Modify/Regenerate actions

## Frontend Integration Steps

### Step 1: Add AI Analysis to PendingSchemaDetailNode

**File**: `platform/resources/js/components/FlowNodes/PendingSchemaDetailNode.tsx`

Add state for AI recommendations:

```typescript
import AIRecommendationPanel from '../AIRecommendationPanel';
import { AIRecommendations } from '../../partials/ConfigureMappings/types';

// Add to component state
const [aiRecommendations, setAiRecommendations] = useState<AIRecommendations | null>(null);
const [isAnalyzing, setIsAnalyzing] = useState(false);
const [showAIPanel, setShowAIPanel] = useState(false);
```

Add function to trigger AI analysis:

```typescript
const handleAnalyzeWithAI = async () => {
    setIsAnalyzing(true);
    try {
        const response = await fetch(`/api/schemas/${data.schema_id}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
            },
        });

        if (!response.ok) {
            throw new Error('AI analysis failed');
        }

        const result = await response.json();
        setAiRecommendations(result.recommendations);
        setShowAIPanel(true);
    } catch (error) {
        console.error('AI analysis error:', error);
        alert('Failed to analyze schema with AI');
    } finally {
        setIsAnalyzing(false);
    }
};
```

Add function to handle accepting AI recommendations:

```typescript
const handleAcceptAIRecommendations = async (recommendations: AIRecommendations) => {
    try {
        if (recommendations.action === 'create_new') {
            // Create new entity based on AI recommendations
            window.dispatchEvent(new CustomEvent('createNewEntity', {
                detail: {
                    entityName: recommendations.entity_name,
                    sourceNodeId: `pending-${data.schema_id}`,
                    aiRecommendations: recommendations,
                }
            }));
        } else {
            // Map to existing entity
            handleMapToEntity(recommendations.entity_id!);
        }

        // Apply field mappings with JSONata formulas
        // This would involve updating the EntityController.saveEntities() call
        // to include the AI-generated mappings with formulas

        setShowAIPanel(false);
    } catch (error) {
        console.error('Failed to apply AI recommendations:', error);
        alert('Failed to apply recommendations');
    }
};
```

Add UI button in the render method:

```typescript
// Add this button near the "Create as Entity" or "Map to Entity" buttons
<button
    onClick={handleAnalyzeWithAI}
    disabled={isAnalyzing}
    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
>
    {isAnalyzing ? (
        <>
            <span className="animate-spin inline-block mr-2">⚡</span>
            Analyzing...
        </>
    ) : (
        <>
            <span className="mr-2">🤖</span>
            Analyze with AI
        </>
    )}
</button>

{/* Add the AIRecommendationPanel */}
{showAIPanel && aiRecommendations && (
    <div className="mt-4">
        <AIRecommendationPanel
            recommendations={aiRecommendations}
            onAcceptAll={handleAcceptAIRecommendations}
            onModify={(modified) => setAiRecommendations(modified)}
            onRegenerate={handleAnalyzeWithAI}
            isAnalyzing={isAnalyzing}
        />
    </div>
)}
```

### Step 2: Auto-trigger AI Analysis

For automatic AI analysis when a schema is created, update the Schema creation endpoint:

**File**: `platform/app/Http/Controllers/Api/SchemaController.php`

In the `create()` method, after creating the schema:

```php
// After line 79 (after $schema = Schema::create(...))
try {
    $aiService = app(AISchemaService::class);
    if ($aiService->isEnabled()) {
        dispatch(function() use ($schema, $aiService) {
            $recommendations = $aiService->analyzeSchema($schema);
            $schema->update([
                'ai_recommendations' => $recommendations,
                'ai_analysis_status' => 'completed',
                'ai_analyzed_at' => now(),
            ]);
        })->afterResponse();
    }
} catch (\Exception $e) {
    Log::error('Auto AI analysis failed', ['error' => $e->getMessage()]);
}
```

### Step 3: Update EntityController to Support AI Mappings

**File**: `platform/app/Http/Controllers/Api/EntityController.php`

Modify `saveEntities()` to accept JSONata formulas:

```php
// Already supports formula fields via SchemaMapping!
// The current implementation handles:
// - mapping_type: 'direct' | 'formula'
// - formula_expression: The JSONata formula
// - formula_language: 'JSONata'

// Just ensure the frontend passes these fields when accepting AI recommendations
```

### Step 4: Test the Integration

1. **Setup AWS Credentials**:
   ```bash
   # Add to platform/.env
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   AWS_BEDROCK_REGION=us-east-1
   AI_SCHEMA_ANALYSIS_ENABLED=true
   ```

2. **Send Test Data**:
   ```bash
   curl -X POST http://localhost:8080/tenant/1/ingest \
     -H "Content-Type: application/json" \
     -d '{
       "name": "John Doe",
       "email": "john@example.com",
       "created_at": "2025-10-22T12:00:00Z"
     }'
   ```

3. **Check Dashboard**:
   - Navigate to the dashboard
   - See pending schema node
   - Click "Analyze with AI"
   - Review AI recommendations
   - Accept or modify recommendations
   - Verify entity and mappings are created

## AI Recommendation Flow

```
┌─────────────────────┐
│  Data Ingested      │
│  (Go Service)       │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ Schema Created      │
│ Status: pending     │
│ AI Status: pending  │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ User clicks         │
│ "Analyze with AI"   │
│ OR Auto-triggered   │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ AISchemaService     │
│ - Get existing      │
│   canonical entities│
│ - Build prompt      │
│ - Call Bedrock      │
│ - Parse response    │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ AI Recommendations  │
│ Stored in DB        │
│ Status: completed   │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ AIRecommendation    │
│ Panel Displays      │
│ - Entity name       │
│ - Field mappings    │
│ - JSONata formulas  │
│ - Confidence scores │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ User Reviews &      │
│ Accepts/Modifies    │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ EntityController    │
│ .saveEntities()     │
│ - Create entity     │
│ - Save mappings     │
│ - Store formulas    │
└──────────┬──────────┘
           │
           v
┌─────────────────────┐
│ Schema Confirmed    │
│ Bronze layer ready  │
└─────────────────────┘
```

## AI Prompt Structure

The AI receives:

### Input Schema
- Hash, name, detected fields with types/formats/metadata
- Sample data

### Existing Canonical Entities
- All confirmed struct-type schemas in tenant
- Their field definitions

### Task Instructions
- Compare similarity
- Decide: map_to_existing OR create_new
- Design canonical schema (if new)
- Generate field-to-field mappings
- Create JSONata transformation formulas
- Provide confidence scores and explanations

### Example AI Response

```json
{
  "action": "create_new",
  "entity_id": null,
  "entity_name": "Customer",
  "reasoning": "No existing customer entity found. Creating canonical customer schema with separated name fields.",
  "canonical_schema": {
    "fields": [
      {"name": "first_name", "type": "string", "required": true},
      {"name": "last_name", "type": "string", "required": true},
      {"name": "email", "type": "email", "required": true}
    ]
  },
  "field_mappings": [
    {
      "source_field": "name",
      "target_field": "first_name",
      "transformation": "split",
      "jsonata_formula": "$split(name, ' ')[0]",
      "confidence": 0.85,
      "explanation": "Extracting first name from full name by splitting on space"
    },
    {
      "source_field": "name",
      "target_field": "last_name",
      "transformation": "split",
      "jsonata_formula": "$split(name, ' ')[1]",
      "confidence": 0.85,
      "explanation": "Extracting last name from full name by splitting on space"
    },
    {
      "source_field": "email",
      "target_field": "email",
      "transformation": "direct",
      "jsonata_formula": "email",
      "confidence": 1.0,
      "explanation": "Direct mapping - field types and formats match perfectly"
    }
  ]
}
```

## Testing Checklist

- [ ] AWS credentials configured
- [ ] Schema created triggers AI analysis (auto or manual)
- [ ] AI recommendations display correctly
- [ ] Can edit JSONata formulas
- [ ] Can modify entity name
- [ ] Can accept recommendations (creates entity)
- [ ] Can accept recommendations (maps to existing entity)
- [ ] Field mappings stored with formulas
- [ ] Bronze layer CSV created after confirmation
- [ ] Check Grafana/Loki logs for AI service calls
- [ ] Error handling works (invalid credentials, timeout, etc.)

## Future Enhancements

1. **Streaming Analysis**: Show AI thinking process in real-time
2. **Feedback Loop**: Allow users to rate recommendations to improve prompts
3. **Batch Analysis**: Analyze multiple pending schemas at once
4. **Smart Defaults**: Pre-fill external ID and dedupe fields based on AI analysis
5. **Version History**: Track AI recommendation changes over time
6. **A/B Testing**: Compare AI recommendations vs manual mappings

## Troubleshooting

### AI Analysis Fails
- Check AWS credentials in `.env`
- Verify Bedrock access in AWS account
- Check model ID is correct for your region
- Review logs: `docker-compose logs -f platform`

### Recommendations Not Displaying
- Check `ai_analysis_status` in database
- Verify API endpoint returns data
- Check browser console for errors
- Ensure TypeScript types match API response

### JSONata Formulas Not Working
- Validate formula syntax
- Test formulas in JSONata playground
- Check formula is stored in SchemaMapping
- Verify silver layer transformation applies formulas

## Documentation Links

- [AWS Bedrock Converse API](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)
- [JSONata Documentation](https://jsonata.org/)
- [React Flow Documentation](https://reactflow.dev/)
- [Laravel Inertia](https://inertiajs.com/)
