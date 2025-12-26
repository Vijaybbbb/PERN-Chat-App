const db = require('../Model/dataBaseConnection');
const schemaQueries = require('../Model/schemaQueries');

const createTables = async (req, res) => {
    try {
        console.log('Creating database tables...');
        
        // Create tables in order (respecting foreign key dependencies)
        await db.query(schemaQueries.createUsersTable);
        console.log('✓ Users table created');
        
        await db.query(schemaQueries.createChatsTable);
        console.log('✓ Chats table created');
        
        await db.query(schemaQueries.createMessagesTable);
        console.log('✓ Messages table created');
        
        await db.query(schemaQueries.createChatUsersTable);
        console.log('✓ Chat_users table created');
        
        // Create indexes
        for (const indexQuery of schemaQueries.createIndexes) {
            await db.query(indexQuery);
        }
        console.log('✓ Indexes created');
        
        // Create update triggers
        // await db.query(schemaQueries.createUpdateTrigger);
        // console.log('✓ Update triggers created');
        
        res.status(200).json({
            success: true,
            message: 'All tables created successfully',
            tables: ['users', 'chats', 'messages', 'chat_users']
        });
        
    } catch (error) {
        console.error('Error creating tables:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create tables',
            error: error.message
        });
    }
};

const dropTables = async (req, res) => {
    try {
        console.log('Dropping all tables...');
        
        for (const dropQuery of schemaQueries.dropAllTables) {
            await db.query(dropQuery);
        }
        
        console.log('✓ All tables dropped');
        
        res.status(200).json({
            success: true,
            message: 'All tables dropped successfully'
        });
        
    } catch (error) {
        console.error('Error dropping tables:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to drop tables',
            error: error.message
        });
    }
};

const resetDatabase = async (req, res) => {
    try {
        console.log('Resetting database...');
        
        // Drop all tables
        for (const dropQuery of schemaQueries.dropAllTables) {
            await db.query(dropQuery);
        }
        console.log('✓ Tables dropped');
        
        // Recreate tables
        await db.query(schemaQueries.createUsersTable);
        await db.query(schemaQueries.createChatsTable);
        await db.query(schemaQueries.createMessagesTable);
        await db.query(schemaQueries.createChatUsersTable);
        console.log('✓ Tables recreated');
        
        // Create indexes
        for (const indexQuery of schemaQueries.createIndexes) {
            await db.query(indexQuery);
        }
        console.log('✓ Indexes recreated');
        
        // Create triggers
        await db.query(schemaQueries.createUpdateTrigger);
        console.log('✓ Triggers recreated');
        
        res.status(200).json({
            success: true,
            message: 'Database reset successfully'
        });
        
    } catch (error) {
        console.error('Error resetting database:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reset database',
            error: error.message
        });
    }
};

const checkTables = async (req, res) => {
    try {

        console.log(db)
        const result = await db.query(schemaQueries.checkTablesExist);
        const existingTables = result.rows.map(row => row.table_name);
        console.log(result.rows,'///////////////')
        const expectedTables = ['users', 'chats', 'messages', 'chat_users'];
        const missingTables = expectedTables.filter(table => !existingTables.includes(table));
        
        res.status(200).json({
            success: true,
            existingTables,
            missingTables,
            allTablesExist: missingTables.length === 0
        });
        
    } catch (error) {
        console.error('Error checking tables:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check tables',
            error: error.message
        });
    }
};

const getTableInfo = async (req, res) => {
    try {
        const { tableName } = req.params;
        const result = await db.query(schemaQueries.getTableInfo, [tableName]);
        
        res.status(200).json({
            success: true,
            tableName,
            columns: result.rows
        });
        
    } catch (error) {
        console.error('Error getting table info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get table info',
            error: error.message
        });
    }
};

const healthCheck = async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.status(200).json({
            success: true,
            message: 'Database connection healthy',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Database connection failed',
            error: error.message
        });
    }
};

module.exports = {
    createTables,
    dropTables,
    resetDatabase,
    checkTables,
    getTableInfo,
    healthCheck
};