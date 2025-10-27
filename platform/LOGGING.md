# Laravel Platform Logging Configuration

This document explains how the Laravel platform app is configured to work optimally with the Docker + Loki + Grafana observability stack.

## Logging Configuration Changes

### 1. New Logging Channels Added

#### `docker` Channel
- **Purpose**: Optimized for Docker container environments
- **Output**: `php://stdout` (captured by Docker's json-file driver)
- **Format**: JSON structured logs for better parsing in Loki
- **Processors**: Includes web request context, introspection data, and PSR-3 message processing

#### `stdout` Channel
- **Purpose**: Simple stdout logging without JSON formatting
- **Output**: `php://stdout`
- **Format**: Configurable via `LOG_STDOUT_FORMATTER` environment variable

### 2. Environment Variables

The following environment variables are configured in `docker-compose.yml`:

```yaml
LOG_CHANNEL: stack          # Use the stack driver
LOG_STACK: docker          # Stack uses the 'docker' channel
LOG_LEVEL: info            # Log level (debug, info, warning, error, critical)
```

### 3. JSON Log Structure

The `docker` channel outputs logs in JSON format with the following structure:

```json
{
  "message": "Log message content",
  "context": {},
  "level": 200,
  "level_name": "INFO",
  "channel": "local",
  "datetime": "2025-09-28T15:30:45.123456+00:00",
  "extra": {
    "url": "http://example.com/api/endpoint",
    "ip": "192.168.1.100",
    "http_method": "GET",
    "server": "nginx/1.18.0",
    "referrer": null,
    "file": "/var/www/html/app/Http/Controllers/ExampleController.php",
    "line": 42,
    "class": "App\\Http\\Controllers\\ExampleController",
    "function": "index"
  }
}
```

## How It Works with Observability Stack

1. **Laravel Application** → Logs to `php://stdout` in JSON format
2. **Docker Container** → Captures stdout with json-file logging driver
3. **Promtail** → Reads Docker container logs and sends to Loki
4. **Loki** → Stores and indexes log data
5. **Grafana** → Queries Loki and displays logs in dashboards

## Benefits of This Configuration

- **Structured Data**: JSON format allows for better filtering and querying in Grafana
- **Context Information**: Web requests include URL, IP, HTTP method, referrer
- **Code Location**: File, line, class, and function information for debugging
- **Docker Integration**: Native integration with Docker's logging system
- **Performance**: Stdout is faster than file-based logging in containers
- **Centralized**: All logs go to the same observability stack

## Testing the Configuration

### 1. Generate Test Logs

Add this to any controller or command to test logging:

```php
use Illuminate\Support\Facades\Log;

// Test different log levels
Log::debug('This is a debug message', ['user_id' => 123]);
Log::info('User logged in', ['email' => 'user@example.com']);
Log::warning('Deprecated function used', ['function' => 'oldMethod']);
Log::error('Database connection failed', ['error' => 'Connection timeout']);
Log::critical('Application crashed', ['exception' => 'OutOfMemoryException']);
```

### 2. View Logs in Grafana

1. Access Grafana: http://localhost:3000
2. Go to "AI Data Lake - Platform App Logs" dashboard
3. Check the "Platform & Queue Worker - Errors and Warnings" panel
4. Use the "All Platform & Queue Worker Logs" panel to see all logs

### 3. Custom Log Queries

In Grafana's Explore section, try these LogQL queries:

```logql
# All platform logs
{container_name="platform"}

# Only error logs
{container_name="platform"} |~ "(?i)error"

# Logs from specific controller
{container_name="platform"} | json | line_format "{{.message}}" | json | extra_class="App\\Http\\Controllers\\YourController"

# HTTP request logs with status codes
{container_name="platform"} | json | extra_http_method!="" | line_format "{{.extra_http_method}} {{.extra_url}} - {{.message}}"
```

## Troubleshooting

### Logs Not Appearing in Grafana

1. **Check container logs**:
   ```bash
   docker-compose logs platform
   docker-compose logs queue-worker
   ```

2. **Verify environment variables**:
   ```bash
   docker-compose exec platform env | grep LOG
   ```

3. **Test logging configuration**:
   ```bash
   docker-compose exec platform php artisan tinker
   # In tinker:
   Log::info('Test message from tinker');
   ```

### Invalid JSON in Logs

If logs show malformed JSON, check:
- No custom formatters conflicting with JsonFormatter
- Context arrays contain only serializable data
- No circular references in logged objects

### Performance Concerns

- Set `LOG_LEVEL=info` in production (avoid debug level)
- Use log context sparingly for high-traffic endpoints
- Consider using queued logging for heavy logging scenarios

## Advanced Configuration

### Custom Log Context

Add application-specific context to all logs:

```php
// In a service provider or middleware
Log::withContext([
    'tenant_id' => auth()->user()?->tenant_id,
    'request_id' => Str::uuid(),
]);
```

### Conditional Logging Channels

Use different channels based on environment:

```php
// config/logging.php
'stack' => [
    'driver' => 'stack',
    'channels' => env('APP_ENV') === 'local' 
        ? ['single'] 
        : ['docker'],
],
```
