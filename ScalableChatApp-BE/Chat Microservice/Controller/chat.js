const queries = require('../Model/queries');
const redisClient = require('../../Common Microservice/redisClient');
const { createObservability } = require('../../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const CACHE_TTL = process.env.CACHE_TTL || 3600;

// Lazy load db to avoid initialization issues
const getDb = () => require('../Model/dataBaseConnection');

const accessChat = async (req, res, next) => {
    try {
        const db = getDb();
        const { userId } = req.params;
        if (!userId) {
            req.log.warn('Chat access rejected because userId is missing', { event: 'chat_access_invalid' });
            return res.status(400).json('Failed');
        }
        
        // Find existing chat between two users
        const existingChatResult = await db.query(queries.findExistingChat, [[req.userId, userId]]);
        
        if (existingChatResult.rows.length > 0) {
            res.send(existingChatResult.rows[0]);
        } else {
            // Create new chat
            const newChatResult = await db.query(queries.createChat, ['sender', false]);
            const newChat = newChatResult.rows[0];
            
            // Add users to chat
            await db.query(queries.addUsersToChat, [newChat.id, req.userId]);
            await db.query(queries.addUsersToChat, [newChat.id, userId]);
            
            // Get full chat with users
            const fullChatResult = await db.query(queries.getChatWithUsers, [newChat.id]);
            
            // Invalidate user chats cache
            await redisClient.del(`chats:${req.userId}`);
            await redisClient.del(`chats:${userId}`);
            
            observability.recordOperation('chat_create');
            res.status(200).json(fullChatResult.rows[0]);
        }
    } catch (error) {
        observability.recordOperation('chat_access', 'failure');
        next(error);
    }
};

const fetchChat = async (req, res, next) => {
    const cacheKey = `chats:${req.userId}`;
    
    try {
        const db = getDb();
        // Check cache
        const cachedChats = await redisClient.get(cacheKey);
        if (cachedChats) {
            return res.status(200).json(JSON.parse(cachedChats));
        }
        
        // Fetch from DB
        const chatsResult = await db.query(queries.fetchUserChats, [req.userId]);
        
        // Get users for each chat
        const chatsWithUsers = await Promise.all(chatsResult.rows.map(async (chat) => {
            const usersResult = await db.query(queries.getChatUsers, [chat.id]);
            return {
                ...chat,
                users: usersResult.rows,
                groupAdmin: chat.groupAdminName ? {
                    name: chat.groupAdminName,
                    email: chat.groupAdminEmail,
                    pic: chat.groupAdminPic
                } : null,
                latestMessage: chat.latestMessageContent ? {
                    content: chat.latestMessageContent,
                    messageType: chat.latestMessageType,
                    createdAt: chat.latestMessageTime,
                    sender: {
                        name: chat.latestMessageSenderName,
                        pic: chat.latestMessageSenderPic
                    }
                } : null
            };
        }));
        
        // Cache the results
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(chatsWithUsers));
        
        res.status(200).json(chatsWithUsers.reverse());
    } catch (error) {
        observability.recordOperation('chat_fetch', 'failure');
        next(error);
    }
};

const createGroup = async (req, res, next) => {
    try {
        const db = getDb();
        const users = req.body.users;
        if (users.length < 2) {
            return res.status(400).json('More than 2 users required');
        }
        users.push(req.userId);
        
        // Create group chat
        const groupChatResult = await db.query(queries.createChat, [req.body.name, true]);
        const groupChat = groupChatResult.rows[0];
        
        // Update with group admin
        await db.query('UPDATE chats SET "groupAdminId" = $1 WHERE id = $2', [req.userId, groupChat.id]);
        
        // Add users to group
        for (const userId of users) {
            await db.query(queries.addUsersToChat, [groupChat.id, userId]);
        }
        
        // Get full group chat
        const fullGroupChatResult = await db.query(queries.getChatWithUsers, [groupChat.id]);
        
        // Invalidate cache for all users in the group
        for (const userId of users) {
            await redisClient.del(`chats:${userId}`);
        }
        
        observability.recordOperation('group_chat_create');
        return res.status(200).json(fullGroupChatResult.rows[0]);
    } catch (error) {
        observability.recordOperation('group_chat_create', 'failure');
        next(error);
    }
};

const renameGroup = async (req, res, next) => {
    try {
        const db = getDb();
        const { chatId, chatName } = req.body;
        
        await db.query(queries.updateChatName, [chatName, chatId]);
        
        const updatedChatResult = await db.query(queries.getChatWithUsers, [chatId]);
        
        if (updatedChatResult.rows.length === 0) {
            res.status(404).json('Chat not found');
        } else {
            observability.recordOperation('group_chat_rename');
            res.status(200).json(updatedChatResult.rows[0]);
        }
    } catch (error) {
        observability.recordOperation('group_chat_rename', 'failure');
        next(error);
    }
};

const addToGroup = async (req, res, next) => {
    try {
        const db = getDb();
        const { chatId, userId } = req.body;
        
        await db.query(queries.addUserToGroup, [chatId, userId]);
        
        const updatedChatResult = await db.query(queries.getChatWithUsers, [chatId]);
        
        if (updatedChatResult.rows.length === 0) {
            res.status(404).json('Chat not Found');
        } else {
            observability.recordOperation('group_chat_add_user');
            res.status(200).json(updatedChatResult.rows[0]);
        }
    } catch (error) {
        observability.recordOperation('group_chat_add_user', 'failure');
        next(error);
    }
};

const removeFromGroup = async (req, res, next) => {
    try {
        const db = getDb();
        const { chatId, userId } = req.body;
        
        await db.query(queries.removeUserFromGroup, [chatId, userId]);
        
        const updatedChatResult = await db.query(queries.getChatWithUsers, [chatId]);
        
        if (updatedChatResult.rows.length === 0) {
            res.status(404).json('Chat not Found');
        } else {
            observability.recordOperation('group_chat_remove_user');
            res.status(200).json(updatedChatResult.rows[0]);
        }
    } catch (error) {
        observability.recordOperation('group_chat_remove_user', 'failure');
        next(error);
    }
};

module.exports = {
    accessChat,
    fetchChat,
    createGroup,
    renameGroup,
    addToGroup,
    removeFromGroup
};
