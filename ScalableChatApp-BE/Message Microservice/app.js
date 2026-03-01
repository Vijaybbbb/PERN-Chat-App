const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config({ path: '../.env' });
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { connect } = require('./Model/dataBaseConnection');
const { connect: connectCommonDb } = require('../Common Microservice/common_functions/databaseConnection');
const { connectRabbitMQ } = require('../Common Microservice/rabbitmqClient');


const PORT = process.env.MESSAGE_PORT || process.env.PORT || 3004;

// Connect to databases first, RabbitMQ can connect async
Promise.all([connect(), connectCommonDb()]).then(() => {
    const messageRouter = require('./Router/message')

    //middlewares
    app.use(express.json())
    app.use(cookieParser())
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.use(cors({
        origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173',
        credentials: true
    }))

    app.use('/message', messageRouter)

    // Connect RabbitMQ asynchronously (non-blocking)
    connectRabbitMQ().catch(err => console.error('RabbitMQ initial connection failed:', err));

    app.use((err, req, res, next) => {
        const errorStatus = err.status || 500
        const errorMessage = err.message || 'Something Went Wrong'

        return res.status(errorStatus).json({
            success: false,
            status: errorStatus,
            message: errorMessage,
            stack: err.stack
        })
    })

    app.listen(PORT, () => { console.log(`MESSAGE SERVICE RUNNING : ${PORT}`) })
}).catch(err => {
    console.error('Database connection failed:', err);
});
