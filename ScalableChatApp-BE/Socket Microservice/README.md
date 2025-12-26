# Socket Microservice

A standalone Socket.io microservice for real-time chat functionality.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the service:
```bash
npm run dev
```

## Port
- Default: 4004 (configured in .env as SOCKET_PORT)

## Socket Events

### Client to Server:
- `setup` - Join user to their personal room
- `join chat` - Join a specific chat room
- `typing` - Broadcast typing indicator
- `stop typing` - Broadcast stop typing indicator
- `new message` - Broadcast new message to chat participants

### Server to Client:
- `connected` - Confirmation of connection
- `typing` - User is typing
- `stop typing` - User stopped typing
- `message recieved` - New message received

## Frontend Connection
Update your frontend to connect to: `http://localhost:4004`
