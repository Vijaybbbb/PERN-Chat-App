const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const { createObservability } = require('../../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
pool.on('error', (error) => {
    observability.recordDependency({ dependency: 'postgres', operation: 'pool', error });
});

const connect = async () => {
    try {
        await observability.measureDependency('postgres', 'connect', () => pool.query('SELECT 1'));
        logger.info('PostgreSQL pool connected', { event: 'postgres_connected' });
    } catch (error) {
        throw error;
    }
};

module.exports = {
    connect,
    query: (text, params) => observability.measureDependency(
        'postgres',
        'query',
        () => pool.query(text, params)
    ),
    pool
};
