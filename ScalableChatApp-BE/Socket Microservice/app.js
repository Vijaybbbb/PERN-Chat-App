const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const path = require('path');
const { connectRabbitMQ, consumeMessages, publishMessage } = require('../Common Microservice/rabbitmqClient');
const redisClient = require('../Common Microservice/redisClient');
const { getSecret, isTokenBlacklisted } = require('../Common Microservice/common_functions/token');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const PORT = process.env.SOCKET_PORT || process.env.PORT || 3005;

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
        next(new Error('Socket authentication failed'));
    }
});

// Initialize RabbitMQ and consume messages
(async () => {
    await connectRabbitMQ();
    
    // Consume messages from queue and emit to socket clients
    consumeMessages('messages', (messageData) => {
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
    consumeMessages('message_status_updates', (statusData) => {
        if (statusData.type === 'message_status_updated') {
            const status = statusData.data;
            io.to(roomId(status.senderId)).emit('message status updated', status);
        }
    });
})();

io.on('connection', (socket) => {
    console.log('Connected to socket.io');

    socket.on('setup', async () => {
        const userId = roomId(socket.authUserId);
        socket.join(userId);
        socket.userId = userId;
        
        // Mark user as online
        onlineUsers.set(userId, socket.id);
        await redisClient.setEx(`online:${userId}`, 300, 'true'); // 5 min expiry
        
        // Broadcast user online status
        socket.broadcast.emit('user online', userId);
        socket.emit('connected');
    });

    socket.on('join chat', (room) => {
        socket.join(room);
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
        console.log('User disconnected');
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
            await redisClient.del(`online:${socket.userId}`);
            socket.broadcast.emit('user offline', socket.userId);
        }
    });
});

// API endpoint to check online status
app.get('/online/:userId', async (req, res) => {
    try {
        const isOnline = await redisClient.get(`online:${req.params.userId}`);
        res.json({ online: !!isOnline });
    } catch (error) {
        res.status(500).json({ error: 'Failed to check online status' });
    }
});

server.listen(PORT, () => {
    console.log(`SOCKET SERVICE RUNNING : ${PORT}`);
});
