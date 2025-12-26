# Microservice MongoDB Connection Fix

## Problem
The error `MongooseError: Operation 'chats.find()' buffering timed out after 10000ms` was occurring because:

1. Each microservice runs as a **separate Node.js process**
2. Each process has its **own mongoose instance**
3. Models were being imported from other microservices, but mongoose models are tied to the specific mongoose instance that created them
4. The Chat Microservice was using a shared database connection from Common Microservice, but the models weren't registered on that connection

## Solution
Each microservice now:
- Uses its **own database connection** (from its local `Model/dataBaseConnection.js`)
- Has its **own copy of all models** it needs to reference
- Operates independently without cross-microservice model imports

## Changes Made

### 1. Chat Microservice (`/Chat Microservice/app.js`)
- Changed from: `require('../Common Microservice/common_functions/databaseConnection')`
- Changed to: `require('./Model/dataBaseConnection')`

### 2. User Microservice (`/User Microservice/app.js`)
- Changed from: `require('../Common Microservice/common_functions/databaseConnection')`
- Changed to: `require('./Model/dataBaseConnection')`

### 3. Message Microservice (`/Message Microservice/app.js`)
- Changed from: `require('../Common Microservice/common_functions/databaseConnection')`
- Changed to: `require('./Model/dataBaseConnection')`

### 4. Message Microservice Models
- Created `/Message Microservice/Model/chatModel.js` (local copy)
- Created `/Message Microservice/Model/userModel.js` (local copy)
- Updated `/Message Microservice/Controller/message.js` to use local models

## Architecture Pattern
```
Each Microservice:
├── Model/
│   ├── dataBaseConnection.js  (own connection)
│   ├── userModel.js           (own copy)
│   ├── chatModel.js           (own copy)
│   └── messageModel.js        (own copy)
├── Controller/
├── Router/
└── app.js
```

## Why This Works
- Each microservice connects to the **same MongoDB database** but with its **own mongoose connection**
- Models are registered on each microservice's mongoose instance
- All microservices share the same collections (users, chats, messages) in MongoDB
- No cross-process model sharing issues

## Testing
Restart all microservices and verify:
1. All services connect to MongoDB successfully
2. Chat operations work without timeout errors
3. Message operations work correctly
4. User operations work correctly
