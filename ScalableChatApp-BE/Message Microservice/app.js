const express = require('express');
const cors = require('cors');
const app = express();
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { connect } = require('./Model/dataBaseConnection');
const { connect: connectCommonDb } = require('../Common Microservice/common_functions/databaseConnection');
const { connectRabbitMQ } = require('../Common Microservice/rabbitmqClient');

dotenv.config();
const PORT = process.env.MESSAGE_PORT || process.env.PORT || 3004;

// Connect to database and RabbitMQ
Promise.all([connect(), connectCommonDb(), connectRabbitMQ()]).then(() => {
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

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'ok', service: 'message-service' });
    });

    app.use('/message', messageRouter)

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
