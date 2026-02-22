const queries = require('../Model/queries');
const redisClient = require('../../Common Microservice/redisClient');
const { publishMessage } = require('../../Common Microservice/rabbitmqClient');
const CACHE_TTL = process.env.CACHE_TTL || 3600;

// Lazy load db to avoid initialization issues
const getDb = () => require('../Model/dataBaseConnection');

const sendMessage = async (req, res, next) => {
    const { content, chatId, attachment, messageType } = req.body;
    console.log(req.body);
    if ((!content && !attachment) || !chatId) {
        console.log('Invalid data passed into request');
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
        
        return res.status(200).json(populatedMessage);
    } catch (error) {
        console.log(error);
        res.status(500).json('Internal Server Error');
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
        console.log(error);
        res.status(500).json('Internal Server Error');
    }
};

module.exports = {
    sendMessage,
    allMessages
};