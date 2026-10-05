const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const { createObservability } = require('../../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;

let pool;
let isConnected = false;

const connect = async () => {
    if (isConnected && pool) {
        logger.debug('PostgreSQL pool already connected', { event: 'postgres_already_connected' });
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
        logger.info('PostgreSQL pool connected', { event: 'postgres_connected' });
    } catch (error) {
        isConnected = false;
        throw error;
    }
};

module.exports = {
    connect,
    query: (text, params) => {
        if (!pool) {
            const error = new Error('Database pool not initialized. Call connect() first.');
            logger.error('Database query attempted before initialization', {
                event: 'postgres_pool_not_initialized',
                error
            });
            throw error;
        }
        return observability.measureDependency('postgres', 'query', () => pool.query(text, params));
    },
    get pool() {
        return pool;
    }
};
