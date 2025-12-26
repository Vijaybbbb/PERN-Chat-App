const schemaQueries = {
    // Create users table
    createUsersTable: `
   
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
    `,
    
    // Create chats table
    createChatsTable: `
     
        CREATE TABLE IF NOT EXISTS chats (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "chatName" VARCHAR(255),
            "isGroupChat" BOOLEAN DEFAULT false,
            "latestMessageId" UUID,
            "groupAdminId" UUID REFERENCES users(id),
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `,
    
    // Create messages table
    createMessagesTable: `
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
    `,
    
    // Create chat_users junction table
    createChatUsersTable: `
        CREATE TABLE IF NOT EXISTS chat_users (
            "chatId" UUID REFERENCES chats(id) ON DELETE CASCADE,
            "userId" UUID REFERENCES users(id) ON DELETE CASCADE,
            "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY ("chatId", "userId")
        );
    `,
    
    // Create indexes for better performance
    createIndexes: [
        'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
        'CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages("chatId");',
        'CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages("senderId");',
        'CREATE INDEX IF NOT EXISTS idx_chat_users_chat_id ON chat_users("chatId");',
        'CREATE INDEX IF NOT EXISTS idx_chat_users_user_id ON chat_users("userId");',
        'CREATE INDEX IF NOT EXISTS idx_chats_group_admin ON chats("groupAdminId");',
        'CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages("createdAt");'
    ],
    
    // Drop all tables (for reset)
    dropAllTables: [
        'DROP TABLE IF EXISTS chat_users CASCADE;',
        'DROP TABLE IF EXISTS messages CASCADE;',
        'DROP TABLE IF EXISTS chats CASCADE;',
        'DROP TABLE IF EXISTS users CASCADE;'
    ],
    
    // Check if tables exist
    checkTablesExist: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'chats', 'messages', 'chat_users');
    `,
    
    // Get table info
    getTableInfo: `
        SELECT 
            table_name,
            column_name,
            data_type,
            is_nullable,
            column_default
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position;
    `,
    
    // Add foreign key constraint for latest message
    addLatestMessageConstraint: `
        ALTER TABLE chats 
        ADD CONSTRAINT fk_chats_latest_message 
        FOREIGN KEY ("latestMessageId") REFERENCES messages(id);
    `,
    
    // Update trigger for updatedAt
    createUpdateTrigger: `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW."updatedAt" = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        CREATE TRIGGER update_chat_users_updated_at BEFORE UPDATE ON chat_users 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `
};

module.exports = schemaQueries;