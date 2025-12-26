# MongoDB to PostgreSQL Migration Guide

## Prerequisites

1. Install PostgreSQL on your system
2. Create a PostgreSQL database named `mernchatapp`
3. Update the `.env` file with your PostgreSQL credentials

## Database Setup

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # macOS
   brew install postgresql
   
   # Windows
   Download from https://www.postgresql.org/download/windows/
   ```

2. **Create Database**:
   ```bash
   sudo -u postgres psql
   CREATE DATABASE mernchatapp;
   CREATE USER your_username WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE mernchatapp TO your_username;
   \q
   ```

3. **Update Environment Variables**:
   Update your `.env` file with PostgreSQL credentials:
   ```
   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_DB=mernchatapp
   POSTGRES_USER=your_username
   POSTGRES_PASSWORD=your_password
   ```

## Installation Steps

1. **Install Dependencies**:
   ```bash
   # For each microservice directory
   cd "Chat Microservice" && npm install
   cd "../Message Microservice" && npm install
   cd "../User Microservice" && npm install
   ```

2. **Run Database Migrations**:
   The Sequelize models will automatically create tables when you start the application.

## Key Changes Made

### Database Schema Conversion

1. **MongoDB ObjectId → PostgreSQL UUID**:
   - All `_id` fields converted to `id` with UUID type
   - Foreign key relationships properly defined

2. **Schema Mapping**:
   - `users` collection → `users` table
   - `chats` collection → `chats` table  
   - `messages` collection → `messages` table
   - `chat_users` junction table for many-to-many relationship

3. **Data Types**:
   - MongoDB `String` → PostgreSQL `VARCHAR/TEXT`
   - MongoDB `Boolean` → PostgreSQL `BOOLEAN`
   - MongoDB `Date` → PostgreSQL `TIMESTAMP`
   - MongoDB `Object` → PostgreSQL `JSONB`
   - MongoDB `Array` → PostgreSQL junction table

### Code Changes

1. **ORM Migration**:
   - Mongoose → Sequelize
   - MongoDB queries → SQL queries via Sequelize

2. **Model Definitions**:
   - Mongoose schemas → Sequelize models
   - Virtual fields → Sequelize associations
   - Middleware → Sequelize hooks

3. **Query Syntax**:
   - `find()` → `findAll()`
   - `findOne()` → `findOne()`
   - `create()` → `create()`
   - `findByIdAndUpdate()` → `update()` + `findByPk()`
   - `populate()` → `include` with associations

## Testing the Migration

1. **Start Services**:
   ```bash
   # Start each microservice
   cd "User Microservice" && npm run dev
   cd "Chat Microservice" && npm run dev  
   cd "Message Microservice" && npm run dev
   ```

2. **Verify Database Tables**:
   ```sql
   \c mernchatapp
   \dt
   -- Should show: users, chats, messages, chat_users tables
   ```

3. **Test API Endpoints**:
   - User registration/login
   - Chat creation
   - Message sending
   - Group operations

## Data Migration (Optional)

If you have existing MongoDB data to migrate:

1. **Export MongoDB Data**:
   ```bash
   mongoexport --db MernChatApp --collection users --out users.json
   mongoexport --db MernChatApp --collection chats --out chats.json
   mongoexport --db MernChatApp --collection messages --out messages.json
   ```

2. **Create Migration Script**:
   Write a Node.js script to read JSON files and insert into PostgreSQL using Sequelize.

## Performance Considerations

1. **Indexing**:
   - Add indexes on frequently queried fields
   - Consider composite indexes for complex queries

2. **Connection Pooling**:
   - Sequelize connection pool is configured in database connection files
   - Adjust pool settings based on load

3. **Caching**:
   - Redis caching remains unchanged
   - Consider PostgreSQL-specific caching strategies

## Troubleshooting

1. **Connection Issues**:
   - Verify PostgreSQL is running
   - Check firewall settings
   - Validate credentials in `.env`

2. **Migration Errors**:
   - Check Sequelize logs
   - Verify table schemas
   - Ensure proper associations

3. **Performance Issues**:
   - Add database indexes
   - Optimize Sequelize queries
   - Monitor connection pool usage