const amqp = require('amqplib');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

let channel, connection;

const connectRabbitMQ = async () => {
    try {
        const rabbitmqHost = process.env.RABBITMQ_HOST || 'localhost';
        const rabbitmqPort = process.env.RABBITMQ_PORT || 5672;
        const rabbitmqUrl = process.env.RABBITMQ_URL || `amqp://${rabbitmqHost}:${rabbitmqPort}`;
        
        connection = await amqp.connect(rabbitmqUrl);
        channel = await connection.createChannel();
        
        await channel.assertQueue('messages', { durable: true });
        await channel.assertQueue('notifications', { durable: true });
        await channel.assertQueue('message_status', { durable: true });
        await channel.assertQueue('message_status_updates', { durable: true });
        
        console.log('RabbitMQ Connected');
        return channel;
    } catch (error) {
        console.error('RabbitMQ Connection Error:', error);
        setTimeout(connectRabbitMQ, 5000);
    }
};

const publishMessage = async (queue, message) => {
    try {
        if (!channel) await connectRabbitMQ();
        channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
    } catch (error) {
        console.error('Publish Error:', error);
    }
};

const consumeMessages = async (queue, callback) => {
    try {
        if (!channel) await connectRabbitMQ();
        await channel.assertQueue(queue, { durable: true });
        await channel.consume(queue, async (msg) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    await callback(content);
                    channel.ack(msg);
                } catch (error) {
                    console.error(`RabbitMQ consumer error for ${queue}:`, error);
                    // Leave the message unacknowledged so RabbitMQ can redeliver it.
                }
            }
        }, { noAck: false });
    } catch (error) {
        console.error('Consume Error:', error);
    }
};

module.exports = { connectRabbitMQ, publishMessage, consumeMessages };
