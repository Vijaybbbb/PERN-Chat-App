const { randomUUID } = require('crypto');
const client = require('@prometheus-io/client');
const winston = require('winston');

const SECRET_KEY = /(authorization|cookie|password|passwd|secret|token|api[-_]?key|access[-_]?key|refresh[-_]?token)/i;
const MAX_STRING_LENGTH = 2000;

let observability;

const sanitize = (value, seen = new WeakSet()) => {
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
            code: value.code
        };
    }

    if (typeof value === 'string') {
        return value.length > MAX_STRING_LENGTH
            ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`
            : value;
    }

    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    if (Array.isArray(value)) {
        return value.slice(0, 100).map((item) => sanitize(item, seen));
    }

    return Object.entries(value).reduce((safe, [key, item]) => {
        safe[key] = SECRET_KEY.test(key) ? '[REDACTED]' : sanitize(item, seen);
        return safe;
    }, {});
};

const normalizeRoute = (req) => {
    if (req.route?.path) return `${req.baseUrl || ''}${req.route.path}`;
    return req.path === '/metrics' ? '/metrics' : 'unmatched';
};

const createObservability = (serviceName) => {
    if (observability) return observability;

    const service = serviceName || process.env.SERVICE_NAME || 'unknown-service';
    const redact = winston.format((info) => {
        Object.keys(info).forEach((key) => {
            info[key] = SECRET_KEY.test(key) ? '[REDACTED]' : sanitize(info[key]);
        });
        return info;
    });
    const logger = winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        defaultMeta: {
            service,
            environment: process.env.NODE_ENV || 'development'
        },
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            redact(),
            winston.format.json()
        ),
        transports: [new winston.transports.Console()]
    });

    const register = new client.Registry();
    register.setDefaultLabels({ service });
    client.collectDefaultMetrics({
        register,
        prefix: 'chatapp_',
        labels: { service }
    });

    const httpRequests = new client.Counter({
        name: 'chatapp_http_requests_total',
        help: 'Total HTTP requests handled by the service',
        labelNames: ['method', 'route', 'status_code'],
        registers: [register]
    });

    const httpDuration = new client.Histogram({
        name: 'chatapp_http_request_duration_seconds',
        help: 'HTTP request duration in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        registers: [register]
    });

    const applicationErrors = new client.Counter({
        name: 'chatapp_application_errors_total',
        help: 'Unhandled application errors',
        labelNames: ['type'],
        registers: [register]
    });

    const dependencyUp = new client.Gauge({
        name: 'chatapp_dependency_up',
        help: 'Whether a service dependency is available (1) or unavailable (0)',
        labelNames: ['dependency'],
        registers: [register]
    });

    const dependencyOperations = new client.Counter({
        name: 'chatapp_dependency_operations_total',
        help: 'Dependency operations by outcome',
        labelNames: ['dependency', 'operation', 'outcome'],
        registers: [register]
    });

    const dependencyDuration = new client.Histogram({
        name: 'chatapp_dependency_operation_duration_seconds',
        help: 'Dependency operation duration in seconds',
        labelNames: ['dependency', 'operation'],
        buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
        registers: [register]
    });

    const operations = new client.Counter({
        name: 'chatapp_operations_total',
        help: 'Important application operations by outcome',
        labelNames: ['operation', 'outcome'],
        registers: [register]
    });

    const socketConnections = new client.Gauge({
        name: 'chatapp_socket_connections',
        help: 'Current authenticated Socket.IO connections',
        registers: [register]
    });

    const socketEvents = new client.Counter({
        name: 'chatapp_socket_events_total',
        help: 'Socket.IO events processed by type and outcome',
        labelNames: ['event', 'outcome'],
        registers: [register]
    });

    const requestMiddleware = (req, res, next) => {
        const requestId = req.get('x-request-id') || randomUUID();
        const startedAt = process.hrtime.bigint();
        let recorded = false;

        req.requestId = requestId;
        req.log = logger.child({ requestId });
        res.setHeader('x-request-id', requestId);

        const recordRequest = () => {
            if (recorded) return;
            recorded = true;

            // Prometheus and container health probes should not distort product
            // traffic rates or create a repetitive log line every scrape.
            if (req.path === '/metrics' || req.path === '/health') return;

            const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
            const labels = {
                method: req.method,
                route: normalizeRoute(req),
                status_code: String(res.statusCode)
            };

            httpRequests.inc(labels);
            httpDuration.observe(labels, durationSeconds);

            const logData = {
                event: 'http_request_completed',
                method: req.method,
                path: req.originalUrl?.split('?')[0],
                route: labels.route,
                statusCode: res.statusCode,
                durationMs: Math.round(durationSeconds * 1000),
                userId: req.user?.id || req.user?._id,
                ip: req.ip
            };

            if (res.statusCode >= 500) req.log.error('HTTP request failed', logData);
            else if (res.statusCode >= 400) req.log.warn('HTTP request rejected', logData);
            else req.log.info('HTTP request completed', logData);
        };

        res.once('finish', recordRequest);
        res.once('close', recordRequest);
        next();
    };

    const metricsHandler = async (_req, res, next) => {
        try {
            res.set('Content-Type', register.contentType);
            res.end(await register.metrics());
        } catch (error) {
            next(error);
        }
    };

    const healthHandler = (_req, res) => {
        res.json({
            service,
            status: 'ok',
            uptimeSeconds: Math.round(process.uptime()),
            timestamp: new Date().toISOString()
        });
    };

    const errorHandler = (error, req, res, next) => {
        const status = error.status || error.statusCode || 500;
        applicationErrors.inc({ type: error.name || 'Error' });
        (req.log || logger).error('Unhandled request error', {
            event: 'request_error',
            error,
            method: req.method,
            path: req.originalUrl?.split('?')[0],
            statusCode: status
        });

        if (res.headersSent) return next(error);
        const response = {
            success: false,
            status,
            message: status >= 500 && process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : error.message || 'Something went wrong',
            requestId: req.requestId
        };

        if (process.env.NODE_ENV !== 'production') response.stack = error.stack;
        res.status(status).json(response);
    };

    const recordDependency = ({ dependency, operation, outcome, durationSeconds, error }) => {
        const result = outcome || (error ? 'failure' : 'success');
        dependencyOperations.inc({ dependency, operation, outcome: result });
        if (Number.isFinite(durationSeconds)) {
            dependencyDuration.observe({ dependency, operation }, durationSeconds);
        }
        dependencyUp.set({ dependency }, result === 'success' ? 1 : 0);

        if (error) {
            logger.error('Dependency operation failed', {
                event: 'dependency_failure',
                dependency,
                operation,
                durationMs: Number.isFinite(durationSeconds) ? Math.round(durationSeconds * 1000) : undefined,
                error
            });
        }
    };

    const measureDependency = async (dependency, operation, work) => {
        const startedAt = process.hrtime.bigint();
        try {
            const result = await work();
            recordDependency({
                dependency,
                operation,
                outcome: 'success',
                durationSeconds: Number(process.hrtime.bigint() - startedAt) / 1e9
            });
            return result;
        } catch (error) {
            recordDependency({
                dependency,
                operation,
                outcome: 'failure',
                durationSeconds: Number(process.hrtime.bigint() - startedAt) / 1e9,
                error
            });
            throw error;
        }
    };

    const installProcessHandlers = () => {
        process.on('uncaughtException', (error) => {
            applicationErrors.inc({ type: 'uncaughtException' });
            logger.error('Uncaught exception', { event: 'uncaught_exception', error });
            process.exit(1);
        });

        process.on('unhandledRejection', (error) => {
            applicationErrors.inc({ type: 'unhandledRejection' });
            logger.error('Unhandled promise rejection', {
                event: 'unhandled_rejection',
                error: error instanceof Error ? error : new Error(String(error))
            });
            process.exit(1);
        });

        process.on('SIGTERM', () => {
            logger.info('SIGTERM received; shutting down', { event: 'process_shutdown' });
        });
    };

    observability = {
        service,
        logger,
        register,
        requestMiddleware,
        metricsHandler,
        healthHandler,
        errorHandler,
        measureDependency,
        recordDependency,
        recordOperation: (operation, outcome = 'success') => operations.inc({ operation, outcome }),
        setSocketConnections: (count) => socketConnections.set(count),
        recordSocketEvent: (event, outcome = 'success') => socketEvents.inc({ event, outcome }),
        installProcessHandlers
    };

    return observability;
};

module.exports = { createObservability, sanitize };
