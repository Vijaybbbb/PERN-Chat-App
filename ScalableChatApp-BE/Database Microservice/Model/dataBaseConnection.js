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
        console.log("Database Microservice: PostgreSQL connected");
    } catch (error) {
        console.log(error);
        console.log('Database connection failed');
    }
};

module.exports = {
    connect,
    query: (text, params) => pool.query(text, params),
    pool
};