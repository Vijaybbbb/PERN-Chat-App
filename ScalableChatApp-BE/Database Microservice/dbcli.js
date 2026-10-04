#!/usr/bin/env node

const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
});

const schemaQueries = require('./Model/schemaQueries');

const commands = {
    async create() {
        console.log('Creating database tables...');
        
        await pool.query(schemaQueries.createUsersTable);
        console.log('✓ Users table created');
        
        await pool.query(schemaQueries.createChatsTable);
        console.log('✓ Chats table created');
        
        await pool.query(schemaQueries.createMessagesTable);
        console.log('✓ Messages table created');
        
        await pool.query(schemaQueries.createChatUsersTable);
        console.log('✓ Chat_users table created');

        await pool.query(schemaQueries.createMessageDeliveriesTable);
        console.log('✓ Message_deliveries table created');
        
        for (const indexQuery of schemaQueries.createIndexes) {
            await pool.query(indexQuery);
        }
        console.log('✓ Indexes created');
        
        await pool.query(schemaQueries.createUpdateTrigger);
        console.log('✓ Update triggers created');
        
        console.log('Database setup completed successfully!');
    },
    
    async drop() {
        console.log('Dropping all tables...');
        
        for (const dropQuery of schemaQueries.dropAllTables) {
            await pool.query(dropQuery);
        }
        
        console.log('All tables dropped successfully!');
    },
    
    async reset() {
        await commands.drop();
        await commands.create();
        console.log('Database reset completed!');
    },
    
    async check() {
        const result = await pool.query(schemaQueries.checkTablesExist);
        const existingTables = result.rows.map(row => row.table_name);
        
        console.log('Existing tables:', existingTables);
        
        const expectedTables = ['users', 'chats', 'messages', 'chat_users', 'message_deliveries'];
        const missingTables = expectedTables.filter(table => !existingTables.includes(table));
        
        if (missingTables.length > 0) {
            console.log('Missing tables:', missingTables);
        } else {
            console.log('✓ All required tables exist');
        }
    }
};

const command = process.argv[2];

if (!command || !commands[command]) {
    console.log(`
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
        console.log('Command completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('Error:', error.message);
        process.exit(1);
    });
