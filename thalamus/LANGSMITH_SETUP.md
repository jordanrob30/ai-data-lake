# LangSmith Setup Guide for Thalamus

LangSmith provides comprehensive observability for the Thalamus schema analysis service, allowing you to:
- View the complete agent execution flow
- Monitor each node's performance
- Debug prompt/response pairs
- Track token usage and costs
- Analyze error patterns

## Quick Setup

### 1. Get Your LangSmith API Key

1. Go to [https://smith.langchain.com/](https://smith.langchain.com/)
2. Sign up or log in to your account
3. Navigate to Settings → API Keys
4. Create a new API key and copy it

### 2. Configure Environment Variables

Add these to your `.env` file in the thalamus directory:

```bash
# Enable LangSmith tracing
LANGSMITH_ENABLED=true
LANGSMITH_API_KEY=your-api-key-here
LANGSMITH_PROJECT=thalamus-schema-analyzer
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

Or add them to your root `.env` file (for docker-compose):

```bash
# LangSmith Configuration
LANGSMITH_ENABLED=true
LANGSMITH_API_KEY=lsv2_pt_xxxxxxxxxxxxxxxxxxxxx
LANGSMITH_PROJECT=thalamus-schema-analyzer
```

### 3. Restart Thalamus Service

```bash
docker-compose restart thalamus
```

### 4. Verify Configuration

Check the logs to confirm LangSmith is enabled:

```bash
docker-compose logs thalamus | grep -i langsmith
```

You should see:
```
{"event": "LangSmith tracing enabled", "project": "thalamus-schema-analyzer", ...}
```

## Viewing Traces in LangSmith

### Access Your Project

1. Go to [https://smith.langchain.com/](https://smith.langchain.com/)
2. Navigate to your project: `thalamus-schema-analyzer`
3. Click on "Runs" to see all executions

### Understanding the Trace View

Each schema analysis creates a trace showing:

```
📊 analyze_schema (root)
  └── 🔄 LangGraph Workflow
      ├── 📝 analyze_fields
      │   └── ChatBedrock call
      ├── 🔍 match_entities
      │   └── ChatBedrock call
      ├── 🏗️ normalize_schema
      │   └── ChatBedrock call
      └── 🔧 generate_mappings
          └── ChatBedrock call
```

### Key Metrics to Monitor

1. **Latency per Node**
   - `analyze_fields`: Usually 2-3s
   - `match_entities`: Usually 1-2s
   - `normalize_schema`: Usually 2-3s
   - `generate_mappings`: Usually 3-4s

2. **Token Usage**
   - Input tokens per node
   - Output tokens per node
   - Total cost estimation

3. **Error Patterns**
   - Failed nodes highlighted in red
   - Error messages and stack traces
   - Retry attempts

## Debugging with LangSmith

### View Detailed Prompts and Responses

Click on any ChatBedrock call to see:
- Complete system and user prompts
- Model responses
- Token counts
- Latency

### Filter and Search

Use filters to find specific runs:
- By status: `status:error` for failed runs
- By latency: `latency:>5000` for slow runs
- By project: `project:thalamus-schema-analyzer`

### Compare Runs

Select multiple runs to compare:
- Performance differences
- Output variations
- Success vs failure patterns

## Advanced Configuration

### Custom Run Names

Tag specific analyses for easier tracking:

```python
# In your code
from langsmith import Client
client = Client()

with client.trace(
    name="high_priority_schema",
    tags=["production", "customer_x"]
):
    result = analyze_schema(request)
```

### Performance Monitoring

Set up alerts for:
- High latency (>10s total)
- High token usage (>10k tokens)
- Error rates (>5% failures)

### Dataset Testing

Create test datasets in LangSmith:
1. Go to Datasets → New Dataset
2. Add sample schemas
3. Run automated tests against new deployments

## Troubleshooting

### LangSmith Not Recording

Check these common issues:

1. **API Key Invalid**
   ```bash
   curl -H "X-API-Key: $LANGSMITH_API_KEY" \
        https://api.smith.langchain.com/info
   ```

2. **Environment Variables Not Set**
   ```bash
   docker-compose exec thalamus env | grep LANG
   ```

3. **Network Issues**
   - Ensure container can reach api.smith.langchain.com
   - Check firewall/proxy settings

### High Latency

If LangSmith adds latency:
- Use async tracing (already configured)
- Batch trace uploads
- Consider sampling (trace every Nth request)

### Missing Traces

If some traces don't appear:
- Check for errors in Thalamus logs
- Verify project name matches
- Ensure LANGCHAIN_TRACING_V2=true

## Cost Considerations

LangSmith pricing:
- Free tier: 5,000 traces/month
- Startup: $39/month for 50,000 traces
- Scale as needed

Each schema analysis = 1 trace with multiple spans

## Best Practices

1. **Use Descriptive Project Names**
   - `thalamus-dev` for development
   - `thalamus-staging` for staging
   - `thalamus-prod` for production

2. **Tag Important Runs**
   - Customer/tenant IDs
   - Schema types
   - Environment

3. **Regular Monitoring**
   - Weekly performance reviews
   - Error pattern analysis
   - Cost optimization

4. **Data Privacy**
   - Review what data is sent to LangSmith
   - Consider data masking for sensitive fields
   - Use on-premise deployment if needed

## Integration with CI/CD

Add to your deployment pipeline:

```yaml
# .github/workflows/test.yml
env:
  LANGSMITH_ENABLED: true
  LANGSMITH_API_KEY: ${{ secrets.LANGSMITH_API_KEY }}
  LANGSMITH_PROJECT: thalamus-ci-${{ github.run_id }}
```

This creates isolated projects for each CI run.

## Support

- LangSmith Docs: [https://docs.smith.langchain.com/](https://docs.smith.langchain.com/)
- Discord: [https://discord.gg/langchain](https://discord.gg/langchain)
- Issues: [https://github.com/langchain-ai/langsmith-sdk/issues](https://github.com/langchain-ai/langsmith-sdk/issues)