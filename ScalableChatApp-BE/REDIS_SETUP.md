# Redis Caching Implementation

## Overview
Redis caching has been implemented across all microservices to improve performance and reduce database load.

## Installation

### Install Redis
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Start Redis
redis-server
```

### Install Dependencies
```bash
cd "Common Microservice" && npm install
```

## Configuration
Redis settings in `.env`:
```
REDIS_HOST = localhost
REDIS_PORT = 6379
CACHE_TTL = 3600
```

## Cached Data

### Message Microservice
- **Messages by Chat**: `messages:{chatId}` - All messages for a specific chat
- **Cache Invalidation**: When new message is sent

### Chat Microservice
- **User Chats**: `chats:{userId}` - All chats for a user
- **Cache Invalidation**: When chat is created, user added/removed from group

### User Microservice
- **User Search**: `users:search:{query}:{userId}` - Search results for users
- **TTL**: 1 hour (configurable via CACHE_TTL)

## Benefits
- Reduced database queries
- Faster response times
- Better scalability
- Lower database load

## Cache Strategy
- **Read-through**: Check cache first, fetch from DB if miss
- **Write-through**: Invalidate cache on data modification
- **TTL**: Auto-expire after configured time (default: 1 hour)
