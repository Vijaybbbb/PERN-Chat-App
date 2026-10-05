const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
require('dotenv').config({ path: '../.env' });
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'message-service';
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const { createObservability } = require('../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;
const { connect } = require('./Model/dataBaseConnection');
const { connect: connectCommonDb } = require('../Common Microservice/common_functions/databaseConnection');
const { connectRabbitMQ } = require('../Common Microservice/rabbitmqClient');
const { consumeStatusEvents } = require('./Controller/message');


const PORT = process.env.MESSAGE_PORT || process.env.PORT || 3004;
observability.installProcessHandlers();

// Connect to databases first, RabbitMQ can connect async
Promise.all([connect(), connectCommonDb()]).then(() => {
    const messageRouter = require('./Router/message')

    //middlewares
    app.use(observability.requestMiddleware)
    app.use(express.json())
    app.use(cookieParser())
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.use(cors({
        origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173',
        credentials: true
    }))

    app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')))
    app.get('/health', observability.healthHandler)
    app.get('/metrics', observability.metricsHandler)
    app.use('/message', messageRouter)

    // Connect RabbitMQ asynchronously (non-blocking)
    connectRabbitMQ()
        .then(() => consumeStatusEvents())
        .catch(err => logger.error('RabbitMQ initialization failed', {
            event: 'rabbitmq_initialization_failed',
            error: err
        }));

    app.use(observability.errorHandler)

    app.listen(PORT, () => {
        logger.info('Message service started', { event: 'service_started', port: PORT });
    })
}).catch(err => {
    logger.error('Message service startup failed', { event: 'service_startup_failed', error: err });
    process.exitCode = 1;
});
