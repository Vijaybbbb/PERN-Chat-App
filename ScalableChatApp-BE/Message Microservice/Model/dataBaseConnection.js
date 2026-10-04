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

        // Idempotent migration for existing installations. The database
        // service/dbcli also creates this table during normal setup.
        await pool.query(`
            CREATE TABLE IF NOT EXISTS message_deliveries (
                "messageId" UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
                "recipientId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                "deliveredAt" TIMESTAMP,
                "readAt" TIMESTAMP,
                "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY ("messageId", "recipientId")
            );
        `);
    } catch (error) {
        console.log(error);
        console.log('Connection Failed');
    }
};

module.exports = {
    connect,
    query: (text, params) => pool.query(text, params),
    pool
};
