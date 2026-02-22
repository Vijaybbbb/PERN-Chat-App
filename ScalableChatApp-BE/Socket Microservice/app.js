const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const { connectRabbitMQ, consumeMessages, publishMessage } = require('../Common Microservice/rabbitmqClient');
const redisClient = require('../Common Microservice/redisClient');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const PORT = process.env.SOCKET_PORT || process.env.PORT || 3005;

// Track online users
const onlineUsers = new Map();

const io = socketIO(server, {
    pingTimeout: 60000,
    cors: {
        origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173',
        credentials: true
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
                    if (userData.id != message.sender.id) {
                        io.to(userData.id).emit('message recieved', message);
                    }
                });
            }
        }
    });
})();

io.on('connection', (socket) => {
    console.log('Connected to socket.io');

    socket.on('setup', async (userData) => {
        socket.join(userData);
        socket.userId = userData;
        
        // Mark user as online
        onlineUsers.set(userData, socket.id);
        await redisClient.setEx(`online:${userData}`, 300, 'true'); // 5 min expiry
        
        // Broadcast user online status
        socket.broadcast.emit('user online', userData);
        socket.emit('connected');
    });

    socket.on('join chat', (room) => {
        socket.join(room);
    });

    socket.on('typing', (room) => socket.in(room).emit('typing'));
    
    socket.on('stop typing', (room) => socket.in(room).emit('stop typing'));

    socket.on('new message', async (newMessageRecived) => {
        // Publish to RabbitMQ instead of direct emit
        await publishMessage('messages', {
            type: 'new_message',
            data: newMessageRecived
        });
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
