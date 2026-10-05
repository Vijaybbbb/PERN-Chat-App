const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'database-service';
const { createObservability } = require('../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;
const db = require('./Model/dataBaseConnection');
observability.installProcessHandlers();

const app = express();
const PORT = process.env.DATABASE_PORT || process.env.PORT || 3003;

// Middleware
app.use(observability.requestMiddleware);
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/health', observability.healthHandler);
app.get('/metrics', observability.metricsHandler);
app.use('/api/auth', require('./Router/auth'));
app.use('/api/database', require('./Router/database'));

// Serve admin UI
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Database Microservice',
        status: 'running',
        port: PORT,
        adminUI: '/admin',
        endpoints: {
            adminLogin: 'POST /api/auth/login',
            health: '/api/database/health',
            checkTables: '/api/database/tables/check',
            createTables: 'POST /api/database/tables/create (admin)',
            dropTables: 'DELETE /api/database/tables/drop (admin)',
            resetDatabase: 'POST /api/database/reset (admin)',
            tableInfo: '/api/database/tables/:tableName/info (admin)'
        }
    });
});

// Error handling
app.use(observability.errorHandler);

const start = async () => {
    await db.connect();
    app.listen(PORT, () => {
        logger.info('Database service started', {
            event: 'service_started',
            port: PORT,
            adminPath: '/admin'
        });
    });
};

start().catch((error) => {
    logger.error('Database service startup failed', { event: 'service_startup_failed', error });
    process.exitCode = 1;
});
