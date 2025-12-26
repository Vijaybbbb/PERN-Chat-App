const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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

const connect = async () => {
    try {
        await pool.connect();
        console.log("PostgreSQL Database connected");
        
        // Create tables if they don't exist
        await createTables();
        console.log("Tables created/verified");
    } catch (error) {
        console.log(error);
        console.log('Connection Failed');
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
    
    await pool.query(createUsersTable);
    await pool.query(createChatsTable);
    await pool.query(createMessagesTable);
    await pool.query(createChatUsersTable);
};

module.exports = {
    connect,
    query: (text, params) => pool.query(text, params),
    pool
};