<?php

namespace App\Services;

use App\Models\Schema;
use Aws\BedrockRuntime\BedrockRuntimeClient;
use Illuminate\Support\Facades\Log;
use Exception;

class AISchemaService
{
    private BedrockRuntimeClient $client;
    private string $modelId;
    private int $timeout;
    private bool $enabled;

    public function __construct()
    {
        $this->enabled = config('services.bedrock.enabled', true);

        if (!$this->enabled) {
            return;
        }

        $this->modelId = config('services.bedrock.model_id', 'anthropic.claude-3-5-sonnet-20241022-v2:0');
        $this->timeout = config('services.bedrock.timeout', 30);

        $this->client = new BedrockRuntimeClient([
            'region' => config('services.bedrock.region', 'us-east-1'),
            'version' => 'latest',
            'credentials' => [
                'key' => config('services.bedrock.key'),
                'secret' => config('services.bedrock.secret'),
            ],
            'http' => [
                'timeout' => $this->timeout,
            ],
        ]);
    }

    /**
     * Analyze an incoming schema and generate AI recommendations
     *
     * @param Schema $incomingSchema The schema to analyze
     * @return array The AI recommendations
     * @throws Exception
     */
    public function analyzeSchema(Schema $incomingSchema): array
    {
        if (!$this->enabled) {
            throw new Exception('AI schema analysis is disabled');
        }

        try {
            // Get all existing canonical entities (type = 'struct', status = 'confirmed')
            $existingEntities = Schema::where('tenant_id', $incomingSchema->tenant_id)
                ->where('type', 'struct')
                ->where('status', 'confirmed')
                ->get()
                ->map(function ($schema) {
                    return [
                        'id' => $schema->id,
                        'name' => $schema->name,
                        'fields' => $schema->detected_fields ?? [],
                    ];
                })
                ->toArray();

            // Build the prompt for Claude
            $prompt = $this->buildAnalysisPrompt($incomingSchema, $existingEntities);

            // Call Bedrock Converse API
            $response = $this->client->converse([
                'modelId' => $this->modelId,
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => [
                            ['text' => $prompt],
                        ],
                    ],
                ],
                'inferenceConfig' => [
                    'maxTokens' => 8192,
                    'temperature' => 0.3,
                    'topP' => 0.9,
                ],
            ]);

            // Extract response text
            $responseText = $response['output']['message']['content'][0]['text'] ?? '';

            // Parse the AI response into structured recommendations
            $recommendations = $this->parseAIResponse($responseText);

            Log::info('AI schema analysis completed', [
                'schema_id' => $incomingSchema->id,
                'schema_hash' => $incomingSchema->hash,
                'action' => $recommendations['action'] ?? 'unknown',
            ]);

            return $recommendations;

        } catch (Exception $e) {
            Log::error('AI schema analysis failed', [
                'schema_id' => $incomingSchema->id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            throw $e;
        }
    }

    /**
     * Build the analysis prompt for Claude
     *
     * @param Schema $incomingSchema
     * @param array $existingEntities
     * @return string
     */
    private function buildAnalysisPrompt(Schema $incomingSchema, array $existingEntities): string
    {
        $hasExistingEntities = count($existingEntities) > 0;

        $prompt = <<<PROMPT
You are an expert data engineer specializing in data lake architecture and schema normalization. Think like a seasoned data engineer who designs robust, scalable canonical models for enterprise data warehouses.

Your mindset: "Every field should be atomic, properly typed, and follow best practices for dimensional modeling and data normalization."

Your task is to:
1. Analyze the incoming schema with a critical data engineering eye
2. Identify composite fields that should be split into atomic components
3. Compare with existing canonical entities for reusability
4. Design a properly normalized canonical schema following data warehouse best practices
5. Generate precise field mappings with transformation formulas

## Incoming Schema

**Schema Hash**: {$incomingSchema->hash}
**Schema Name**: {$incomingSchema->name}
**Detected Fields**:
```json
{$this->formatFields($incomingSchema->detected_fields ?? [])}
```

**Sample Data**:
```json
{$this->formatSampleData($incomingSchema->sample_data ?? [])}
```


## 🔍 CRITICAL ANALYSIS REQUIRED

Before proceeding, examine the incoming schema for these common issues that MUST be fixed in the canonical model:

1. **Composite Fields to Split**:
   - Any field with "name" → Split into first_name, last_name, etc.
   - Any field with "address" → Split into street, city, state, postal_code
   - Any field containing multiple data points → Split into atomic fields

2. **Data Type Issues to Fix**:
   - Dates stored as strings → Convert to proper datetime type
   - Numbers stored as strings → Convert to integer/decimal types
   - JSON stored as strings → Parse and extract structured fields

3. **Naming Issues to Standardize**:
   - Inconsistent casing → Convert to snake_case
   - Abbreviated names → Expand to full descriptive names
   - Generic names → Make specific (e.g., "value" → "transaction_amount")

REMEMBER: You are designing a canonical model for a data warehouse. Every decision should improve data quality, consistency, and analytical capabilities.

PROMPT;

        if ($hasExistingEntities) {
            $prompt .= "\n\n## Existing Canonical Entities\n\n";
            foreach ($existingEntities as $entity) {
                $prompt .= "### Entity: {$entity['name']} (ID: {$entity['id']})\n";
                $prompt .= "```json\n";
                $prompt .= json_encode($entity['fields'], JSON_PRETTY_PRINT);
                $prompt .= "\n```\n\n";
            }
        } else {
            $prompt .= "\n\n## Existing Canonical Entities\n\nNone - This will be the first entity in the system.\n\n";
        }

        $prompt .= <<<PROMPT

## Your Task

Analyze the incoming schema and provide recommendations in the following JSON format:

```json
{
  "action": "map_to_existing" | "create_new",
  "entity_id": null or existing entity ID (if mapping to existing),
  "entity_name": "Suggested entity name",
  "similarity_score": 0-100 (only if mapping to existing),
  "reasoning": "Detailed explanation of why this recommendation was made",
  "canonical_schema": {
    "fields": [
      {
        "name": "field_name",
        "type": "field_type",
        "required": true|false,
        "format": "optional format string"
      }
    ]
  },
  "field_mappings": [
    {
      "source_field": "name_in_incoming_schema (or empty string '' for constant values)",
      "target_field": "name_in_canonical_schema",
      "transformation": "direct" | "formula" | "split" | "combine" | "format_conversion" | "constant",
      "jsonata_formula": "JSONata expression to transform the field or constant value",
      "confidence": 0.0-1.0,
      "explanation": "Why this mapping makes sense"
    }
  ]
}
```

## Data Engineering Guidelines

### 1. CRITICAL: Field Normalization Rules (ALWAYS APPLY THESE)

**Names - ALWAYS split composite name fields:**
- "name" or "full_name" → Split into: first_name, middle_name, last_name, suffix
- "customer_name" → Split into: customer_first_name, customer_last_name
- Example JSONata: First name: "\$split(\$trim(name), ' ')[0]", Last name: "\$split(\$trim(name), ' ')[-1]"

**Addresses - ALWAYS decompose into atomic components:**
- "address" or "full_address" → Split into: street_address, unit_number, city, state_province, postal_code, country_code
- Never store addresses as a single string in canonical models
- Example JSONata: Street: "\$split(address, ',')[0]", City: "\$trim(\$split(address, ',')[1])"

**Phone Numbers - ALWAYS structure properly:**
- "phone" or "phone_number" → Split into: country_code, area_code, phone_number, extension
- Example JSONata: Extract digits: "\$replace(phone, /[^0-9]/g, '')"

**Dates/Times - ALWAYS normalize to ISO8601:**
- Convert all date strings to consistent ISO8601 format
- Store with timezone awareness when possible

**Money/Currency - ALWAYS separate amount from currency:**
- "price_with_currency" → Split into: amount (decimal type), currency_code (ISO 4217)
- Never store amounts as strings with currency symbols

### 2. Canonical Schema Design Principles

- **Think Like a Data Warehouse Architect**: Design for analytics and reporting
- **Atomic Fields Only**: Each field contains exactly one piece of information
- **Consistent Naming**: Use explicit, descriptive snake_case (customer_first_name not cust_fname)
- **Proper Data Types**: Use specific types (email, url, phone) not generic strings
- **Design for Reusability**: Create entities that multiple data sources can map to

### 3. Common Entity Patterns (Use These as Templates)

**Customer/Person Entity:**
- first_name, middle_name, last_name, suffix, title
- email, secondary_email
- phone_country_code, phone_area_code, phone_number, phone_extension
- date_of_birth, gender, preferred_language

**Address Entity:**
- street_number, street_name, street_type, unit_type, unit_number
- city, state_province, postal_code, country_code
- latitude, longitude (if available)

**Transaction/Order Entity:**
- transaction_id, order_number, transaction_datetime
- amount, currency_code, tax_amount, total_amount
- status, payment_method, channel

### 4. Advanced JSONata Transformations

**Name Splitting (handle edge cases):**
- First name: "\$split(\$trim(name), ' ')[0]"
- Last name: "\$split(\$trim(name), ' ')[-1]"
- Middle name(s): "\$join(\$split(\$trim(name), ' ')[1..-2], ' ')"

**Address Parsing:**
- Parse "123 Main St, Apt 4B, New York, NY 10001"
- Street: "\$trim(\$split(address, ',')[0])"
- Unit: "\$contains(address, 'Apt') ? \$trim(\$split(\$split(address, 'Apt')[1], ',')[0]) : ''"

**Date Normalization:**
- From various formats: "\$toMillis(date_field, '[M01]/[D01]/[Y0001]')"
- To ISO8601: "\$fromMillis(\$toMillis(date_field), '[Y0001]-[M01]-[D01]T[H01]:[m01]:[s01].[f001]Z')"

### 5. Mapping Decision Criteria

- **Map to Existing**: If existing entity matches >75% of fields with same semantic meaning
- **Create New**: When the data represents a fundamentally different business concept
- **Consider Business Context**: A "user" and "customer" might be different entities even with similar fields

### 6. Field Mapping Rules - CRITICAL

**IMPORTANT: Every field mapping MUST have either a source_field OR be a constant value, never both empty:**

- **Regular Field Mappings**: ALWAYS set source_field to the name of the field in the incoming schema
  - Example: {"source_field": "customer_name", "target_field": "first_name", ...}

- **Constant Value Mappings**: Set source_field to empty string "" ONLY when generating a constant
  - Example: {"source_field": "", "target_field": "source_system", "transformation": "constant", "jsonata_formula": "\"HubSpot\""}
  - Use for metadata fields like: source_system, currency_code (if always same), is_active (default values)

- **Split Field Mappings**: MUST have source_field set to the composite field being split
  - WRONG: {"source_field": "", "target_field": "first_name", "jsonata_formula": "\$split(name, ' ')[0]"}
  - CORRECT: {"source_field": "name", "target_field": "first_name", "jsonata_formula": "\$split(name, ' ')[0]"}

### 7. Confidence Scoring

- 1.0: Standard transformations (name splitting, date formatting), constant values
- 0.9: Pattern-based extractions with clear rules
- 0.7-0.8: Semantic matches requiring interpretation
- <0.7: Ambiguous mappings needing human review

## Response Format

Return ONLY valid JSON. Do not include any markdown code blocks, explanations, or text outside the JSON structure.

## Example Transformations You Should Apply

**Example 1 - Name Field:**
If incoming has: {"name": "John Smith"}
Your canonical should have:
- first_name (with mapping: "\$split(\$trim(name), ' ')[0]")
- last_name (with mapping: "\$split(\$trim(name), ' ')[-1]")

**Example 2 - Address Field:**
If incoming has: {"customer_address": "123 Main St, New York, NY 10001"}
Your canonical should have:
- street_address (with mapping: "\$split(customer_address, ',')[0]")
- city (with mapping: "\$trim(\$split(customer_address, ',')[1])")
- state_province (with mapping: "\$trim(\$split(customer_address, ',')[2])")
- postal_code (with mapping: "\$trim(\$split(customer_address, ',')[3])")

**Example 3 - Contact Info:**
If incoming has: {"contact": "John Doe, john@email.com, 555-123-4567"}
Your canonical should have:
- contact_first_name, contact_last_name, contact_email, contact_phone_number
(with appropriate split and extraction formulas)

**Example 4 - Adding Metadata Fields (Constant Values):**
For ANY incoming schema, consider adding metadata fields:
- source_system: {"source_field": "", "target_field": "source_system", "transformation": "constant", "jsonata_formula": "\"YourSystemName\""}
- import_date: {"source_field": "", "target_field": "import_date", "transformation": "constant", "jsonata_formula": "\$now()"}
- is_active: {"source_field": "", "target_field": "is_active", "transformation": "constant", "jsonata_formula": "true"}

IMPORTANT: These are not suggestions - you MUST apply these types of transformations to create properly normalized canonical schemas.
CRITICAL: For split/transform operations, ALWAYS set source_field to the field being transformed. Only use empty source_field for true constant values.

PROMPT;

        return $prompt;
    }

    /**
     * Parse AI response into structured recommendations
     *
     * @param string $responseText
     * @return array
     */
    private function parseAIResponse(string $responseText): array
    {
        // Remove markdown code blocks if present
        $responseText = preg_replace('/```json\s*/', '', $responseText);
        $responseText = preg_replace('/```\s*$/', '', $responseText);
        $responseText = trim($responseText);

        try {
            $decoded = json_decode($responseText, true, 512, JSON_THROW_ON_ERROR);

            // Validate required fields
            if (!isset($decoded['action']) || !in_array($decoded['action'], ['map_to_existing', 'create_new'])) {
                throw new Exception('Invalid action in AI response');
            }

            if (!isset($decoded['entity_name']) || empty($decoded['entity_name'])) {
                throw new Exception('Missing entity_name in AI response');
            }

            if (!isset($decoded['field_mappings']) || !is_array($decoded['field_mappings'])) {
                throw new Exception('Missing or invalid field_mappings in AI response');
            }

            return $decoded;

        } catch (\JsonException $e) {
            Log::error('Failed to parse AI response as JSON', [
                'response' => $responseText,
                'error' => $e->getMessage(),
            ]);

            throw new Exception('AI returned invalid JSON: ' . $e->getMessage());
        }
    }

    /**
     * Format fields for prompt
     */
    private function formatFields(array $fields): string
    {
        return json_encode($fields, JSON_PRETTY_PRINT);
    }

    /**
     * Format sample data for prompt
     */
    private function formatSampleData(array $sampleData): string
    {
        return json_encode($sampleData, JSON_PRETTY_PRINT);
    }

    /**
     * Check if AI analysis is enabled
     */
    public function isEnabled(): bool
    {
        return $this->enabled;
    }
}
