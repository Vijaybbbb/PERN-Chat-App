# Chat App observability

The local monitoring stack combines application logs, application metrics, and infrastructure metrics in one Grafana dashboard.

## Data flow

```text
Node.js services ── Winston JSON logs ── Docker stdout
                                             │
                                             ▼
                                      Grafana Alloy ──► Loki

Node.js /metrics ─────────────────────────────┐
PostgreSQL exporter ──────────────────────────┤
Redis exporter ───────────────────────────────┤
RabbitMQ Prometheus plugin ───────────────────┼──► Prometheus
cAdvisor + Loki + Alloy metrics ──────────────┘

Loki + Prometheus ──► Grafana ──► Chat App Overview dashboard
```

Promtail is intentionally not used because it reached end of life. Grafana Alloy collects Docker logs through the read-only Docker socket and forwards them to Loki.

## Local endpoints

| Component | Address |
| --- | --- |
| Grafana | `http://localhost:3000` |
| Prometheus | `http://localhost:9090` |
| Loki | `http://localhost:3100/ready` |
| Alloy UI | `http://localhost:12345` |
| RabbitMQ metrics | `http://localhost:15692/metrics` |
| User service metrics | `http://localhost:3001/metrics` |
| Chat service metrics | `http://localhost:3002/metrics` |
| Database service metrics | `http://localhost:3003/metrics` |
| Message service metrics | `http://localhost:3004/metrics` |
| Socket service metrics | `http://localhost:3005/metrics` |

The Grafana username and password come from `GRAFANA_ADMIN_USER` and `GRAFANA_ADMIN_PASSWORD` in the root `.env` file.

## Important metrics

- `chatapp_http_requests_total`: requests by service, method, route, and status
- `chatapp_http_request_duration_seconds`: request latency histogram
- `chatapp_application_errors_total`: unhandled application failures
- `chatapp_dependency_up`: application view of PostgreSQL, Redis, RabbitMQ, Bedrock, and Cloudinary health
- `chatapp_dependency_operations_total`: dependency calls by operation and outcome
- `chatapp_operations_total`: business operations such as login, message send, and AI generation
- `chatapp_socket_connections`: active authenticated Socket.IO users
- `chatapp_socket_events_total`: Socket.IO events by type and outcome

## Example PromQL

```promql
# Five-minute request rate by service
sum by (service) (rate(chatapp_http_requests_total[5m]))

# Five-minute 5xx error rate
sum by (service) (rate(chatapp_http_requests_total{status_code=~"5.."}[5m]))

# 95th percentile request latency
histogram_quantile(
  0.95,
  sum by (service, le) (rate(chatapp_http_request_duration_seconds_bucket[5m]))
)

# Dependency failures during the last five minutes
sum by (service, dependency, operation) (
  increase(chatapp_dependency_operations_total{outcome="failure"}[5m])
)
```

## Example LogQL

```logql
# All structured application errors
{source="docker", application_service=~".+"} | json | level="error"

# Failures for one service
{application_service="message-service"} | json | level=~"warn|error"

# Follow one request across its log entries
{source="docker"} |= "REQUEST_ID_FROM_RESPONSE_HEADER"

# RabbitMQ failures
{source="docker"} |= "rabbitmq" | json | level="error"
```

Every HTTP response includes an `x-request-id` header. Search that value in Loki to correlate a client failure with its server log entry.

## Alerts

Prometheus loads `alerts.yml`, which detects:

- application or infrastructure targets that cannot be scraped
- dependency operation failures
- HTTP 5xx rates above 5%
- 95th percentile latency above one second

These rules are visible in Prometheus immediately. To send notifications, configure Grafana Alerting or attach Prometheus Alertmanager in the deployment environment.

## Production notes

- Replace the Grafana admin password and do not expose Grafana, Prometheus, Loki, Alloy, exporter, or metrics ports publicly.
- Put monitoring endpoints behind a private network, VPN, firewall, or authenticated reverse proxy.
- The included Loki filesystem storage and single replica are appropriate for local development and demos. Use object storage and a supported scalable deployment for production.
- Mounting `/var/run/docker.sock` gives Alloy read access to Docker metadata and logs; restrict host access to the monitoring container.
- Adjust retention, resource limits, and scrape intervals to match traffic and storage capacity.
