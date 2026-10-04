# Chat Line

![Chat Line](https://img.shields.io/badge/Chat%20Line-real--time%20messaging-249bd9?style=for-the-badge)
![Architecture](https://img.shields.io/badge/architecture-microservices-6f4eab?style=for-the-badge)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)

Chat Line is a production-oriented real-time messaging platform built with the PERN stack and a containerized microservices architecture. It combines reliable messaging, delivery/read receipts, secure authentication, AI assistance, and peer-to-peer video calling in one focused chat experience.

## Highlights

- Real-time one-to-one and group messaging
- Message lifecycle tracking: sent, delivered, and read
- RabbitMQ-backed message delivery and Socket.IO updates
- Redis caching, token blacklisting, refresh-token rotation, and per-user rate limiting
- Secure JWT access and refresh authentication
- One-to-one WebRTC video calls using the Socket service for signaling
- AI group-chat summaries with key points and action items
- AI smart-reply suggestions powered by Amazon Bedrock Nova Micro
- File, image, and voice-message support
- Responsive dark-first interface with light-mode toggle
- PostgreSQL persistence with Docker-based local development

## Architecture

```text
React + Chakra UI frontend
          │
          ├── User Microservice       Authentication and profiles
          ├── Chat Microservice       Conversations and groups
          ├── Message Microservice    Messages, uploads, receipts, AI
          ├── Socket Microservice     Realtime events and WebRTC signaling
          └── Database Microservice   Database administration
                    │
          PostgreSQL · Redis · RabbitMQ
```

The browser never sends chat history directly to Bedrock. AI requests are authenticated by the Message Microservice, authorized against chat membership, limited by rate limiting, cached in Redis, and restricted to recent text messages.

## Technology

**Frontend:** React, Vite, Chakra UI, Redux Toolkit, Socket.IO Client

**Backend:** Node.js, Express, PostgreSQL, Socket.IO, RabbitMQ, Redis

**AI and media:** Amazon Bedrock Converse API, WebRTC, S3-compatible/local attachment storage

**Operations:** Docker Compose, Nginx, JWT access/refresh tokens

## Run locally

### Prerequisites

- Docker Desktop with Compose
- Git
- An AWS account only if you want to use the AI features

### Configure environment variables

```bash
cp .env.example .env
cp ScalableChatApp-BE/.env.example ScalableChatApp-BE/.env
```

Generate two different secrets and place them in both environment files:

```bash
openssl rand -hex 32
openssl rand -hex 32
```

Never commit either `.env` file or real AWS credentials.

### Start the stack

```bash
docker compose up -d --build
docker compose ps
```

Open the application at [http://localhost:8080](http://localhost:8080).

Useful local services:

| Service | URL or port |
| --- | --- |
| Frontend | `http://localhost:8080` |
| RabbitMQ management | `http://localhost:15672` |
| PostgreSQL | `localhost:5433` |
| Redis | `localhost:6379` |

## Enable AI features

AI is optional. Add the following values to `ScalableChatApp-BE/.env`:

```env
BEDROCK_ENABLED=true
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-micro-v1:0
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

In production, use an EC2/ECS IAM role instead of static credentials. Enable Nova Micro model access in Bedrock and allow the runtime role to invoke the model. See [BEDROCK_SETUP.md](ScalableChatApp-BE/BEDROCK_SETUP.md).

The AI endpoints are:

```text
GET /message/ai/summary/:chatId
GET /message/ai/smart-replies/:chatId
```

## Development checks

```bash
docker compose logs --tail=100 message-service socket-service
docker compose build frontend message-service
docker compose config --quiet
```

## Security notes

- Access tokens are short-lived and refresh tokens rotate on use.
- Revoked tokens are blacklisted through Redis.
- Protected routes require JWT authentication and chat membership checks.
- AI requests are rate-limited and do not include file or binary attachments.
- Production deployments should use HTTPS, secure cookies, IAM roles, and a TURN server for reliable WebRTC connectivity.

## Project structure

```text
ScalableChatApp-FE/                    React frontend
ScalableChatApp-BE/User Microservice/  Users and authentication
ScalableChatApp-BE/Chat Microservice/  Chats and groups
ScalableChatApp-BE/Message Microservice/ Messages, files, AI
ScalableChatApp-BE/Socket Microservice/ Realtime and WebRTC signaling
ScalableChatApp-BE/Database Microservice/ Database utilities
ScalableChatApp-BE/Common Microservice/ Shared auth, Redis, RabbitMQ code
```

## License

This project is maintained as a portfolio and learning project. Add your preferred license before distributing it publicly.
