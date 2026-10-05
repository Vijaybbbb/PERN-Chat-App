#!/usr/bin/env node

const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'database-cli';
const { createObservability } = require('../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
});

const schemaQueries = require('./Model/schemaQueries');
const query = (text, params) => observability.measureDependency(
    'postgres',
    'query',
    () => pool.query(text, params)
);

const commands = {
    async create() {
        logger.info('Creating database tables', { event: 'database_tables_create_started' });
        
        await query(schemaQueries.createUsersTable);
        
        await query(schemaQueries.createChatsTable);
        
        await query(schemaQueries.createMessagesTable);
        
        await query(schemaQueries.createChatUsersTable);

        await query(schemaQueries.createMessageDeliveriesTable);
        
        for (const indexQuery of schemaQueries.createIndexes) {
            await query(indexQuery);
        }
        
        await query(schemaQueries.createUpdateTrigger);
        
        logger.info('Database setup completed', { event: 'database_tables_created' });
    },
    
    async drop() {
        logger.warn('Dropping all database tables', { event: 'database_tables_drop_started' });
        
        for (const dropQuery of schemaQueries.dropAllTables) {
            await query(dropQuery);
        }
        
        logger.warn('All database tables dropped', { event: 'database_tables_dropped' });
    },
    
    async reset() {
        await commands.drop();
        await commands.create();
        logger.warn('Database reset completed', { event: 'database_reset_completed' });
    },
    
    async check() {
        const result = await query(schemaQueries.checkTablesExist);
        const existingTables = result.rows.map(row => row.table_name);
        
        logger.info('Database tables checked', { event: 'database_tables_checked', existingTables });
        
        const expectedTables = ['users', 'chats', 'messages', 'chat_users', 'message_deliveries'];
        const missingTables = expectedTables.filter(table => !existingTables.includes(table));
        
        if (missingTables.length > 0) {
            logger.warn('Required database tables are missing', { event: 'database_tables_missing', missingTables });
        } else {
            logger.info('All required database tables exist', { event: 'database_tables_healthy' });
        }
    }
};

const command = process.argv[2];

if (!command || !commands[command]) {
    process.stdout.write(`
Usage: node dbcli.js <command>

Commands:
  create  - Create all database tables
  drop    - Drop all database tables
  reset   - Drop and recreate all tables
  check   - Check which tables exist

Examples:
  node dbcli.js create
  node dbcli.js reset
  node dbcli.js check
    `);
    process.exit(1);
}

commands[command]()
    .then(() => {
        logger.info('Database command completed', { event: 'database_command_completed', command });
        process.exit(0);
    })
    .catch(error => {
        logger.error('Database command failed', { event: 'database_command_failed', command, error });
        process.exit(1);
    });
