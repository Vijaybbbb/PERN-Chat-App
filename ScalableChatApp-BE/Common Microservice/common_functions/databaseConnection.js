const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

let isConnected = false;
let pool;

const connect = async () => {
    if (isConnected) {
        console.log('Common Microservice: PostgreSQL already connected');
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
        console.log("Common Microservice: PostgreSQL Database connected");
    } catch (error) {
        console.log(error);
        console.log('Common Microservice: Connection Failed');
        isConnected = false;
    }
};

module.exports = {
    connect,
    query: (text, params) => pool.query(text, params),
    pool: () => pool
};