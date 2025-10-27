# Thalamus - Schema Analysis Service

Thalamus is an intelligent schema analysis service that uses LangGraph and AWS Bedrock to perform multi-step analysis of incoming data schemas. It replaces single-prompt analysis with a sophisticated chain of specialized agents for improved accuracy.

## Architecture

The service uses a chain of specialized nodes:

1. **Field Analyzer**: Deep analysis of field types, formats, and patterns
2. **Entity Matcher**: Compares against existing canonical entities
3. **Schema Normalizer**: Creates properly normalized canonical schemas
4. **Mapping Generator**: Generates precise JSONata transformation expressions

## API Endpoints

### Main Analysis Endpoint
```
POST /analyze-schema
```

Analyzes an incoming schema and returns recommendations for canonical entity mapping.

**Request Body:**
```json
{
  "incoming_schema": {
    "id": 1,
    "hash": "abc123",
    "name": "customer_data",
    "tenant_id": 1,
    "detected_fields": [
      {
        "name": "full_name",
        "type": "string"
      },
      {
        "name": "email",
        "type": "string"
      }
    ],
    "sample_data": [
      {
        "full_name": "John Smith",
        "email": "john@example.com"
      }
    ]
  },
  "existing_entities": [
    {
      "id": 10,
      "name": "Customer",
      "fields": [
        {"name": "first_name", "type": "string"},
        {"name": "last_name", "type": "string"},
        {"name": "email", "type": "string"}
      ]
    }
  ]
}
```

**Response:**
```json
{
  "action": "map_to_existing",
  "entity_id": 10,
  "entity_name": "Customer",
  "source_schema_name": "shopify_customers",
  "similarity_score": 85,
  "reasoning": "Schema matches Customer entity with field normalization",
  "canonical_schema": {
    "fields": [
      {"name": "first_name", "type": "string", "required": true},
      {"name": "last_name", "type": "string", "required": true},
      {"name": "email", "type": "string", "required": true}
    ]
  },
  "field_mappings": [
    {
      "source_field": "full_name",
      "target_field": "first_name",
      "transformation": "split",
      "jsonata_formula": "$split($trim(full_name), ' ')[0]",
      "confidence": 0.9,
      "explanation": "Extract first name from full name"
    },
    {
      "source_field": "full_name",
      "target_field": "last_name",
      "transformation": "split",
      "jsonata_formula": "$split($trim(full_name), ' ')[-1]",
      "confidence": 0.9,
      "explanation": "Extract last name from full name"
    },
    {
      "source_field": "email",
      "target_field": "email",
      "transformation": "direct",
      "jsonata_formula": "email",
      "confidence": 1.0,
      "explanation": "Direct mapping of email field"
    }
  ]
}
```

### Health Check
```
GET /health
```

Returns service health status.

### Documentation
```
GET /docs
```

Interactive API documentation (Swagger UI).

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# AWS Bedrock Configuration
AWS_REGION=eu-west-2
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
BEDROCK_MODEL_ID=anthropic.claude-3-7-sonnet-20250219-v1:0

# Platform Integration
PLATFORM_API_URL=http://platform

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

## Development

### Running Locally

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Run the service:
```bash
python main.py
```

The service will start on `http://localhost:8001` with hot reload enabled.

### Running with Docker

The service is included in the main docker-compose setup:

```bash
docker-compose up thalamus
```

### Testing

Run tests with pytest:
```bash
pytest tests/
```

## Integration with Laravel

The Laravel platform can be configured to use Thalamus instead of the built-in AI service:

1. Set the `THALAMUS_API_URL` environment variable in Laravel
2. Update `AnalyzeSchemaJob` to call Thalamus API instead of direct Bedrock

Example integration:
```php
$response = Http::post(config('services.thalamus.url') . '/analyze-schema', [
    'incoming_schema' => $schema->toArray(),
    'existing_entities' => $existingEntities
]);

$recommendations = $response->json();
```

## Key Features

### Composite Field Splitting
Automatically identifies and splits composite fields:
- Names → first_name, middle_name, last_name
- Addresses → street, city, state, postal_code
- Phone numbers → country_code, area_code, number

### Smart Entity Matching
- Calculates semantic similarity between schemas
- Considers business context, not just field names
- Provides confidence scores for matches

### JSONata Transformations
Generates precise transformation expressions for:
- Field splitting and extraction
- Date/time format conversions
- Type conversions
- Pattern extraction

### Normalization Rules
- Enforces atomic fields (one piece of data per field)
- Standardizes naming conventions (snake_case)
- Applies proper data types
- Follows data warehouse best practices

## Monitoring

Logs are output in JSON format by default for easy parsing:

```bash
docker-compose logs -f thalamus
```

Metrics and performance data are logged for each analysis:
- Processing time per node
- Field mapping count
- Confidence scores
- Error rates

## Troubleshooting

### Common Issues

1. **AWS Bedrock Authentication**
   - Ensure AWS credentials are properly set
   - Check region matches where Claude is available
   - Verify IAM permissions for Bedrock access

2. **Memory Issues**
   - Increase Docker memory allocation
   - Reduce sample data size in requests

3. **Timeout Errors**
   - Increase `BEDROCK_TIMEOUT` for complex schemas
   - Check network connectivity to AWS

### Debug Mode

Enable debug mode for detailed logging:
```bash
DEBUG=true
LOG_LEVEL=DEBUG
```

## Architecture Details

### State Management
The service uses LangGraph's state management to pass data between nodes:
- Each node updates the state with its analysis
- State is preserved throughout the pipeline
- Failed nodes don't break the entire chain

### Error Handling
- Graceful fallbacks for each node failure
- Basic mappings generated if AI fails
- Detailed error logging for debugging

### Performance
- Async processing for better throughput
- Hot reload for development efficiency
- Connection pooling for AWS Bedrock