# AI Data Lake Observability Stack

This directory contains the configuration for the observability stack that provides centralized logging and monitoring for all Docker containers in the AI Data Lake project.

## Components

- **Grafana**: Dashboard and visualization platform (port 3000)
- **Loki**: Log aggregation system (port 3100)
- **Promtail**: Log collection agent

## Quick Start

1. Start the full stack including observability:
   ```bash
   docker-compose up -d
   ```

2. Access Grafana:
   - URL: http://localhost:3000
   - Username: `admin`
   - Password: `admin`

3. View logs in dashboards:
   - **General Overview**: "Dashboards" → "AI Data Lake - Container Logs"
   - **Platform Logs**: "Dashboards" → "AI Data Lake - Platform App Logs"
   - **Kafka Logs**: "Dashboards" → "AI Data Lake - Kafka & ZooKeeper Logs"
   - **Custom Queries**: Use the "Explore" feature with Loki datasource

## Features

### Centralized Logging
All containers are configured to send logs to Loki:
- **postgres**: Database logs
- **zookeeper**: ZooKeeper cluster logs
- **kafka**: Kafka broker logs
- **platform**: Laravel application logs
- **queue-worker**: Laravel queue worker logs
- **ingestion**: Go ingestion service logs
- **grafana**: Grafana logs
- **loki**: Loki logs
- **promtail**: Promtail logs

### Pre-configured Dashboards

#### 1. AI Data Lake - Container Logs
General overview dashboard that includes:
- Log rate by container (time series)
- Log volume by container (table)
- All container logs (searchable)
- Individual container log panels for key services

#### 2. AI Data Lake - Platform App Logs
Focused dashboard for Laravel application monitoring:
- Platform and Queue Worker log rates with error tracking
- Error and warning log streams
- HTTP request logs filtering
- Queue job processing logs
- All platform-related logs in one view

#### 3. AI Data Lake - Kafka & ZooKeeper Logs  
Dedicated messaging infrastructure monitoring:
- Kafka broker and ZooKeeper log rates with error tracking
- Error and warning streams for both services
- Topic and partition management logs
- Producer and consumer activity logs
- ZooKeeper cluster management logs
- Kafka broker management and configuration logs

### Log Queries Examples

#### Basic Queries
```logql
# All container logs
{job="containerlogs"}

# Logs from specific container
{container_name="kafka"}

# Logs containing error
{job="containerlogs"} |= "error"

# Logs from multiple containers
{container_name=~"kafka|zookeeper"}
```

#### Advanced Queries
```logql
# Rate of logs per container
sum by (container_name) (rate({job="containerlogs"}[5m]))

# Count of error logs per container
sum by (container_name) (count_over_time({job="containerlogs"} |= "error" [1h]))

# JSON log parsing (if applicable)
{container_name="platform"} | json | line_format "{{.message}}"
```

## Configuration Files

### Loki (`loki/local-config.yaml`)
- Configured for single-instance deployment
- Uses filesystem storage
- Retention configured for efficient storage

### Promtail (`promtail/config.yml`)
- Collects Docker container logs
- Parses JSON log format
- Extracts container names as labels

### Grafana Provisioning
- **Datasources** (`grafana/provisioning/datasources/`): Auto-configures Loki
- **Dashboards** (`grafana/provisioning/dashboards/`): Auto-loads dashboards

## Platform App Logging Configuration

The Laravel platform app is specifically configured for optimal Docker + Loki integration:

### Key Features
- **JSON Structured Logs**: All logs output in JSON format for better parsing
- **Docker Integration**: Uses `php://stdout` captured by Docker's json-file driver
- **Rich Context**: Includes web request data, file/line info, and custom context
- **Environment Variables**: Configured via docker-compose.yml

### Log Format
```json
{
  "message": "User logged in successfully",
  "level_name": "INFO",
  "datetime": "2025-09-28T15:30:45.123456+00:00",
  "extra": {
    "url": "http://localhost:8000/api/login",
    "ip": "192.168.1.100",
    "http_method": "POST",
    "file": "/var/www/html/app/Http/Controllers/AuthController.php",
    "line": 42
  }
}
```

For detailed logging configuration, see: `/platform/LOGGING.md`

## Troubleshooting

### Platform App Logs Not Appearing
1. Check Laravel logging configuration: `docker-compose exec platform env | grep LOG`
2. Verify log output: `docker-compose logs platform | head -20`
3. Test logging: `docker-compose exec platform php artisan tinker` then `Log::info('test')`

### Container Not Showing Logs
1. Check if container has logging driver configured in docker-compose.yml
2. Verify Promtail is running: `docker-compose logs promtail`
3. Check Loki ingestion: `docker-compose logs loki`

### Dashboard Not Loading
1. Verify Loki datasource in Grafana (Configuration → Data Sources)
2. Check Loki connectivity: http://localhost:3100/ready
3. Restart Grafana: `docker-compose restart grafana`

### High Disk Usage
- Logs are stored in Docker volumes `loki_data` and `grafana_data`
- Adjust retention settings in `loki/local-config.yaml`
- Clean up old logs: `docker volume prune`

## Monitoring Best Practices

1. **Regular Dashboard Reviews**: Check the main dashboard daily
2. **Set Up Alerts**: Configure alerts for error rates or missing logs
3. **Log Levels**: Use appropriate log levels in your applications
4. **Structured Logging**: Use JSON format for better parsing

## Extending the Setup

### Adding New Services
1. Add logging configuration to docker-compose.yml:
   ```yaml
   logging:
     driver: "json-file"
     options:
       tag: "your-service-name"
   ```

### Custom Dashboards
1. Create dashboards in Grafana UI
2. Export JSON and save to `grafana/dashboards/`
3. Restart Grafana to load new dashboards

### Metrics Collection
To add metrics (Prometheus):
1. Add Prometheus to docker-compose.yml
2. Configure service discovery for containers
3. Add Prometheus datasource to Grafana
