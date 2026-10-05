const schemaQueries = require('../Model/schemaQueries');
const { createObservability } = require('../../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);

// Lazy load db to avoid initialization issues
const getDb = () => require('../Model/dataBaseConnection');

const createTables = async (req, res) => {
    try {
        const db = getDb();
        req.log.info('Creating database tables', { event: 'database_tables_create_started' });
        
        // Create tables in order (respecting foreign key dependencies)
        await db.query(schemaQueries.createUsersTable);
        
        await db.query(schemaQueries.createChatsTable);
        
        await db.query(schemaQueries.createMessagesTable);
        
        await db.query(schemaQueries.createChatUsersTable);

        await db.query(schemaQueries.createMessageDeliveriesTable);
        
        // Create indexes
        for (const indexQuery of schemaQueries.createIndexes) {
            await db.query(indexQuery);
        }
        observability.recordOperation('database_tables_create');
        req.log.info('Database tables created', { event: 'database_tables_created' });
        res.status(200).json({
            success: true,
            message: 'All tables created successfully',
            tables: ['users', 'chats', 'messages', 'chat_users', 'message_deliveries']
        });
        
    } catch (error) {
        observability.recordOperation('database_tables_create', 'failure');
        req.log.error('Failed to create database tables', { event: 'database_tables_create_failed', error });
        res.status(500).json({
            success: false,
            message: 'Failed to create tables',
            error: error.message
        });
    }
};

const dropTables = async (req, res) => {
    try {
        const db = getDb();
        req.log.warn('Dropping all database tables', { event: 'database_tables_drop_started' });
        
        for (const dropQuery of schemaQueries.dropAllTables) {
            await db.query(dropQuery);
        }
        
        observability.recordOperation('database_tables_drop');
        req.log.warn('All database tables dropped', { event: 'database_tables_dropped' });
        res.status(200).json({
            success: true,
            message: 'All tables dropped successfully'
        });
        
    } catch (error) {
        observability.recordOperation('database_tables_drop', 'failure');
        req.log.error('Failed to drop database tables', { event: 'database_tables_drop_failed', error });
        res.status(500).json({
            success: false,
            message: 'Failed to drop tables',
            error: error.message
        });
    }
};

const resetDatabase = async (req, res) => {
    try {
        const db = getDb();
        req.log.warn('Resetting database', { event: 'database_reset_started' });
        
        // Drop all tables
        for (const dropQuery of schemaQueries.dropAllTables) {
            await db.query(dropQuery);
        }
        // Recreate tables
        await db.query(schemaQueries.createUsersTable);
        await db.query(schemaQueries.createChatsTable);
        await db.query(schemaQueries.createMessagesTable);
        await db.query(schemaQueries.createChatUsersTable);
        await db.query(schemaQueries.createMessageDeliveriesTable);
        // Create indexes
        for (const indexQuery of schemaQueries.createIndexes) {
            await db.query(indexQuery);
        }
        // Create triggers
        await db.query(schemaQueries.createUpdateTrigger);
        observability.recordOperation('database_reset');
        req.log.warn('Database reset completed', { event: 'database_reset_completed' });
        res.status(200).json({
            success: true,
            message: 'Database reset successfully'
        });
        
    } catch (error) {
        observability.recordOperation('database_reset', 'failure');
        req.log.error('Database reset failed', { event: 'database_reset_failed', error });
        res.status(500).json({
            success: false,
            message: 'Failed to reset database',
            error: error.message
        });
    }
};

const checkTables = async (req, res) => {
    try {
        const db = getDb();
        const result = await db.query(schemaQueries.checkTablesExist);
        const existingTables = result.rows.map(row => row.table_name);
        const expectedTables = ['users', 'chats', 'messages', 'chat_users', 'message_deliveries'];
        const missingTables = expectedTables.filter(table => !existingTables.includes(table));
        
        res.status(200).json({
            success: true,
            existingTables,
            missingTables,
            allTablesExist: missingTables.length === 0
        });
        
    } catch (error) {
        req.log.error('Failed to check database tables', { event: 'database_tables_check_failed', error });
        res.status(500).json({
            success: false,
            message: 'Failed to check tables',
            error: error.message
        });
    }
};

const getTableInfo = async (req, res) => {
    try {
        const db = getDb();
        const { tableName } = req.params;
        const result = await db.query(schemaQueries.getTableInfo, [tableName]);
        
        res.status(200).json({
            success: true,
            tableName,
            columns: result.rows
        });
        
    } catch (error) {
        req.log.error('Failed to get table information', {
            event: 'database_table_info_failed',
            tableName: req.params.tableName,
            error
        });
        res.status(500).json({
            success: false,
            message: 'Failed to get table info',
            error: error.message
        });
    }
};

const healthCheck = async (req, res) => {
    try {
        const db = getDb();
        await db.query('SELECT 1');
        res.status(200).json({
            success: true,
            message: 'Database connection healthy',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        req.log.error('Database health check failed', { event: 'database_health_check_failed', error });
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
