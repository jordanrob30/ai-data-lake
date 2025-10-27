# AI Schema Analysis - Quick Start Guide

Get AI-powered schema mapping running in 5 minutes!

## Step 1: Configure AWS Credentials (2 minutes)

Edit `platform/.env`:

```bash
AWS_ACCESS_KEY_ID=your_key_here
AWS_SECRET_ACCESS_KEY=your_secret_here
AWS_BEDROCK_REGION=us-east-1
AI_SCHEMA_ANALYSIS_ENABLED=true
```

## Step 2: Restart Platform (30 seconds)

```bash
docker-compose restart platform
```

## Step 3: Send Test Data (30 seconds)

```bash
curl -X POST http://localhost:8080/tenant/1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "customer_name": "John Doe",
    "email_address": "john@example.com",
    "signup_date": "2025-10-22"
  }'
```

## Step 4: Test AI Analysis (1 minute)

### Option A: Via Dashboard UI (Recommended)
1. Open http://localhost/dashboard
2. Click on pending schema node
3. Click "Analyze with AI" button
4. Review recommendations
5. Click "Accept & Apply Mappings"

### Option B: Via API (For Testing)
```bash
# Get the schema ID from database
SCHEMA_ID=$(docker-compose exec -T postgres psql -U user -d ai_data_lake -t -c "SELECT id FROM schemas WHERE status='pending' ORDER BY id DESC LIMIT 1;" | xargs)

# Trigger AI analysis
curl -X POST http://localhost/api/schemas/$SCHEMA_ID/analyze \
  -H "Content-Type: application/json" \
  -H "X-CSRF-TOKEN: your_csrf_token"

# Get recommendations
curl http://localhost/api/schemas/$SCHEMA_ID/ai-recommendations
```

## Step 5: Verify Results (1 minute)

Check the recommendations:
```bash
docker-compose exec postgres psql -U user -d ai_data_lake -c "SELECT id, ai_analysis_status, ai_recommendations FROM schemas WHERE status='pending';"
```

## Expected AI Response

The AI should recommend:
- **Action**: create_new (first schema)
- **Entity Name**: Customer
- **Canonical Fields**: first_name, last_name, email, created_at
- **Mappings**:
  - customer_name → first_name (split)
  - customer_name → last_name (split)
  - email_address → email (direct)
  - signup_date → created_at (format conversion)

## Test Second Schema (Matching)

```bash
curl -X POST http://localhost:8080/tenant/1/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane@example.com",
    "created_at": "2025-10-22T10:00:00Z"
  }'
```

AI should now recommend:
- **Action**: map_to_existing
- **Entity**: Customer (existing)
- **Similarity**: >70%
- **Mappings**: Direct field mappings

## Frontend Integration

Follow instructions in:
- [AI_INTEGRATION_GUIDE.md](AI_INTEGRATION_GUIDE.md) - Complete guide
- [platform/resources/js/components/FlowNodes/AIIntegrationExample.tsx](platform/resources/js/components/FlowNodes/AIIntegrationExample.tsx) - Code examples

## Troubleshooting

### "AI analysis failed"
```bash
# Check logs
docker-compose logs -f platform | grep AI

# Test AWS credentials
docker-compose exec platform php artisan tinker
> app(\App\Services\AISchemaService::class)->isEnabled()
```

### "Model not found"
- Verify region: Some regions don't have Claude 3.5 Sonnet
- Try `us-east-1` or `us-west-2`
- Request model access in AWS Console

### "Timeout"
- Increase timeout in `.env`: `AI_SCHEMA_ANALYSIS_TIMEOUT=60`

## What's Next?

1. **Integrate Frontend**: Add AI button to PendingSchemaDetailNode
2. **Test Workflows**: Try different schema patterns
3. **Review Recommendations**: Fine-tune by providing feedback
4. **Monitor Costs**: Check AWS billing dashboard
5. **Automate**: Enable auto-analysis on schema creation

## Architecture at a Glance

```
Ingestion → Schema Created → AI Analyzes → User Reviews → Entity Created → Bronze Layer
   (Go)        (Laravel)      (Bedrock)    (React UI)     (Laravel)      (CSV)
```

## Files to Know

**Backend**:
- `platform/app/Services/AISchemaService.php` - AI logic
- `platform/app/Http/Controllers/Api/SchemaController.php` - API endpoints
- `platform/.env` - Configuration

**Frontend**:
- `platform/resources/js/Components/AIRecommendationPanel.tsx` - UI component
- `platform/resources/js/partials/ConfigureMappings/types.ts` - TypeScript types
- `platform/resources/js/components/FlowNodes/AIIntegrationExample.tsx` - Integration example

**Documentation**:
- [AI_IMPLEMENTATION_SUMMARY.md](AI_IMPLEMENTATION_SUMMARY.md) - What was built
- [AI_INTEGRATION_GUIDE.md](AI_INTEGRATION_GUIDE.md) - How to integrate
- [QUICKSTART.md](QUICKSTART.md) - This file

## Success Criteria

- [ ] AI analysis completes in <5 seconds
- [ ] Recommendations have >80% confidence for direct mappings
- [ ] Can accept recommendations with 1-click
- [ ] JSONata formulas are valid
- [ ] Entity created successfully
- [ ] Bronze CSV file contains data

## Need Help?

Check logs:
```bash
docker-compose logs -f platform
docker-compose exec platform php artisan pail
```

View database:
```bash
docker-compose exec postgres psql -U user -d ai_data_lake
\dt schemas
SELECT * FROM schemas WHERE ai_analysis_status='completed';
```

---

**You're ready to go!** 🚀

Add your AWS credentials and start testing AI-powered schema analysis.
