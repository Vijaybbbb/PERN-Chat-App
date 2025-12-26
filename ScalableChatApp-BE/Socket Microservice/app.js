const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const dotenv = require('dotenv');
const path = require('path');
const { connectRabbitMQ, consumeMessages, publishMessage } = require('../Common Microservice/rabbitmqClient');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);
const PORT = process.env.SOCKET_PORT || 4004;

const io = socketIO(server, {
    pingTimeout: 60000,
    cors: {
        origin: 'http://localhost:5173',
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

    socket.on('setup', (userData) => {
        socket.join(userData);
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

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`SOCKET SERVICE RUNNING : ${PORT}`);
});
