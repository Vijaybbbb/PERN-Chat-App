const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let pool;
let isConnected = false;

const connect = async () => {
    if (isConnected && pool) {
        console.log("PostgreSQL Database already connected");
        return;
    }
    
    try {
        pool = new Pool({
            host: process.env.POSTGRES_HOST,
            port: process.env.POSTGRES_PORT,
            database: process.env.POSTGRES_DB,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
        
        await pool.connect();
        isConnected = true;
        console.log("PostgreSQL Database connected");
    } catch (error) {
        console.log(error);
        console.log('Connection Failed');
        isConnected = false;
    }
};

module.exports = {
    connect,
    query: (text, params) => {
        if (!pool) {
            throw new Error('Database pool not initialized. Call connect() first.');
        }
        return pool.query(text, params);
    },
    get pool() {
        return pool;
    }
};