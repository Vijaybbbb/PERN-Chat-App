const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const { createObservability } = require('../../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
pool.on('error', (error) => {
    observability.recordDependency({ dependency: 'postgres', operation: 'pool', error });
});

const connect = async () => {
    try {
        await observability.measureDependency('postgres', 'connect', () => pool.query('SELECT 1'));
        logger.info('PostgreSQL pool connected', { event: 'postgres_connected' });
        
        // Create tables if they don't exist
        await createTables();
        logger.info('Database tables verified', { event: 'database_schema_verified' });
    } catch (error) {
        throw error;
    }
};

const createTables = async () => {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            pic TEXT,
            "isAdmin" BOOLEAN DEFAULT false,
            "isBlocked" BOOLEAN DEFAULT false,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    const createChatsTable = `
        CREATE TABLE IF NOT EXISTS chats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "chatName" VARCHAR(255),
            "isGroupChat" BOOLEAN DEFAULT false,
            "latestMessageId" UUID,
            "groupAdminId" UUID REFERENCES users(id),
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    const createMessagesTable = `
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "senderId" UUID NOT NULL REFERENCES users(id),
            content TEXT,
            "chatId" UUID NOT NULL REFERENCES chats(id),
            attachment JSONB,
            "messageType" VARCHAR(20) DEFAULT 'text' CHECK ("messageType" IN ('text', 'image', 'file', 'voice')),
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    
    const createChatUsersTable = `
        CREATE TABLE IF NOT EXISTS chat_users (
            "chatId" UUID REFERENCES chats(id) ON DELETE CASCADE,
            "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY ("chatId", "userId")
        );
    `;

    const createMessageDeliveriesTable = `
        CREATE TABLE IF NOT EXISTS message_deliveries (
            "messageId" UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
            "recipientId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            "deliveredAt" TIMESTAMP,
            "readAt" TIMESTAMP,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY ("messageId", "recipientId")
        );
    `;
    
    await pool.query(createUsersTable);
    await pool.query(createChatsTable);
    await pool.query(createMessagesTable);
    await pool.query(createChatUsersTable);
    await pool.query(createMessageDeliveriesTable);
};

module.exports = {
    connect,
    query: (text, params) => observability.measureDependency(
        'postgres',
        'query',
        () => pool.query(text, params)
    ),
    pool
};
