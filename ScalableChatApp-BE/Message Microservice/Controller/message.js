const queries = require('../Model/queries');
const redisClient = require('../../Common Microservice/redisClient');
const { publishMessage } = require('../../Common Microservice/rabbitmqClient');
const { createObservability } = require('../../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;
const CACHE_TTL = process.env.CACHE_TTL || 3600;

// Lazy load db to avoid initialization issues
const getDb = () => require('../Model/dataBaseConnection');

const publishDeliveryUpdate = async (messageId) => {
    const db = getDb();
    const result = await db.query(queries.getDeliveryUpdate, [messageId]);

    if (result.rows.length > 0) {
        await publishMessage('message_status_updates', {
            type: 'message_status_updated',
            data: result.rows[0]
        });
        return result.rows[0];
    }

    return null;
};

const consumeStatusEvents = async () => {
    const db = getDb();

    await require('../../Common Microservice/rabbitmqClient').consumeMessages(
        'message_status',
        async (statusEvent) => {
            const { type, messageId, recipientId } = statusEvent;
            if (!messageId || !recipientId || !['message_delivered', 'message_read'].includes(type)) {
                logger.warn('Ignored invalid message status event', {
                    event: 'message_status_event_invalid',
                    statusType: type
                });
                return;
            }

            const statusQuery = type === 'message_read' ? queries.markRead : queries.markDelivered;
            const updated = await db.query(statusQuery, [messageId, recipientId]);

            // Ignore forged/stale acknowledgements for users who are not recipients.
            if (updated.rows.length > 0) {
                const deliveryUpdate = await publishDeliveryUpdate(messageId);
                if (deliveryUpdate?.chatId) {
                    await redisClient.del(`messages:${deliveryUpdate.chatId}`);
                }
                observability.recordOperation(type);
            }
        }
    );
};

const sendMessage = async (req, res, next) => {
    const { content, chatId, attachment, messageType } = req.body;
    if ((!content && !attachment) || !chatId) {
        req.log.warn('Message send request is invalid', {
            event: 'message_send_invalid',
            hasContent: Boolean(content),
            hasAttachment: Boolean(attachment),
            hasChatId: Boolean(chatId)
        });
        return res.status(400).json('Invalid data');
    }
    
    try {
        const db = getDb();
        // Create message
        const messageResult = await db.query(queries.createMessage, [
            req.userId,
            content || '',
            chatId,
            attachment ? JSON.stringify(attachment) : null,
            messageType || 'text'
        ]);
        
        const messageId = messageResult.rows[0].id;

        // Sent is represented by messages.createdAt. Create a delivery row for
        // every recipient so delivered/read can be tracked independently.
        await db.query(queries.createMessageDeliveries, [messageId, chatId, req.userId]);
        
        // Get message with details
        const messageWithDetailsResult = await db.query(queries.getMessageWithDetails, [messageId]);
        const populatedMessage = messageWithDetailsResult.rows[0];
        
        // Get chat users for the message
        const chatUsersResult = await db.query(queries.getChatUsers, [chatId]);
        populatedMessage.chat.users = chatUsersResult.rows;
        
        // Update latest message in chat
        await db.query(queries.updateLatestMessage, [messageId, chatId]);
        
        // Publish to RabbitMQ for reliable delivery
        await publishMessage('messages', {
            type: 'new_message',
            data: populatedMessage
        });
        
        // Invalidate cache for this chat
        await redisClient.del(`messages:${chatId}`);
        observability.recordOperation('message_send');
        return res.status(200).json(populatedMessage);
    } catch (error) {
        observability.recordOperation('message_send', 'failure');
        next(error);
    }
};

const allMessages = async (req, res, next) => {
    const chatId = req.params.chatId;
    const cacheKey = `messages:${chatId}`;
    
    try {
        const db = getDb();
        // Check cache first
        const cachedMessages = await redisClient.get(cacheKey);
        if (cachedMessages) {
            return res.status(200).json(JSON.parse(cachedMessages));
        }
        
        // Fetch from DB if not cached
        const messagesResult = await db.query(queries.getChatMessages, [chatId]);
        const messages = messagesResult.rows;
        
        // Store in cache
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(messages));
        
        res.status(200).json(messages);
    } catch (error) {
        observability.recordOperation('message_fetch', 'failure');
        next(error);
    }
};

module.exports = {
    sendMessage,
    allMessages,
    consumeStatusEvents
};
