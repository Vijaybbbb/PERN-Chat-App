# RabbitMQ Implementation for Reliable Message Delivery

## Overview
RabbitMQ message queue ensures no messages are lost during delivery, even if services are temporarily down.

## Installation

### Install RabbitMQ
```bash
# Ubuntu/Debian
sudo apt-get install rabbitmq-server

# macOS
brew install rabbitmq

# Start RabbitMQ
sudo systemctl start rabbitmq-server  # Linux
brew services start rabbitmq          # macOS
```

### Install Dependencies
```bash
cd "Common Microservice" && npm install
```

## Configuration
RabbitMQ settings in `.env`:
```
RABBITMQ_URL = amqp://localhost
```

## Architecture

### Message Flow
1. **Message Microservice** → Creates message in DB → Publishes to RabbitMQ queue
2. **RabbitMQ Queue** → Stores message persistently (durable queue)
3. **Socket Microservice** → Consumes from queue → Emits to connected clients

### Queues
- **messages**: Main queue for chat messages
- **notifications**: Queue for system notifications

## Features

### Reliability
- **Persistent Messages**: Messages survive RabbitMQ restarts
- **Durable Queues**: Queues survive RabbitMQ restarts
- **Acknowledgments**: Messages only removed after successful processing
- **Auto-Reconnect**: Services reconnect if RabbitMQ goes down

### Benefits
- **No Message Loss**: Messages queued even if Socket service is down
- **Decoupling**: Services don't need direct communication
- **Scalability**: Multiple Socket instances can consume from same queue
- **Retry Logic**: Failed messages can be requeued

## Message Format
```json
{
  "type": "new_message",
  "data": {
    "sender": {...},
    "content": "message text",
    "chat": {...}
  }
}
```

## Monitoring
Access RabbitMQ Management UI:
```
http://localhost:15672
Default credentials: guest/guest
```

## Testing
1. Send a message via Message Microservice
2. Stop Socket Microservice
3. Send more messages (queued in RabbitMQ)
4. Start Socket Microservice
5. All queued messages will be delivered
