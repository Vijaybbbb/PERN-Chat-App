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
- `message delivered` - A recipient has received a message
- `message read` - A recipient has opened/read a message
- `messages read` - Mark several messages as read when opening a chat

### Server to Client:
- `connected` - Confirmation of connection
- `typing` - User is typing
- `stop typing` - User stopped typing
- `message recieved` - New message received
- `message status updated` - Sender receives aggregate sent/delivered/read counts

### WebRTC signaling events:
- `call-user` / `incoming-call` - Start an offer exchange
- `call-accepted` - Return the callee's SDP answer
- `ice-candidate` - Exchange network candidates
- `call-rejected` - Decline an incoming call
- `call-ended` - End an active call

The Socket service only relays signaling data. Audio/video remains peer-to-peer
through WebRTC.

## Frontend Connection
Update your frontend to connect to: `http://localhost:4004`
