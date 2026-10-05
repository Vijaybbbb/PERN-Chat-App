const amqp = require('amqplib');
const dotenv = require('dotenv');
const path = require('path');
const { createObservability } = require('./observability');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;
const RETRY_DELAY_MS = Number(process.env.RABBITMQ_RETRY_DELAY_MS || 5000);
const queues = ['messages', 'notifications', 'message_status', 'message_status_updates'];

let channel;
let connection;
let connectionPromise;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const openConnection = async () => {
    const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost';
    const rabbitmqPort = process.env.RABBITMQ_PORT || 5672;
    const rabbitmqUrl = process.env.RABBITMQ_URL || `amqp://${rabbitmqHost}:${rabbitmqPort}`;

    connection = await amqp.connect(rabbitmqUrl);
    connection.on('error', (error) => {
        observability.recordDependency({ dependency: 'rabbitmq', operation: 'connection', error });
    });
    connection.on('close', () => {
        channel = undefined;
        connection = undefined;
        observability.recordDependency({
            dependency: 'rabbitmq',
            operation: 'connection',
            error: new Error('RabbitMQ connection closed')
        });
        logger.warn('RabbitMQ connection closed', { event: 'rabbitmq_connection_closed' });
    });

    channel = await connection.createChannel();
    channel.on('error', (error) => {
        observability.recordDependency({ dependency: 'rabbitmq', operation: 'channel', error });
    });

    await Promise.all(queues.map((queue) => channel.assertQueue(queue, { durable: true })));
    logger.info('RabbitMQ connected', { event: 'rabbitmq_connected' });
    return channel;
};

const connectRabbitMQ = async () => {
    if (channel) return channel;
    if (connectionPromise) return connectionPromise;

    connectionPromise = (async () => {
        while (!channel) {
            try {
                await observability.measureDependency('rabbitmq', 'connect', openConnection);
            } catch (_error) {
                logger.warn('Retrying RabbitMQ connection', {
                    event: 'rabbitmq_connection_retry',
                    retryDelayMs: RETRY_DELAY_MS
                });
                await delay(RETRY_DELAY_MS);
            }
        }
        return channel;
    })();

    try {
        return await connectionPromise;
    } finally {
        connectionPromise = undefined;
    }
};

const publishMessage = async (queue, message) => {
    const activeChannel = await connectRabbitMQ();
    try {
        await observability.measureDependency('rabbitmq', 'publish', async () => {
            const accepted = activeChannel.sendToQueue(
                queue,
                Buffer.from(JSON.stringify(message)),
                { persistent: true }
            );
            if (!accepted) await new Promise((resolve) => activeChannel.once('drain', resolve));
        });
        observability.recordOperation(`rabbitmq_publish_${queue}`);
    } catch (error) {
        observability.recordOperation(`rabbitmq_publish_${queue}`, 'failure');
        throw error;
    }
};

const consumeMessages = async (queue, callback) => {
    const activeChannel = await connectRabbitMQ();
    await activeChannel.assertQueue(queue, { durable: true });
    await activeChannel.consume(queue, async (msg) => {
        if (!msg) return;

        try {
            const content = JSON.parse(msg.content.toString());
            await callback(content);
            activeChannel.ack(msg);
            observability.recordOperation(`rabbitmq_consume_${queue}`);
        } catch (error) {
            observability.recordOperation(`rabbitmq_consume_${queue}`, 'failure');
            logger.error('RabbitMQ message processing failed', {
                event: 'rabbitmq_consumer_failed',
                queue,
                redelivered: msg.fields.redelivered,
                error
            });
            activeChannel.nack(msg, false, !msg.fields.redelivered);
        }
    }, { noAck: false });

    logger.info('RabbitMQ consumer started', { event: 'rabbitmq_consumer_started', queue });
};

module.exports = { connectRabbitMQ, publishMessage, consumeMessages };
