const redis = require('redis');
const dotenv = require('dotenv');
const path = require('path');
const { createObservability } = require('./observability');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;
const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
    }
});

redisClient.on('error', (error) => {
    observability.recordDependency({ dependency: 'redis', operation: 'connection', error });
});

redisClient.on('ready', () => {
    observability.recordDependency({ dependency: 'redis', operation: 'connection', outcome: 'success' });
    logger.info('Redis connection ready', { event: 'redis_connected' });
});

redisClient.on('reconnecting', () => {
    logger.warn('Redis reconnecting', { event: 'redis_reconnecting' });
});

redisClient.on('end', () => {
    logger.warn('Redis connection ended', { event: 'redis_connection_ended' });
});

observability.measureDependency('redis', 'connect', () => redisClient.connect())
    .catch(() => {
        // The Redis client applies its reconnect strategy and emits detailed errors.
    });

module.exports = redisClient;
