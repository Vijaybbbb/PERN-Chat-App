const redis = require('redis');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = process.env.REDIS_PORT || 6379;

const redisClient = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Connected'));

(async () => {
    await redisClient.connect();
})();

module.exports = redisClient;
