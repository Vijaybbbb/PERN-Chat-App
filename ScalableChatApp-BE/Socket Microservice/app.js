const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'socket-service';
const { createObservability } = require('../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;
const { connectRabbitMQ, consumeMessages, publishMessage } = require('../Common Microservice/rabbitmqClient');
const redisClient = require('../Common Microservice/redisClient');
const { getSecret, isTokenBlacklisted } = require('../Common Microservice/common_functions/token');

const app = express();
const server = http.createServer(app);
const PORT = process.env.SOCKET_PORT || process.env.PORT || 3005;
observability.installProcessHandlers();
app.use(observability.requestMiddleware);
app.get('/health', observability.healthHandler);
app.get('/metrics', observability.metricsHandler);

// Track online users
const onlineUsers = new Map();
const roomId = (id) => String(id);

const io = socketIO(server, {
    pingTimeout: 60000,
    cors: {
        origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173',
        credentials: true
    }
});

// Socket.IO is also an authenticated API. The client sends the short-lived
// access token in the handshake so signaling cannot be spoofed with another
// user's id.
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) return next(new Error('Access token required'));

        const decoded = jwt.verify(token, getSecret('JWT_ACCESS_SECRET'));
        if (decoded.tokenType !== 'access' || await isTokenBlacklisted(token)) {
            return next(new Error('Invalid or revoked access token'));
        }

        socket.authUserId = decoded.id;
        next();
    } catch (error) {
        observability.recordSocketEvent('authentication', 'failure');
        logger.warn('Socket authentication failed', {
            event: 'socket_authentication_failed',
            socketId: socket.id,
            error
        });
        next(new Error('Socket authentication failed'));
    }
});

// Initialize RabbitMQ and consume messages
(async () => {
    try {
        await connectRabbitMQ();
    
    // Consume messages from queue and emit to socket clients
        await consumeMessages('messages', (messageData) => {
        if (messageData.type === 'new_message') {
            const message = messageData.data;
            const chat = message.chat;
            
            if (chat && chat.users) {
                chat.users.forEach(userData => {
                    if (roomId(userData.id) !== roomId(message.sender.id)) {
                        io.to(roomId(userData.id)).emit('message recieved', message);
                    }
                });
            }
        }
        });

    // Message service persists delivery/read acknowledgements and publishes
    // the aggregate status back to the sender through a separate queue.
        await consumeMessages('message_status_updates', (statusData) => {
            if (statusData.type === 'message_status_updated') {
                const status = statusData.data;
                io.to(roomId(status.senderId)).emit('message status updated', status);
            }
        });
    } catch (error) {
        logger.error('Socket message consumers failed to initialize', {
            event: 'socket_consumers_initialization_failed',
            error
        });
    }
})();

io.on('connection', (socket) => {
    observability.recordSocketEvent('connection');
    logger.info('Socket client connected', {
        event: 'socket_connected',
        socketId: socket.id,
        userId: socket.authUserId
    });

    socket.on('setup', async () => {
        try {
            const userId = roomId(socket.authUserId);
            socket.join(userId);
            socket.userId = userId;

            onlineUsers.set(userId, socket.id);
            observability.setSocketConnections(onlineUsers.size);
            await redisClient.setEx(`online:${userId}`, 300, 'true');

            socket.broadcast.emit('user online', userId);
            socket.emit('connected');
            observability.recordSocketEvent('setup');
        } catch (error) {
            observability.recordSocketEvent('setup', 'failure');
            logger.error('Socket setup failed', {
                event: 'socket_setup_failed',
                socketId: socket.id,
                userId: socket.authUserId,
                error
            });
        }
    });

    socket.on('join chat', (room) => {
        socket.join(room);
        observability.recordSocketEvent('join_chat');
    });

    socket.on('typing', (room) => socket.in(room).emit('typing'));
    
    socket.on('stop typing', (room) => socket.in(room).emit('stop typing'));

    // The client acknowledges these events as soon as the message is received
    // or the chat is opened. The acknowledgement is persisted by Message MS.
    const publishStatus = (type, messageId) => {
        if (!socket.userId || !messageId) return;

        publishMessage('message_status', {
            type,
            messageId,
            recipientId: socket.userId
        }).catch((error) => {
            observability.recordSocketEvent(type, 'failure');
            logger.error('Failed to publish message status', {
                event: 'message_status_publish_failed',
                statusType: type,
                messageId,
                userId: socket.userId,
                error
            });
        });
    };

    socket.on('message delivered', ({ messageId } = {}) => {
        publishStatus('message_delivered', messageId);
    });

    socket.on('message read', ({ messageId } = {}) => {
        publishStatus('message_read', messageId);
    });

    socket.on('messages read', (messageIds = []) => {
        messageIds.forEach((messageId) => publishStatus('message_read', messageId));
    });

    const relayCallEvent = (event, payload = {}) => {
        const { to, ...callData } = payload;
        if (!socket.userId || !to || roomId(to) === roomId(socket.userId)) return;

        io.to(roomId(to)).emit(event, {
            ...callData,
            from: socket.userId
        });
        observability.recordSocketEvent(event);
    };

    // WebRTC media stays peer-to-peer. This service only relays SDP/ICE data.
    socket.on('call-user', (payload) => relayCallEvent('incoming-call', payload));
    socket.on('call-accepted', (payload) => relayCallEvent('call-accepted', payload));
    socket.on('ice-candidate', (payload) => relayCallEvent('ice-candidate', payload));
    socket.on('call-rejected', (payload) => relayCallEvent('call-rejected', payload));
    socket.on('call-ended', (payload) => relayCallEvent('call-ended', payload));

    socket.on('new message', async (newMessageRecived) => {
        const chat = newMessageRecived.chat;
        
        if (chat && chat.users) {
            chat.users.forEach(userData => {
                if (roomId(userData.id) !== roomId(newMessageRecived.sender.id)) {
                    io.to(roomId(userData.id)).emit('message recieved', newMessageRecived);
                }
            });
        }
    });

    socket.on('get online users', async () => {
        const onlineUserIds = Array.from(onlineUsers.keys());
        socket.emit('online users', onlineUserIds);
    });

    socket.on('disconnect', async () => {
        logger.info('Socket client disconnected', {
            event: 'socket_disconnected',
            socketId: socket.id,
            userId: socket.userId
        });
        observability.recordSocketEvent('disconnect');
        try {
            if (socket.userId) {
                onlineUsers.delete(socket.userId);
                observability.setSocketConnections(onlineUsers.size);
                await redisClient.del(`online:${socket.userId}`);
                socket.broadcast.emit('user offline', socket.userId);
            }
        } catch (error) {
            observability.recordSocketEvent('disconnect_cleanup', 'failure');
            logger.error('Socket disconnect cleanup failed', {
                event: 'socket_disconnect_cleanup_failed',
                socketId: socket.id,
                userId: socket.userId,
                error
            });
        }
    });
});

// API endpoint to check online status
app.get('/online/:userId', async (req, res) => {
    try {
        const isOnline = await redisClient.get(`online:${req.params.userId}`);
        res.json({ online: !!isOnline });
    } catch (error) {
        logger.error('Failed to check online status', {
            event: 'online_status_check_failed',
            userId: req.params.userId,
            error
        });
        res.status(500).json({ error: 'Failed to check online status' });
    }
});

app.use(observability.errorHandler);

server.listen(PORT, () => {
    logger.info('Socket service started', { event: 'service_started', port: PORT });
});
