const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const { createObservability } = require('../observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;

let isConnected = false;
let pool;

const connect = async () => {
    if (isConnected) {
        logger.debug('Shared PostgreSQL pool already connected', { event: 'postgres_already_connected' });
        return;
    }

    try {
        pool = new Pool({
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

        await observability.measureDependency('postgres', 'connect', () => pool.query('SELECT 1'));
        isConnected = true;
        logger.info('Shared PostgreSQL pool connected', { event: 'postgres_connected' });
    } catch (error) {
        isConnected = false;
        throw error;
    }
};

module.exports = {
    connect,
    query: (text, params) => {
        if (!pool) return Promise.reject(new Error('Shared database pool is not initialized'));
        return observability.measureDependency('postgres', 'query', () => pool.query(text, params));
    },
    pool: () => pool
};
