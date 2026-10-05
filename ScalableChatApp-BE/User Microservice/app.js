require('dotenv').config({ path: '../.env' });
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'user-service';
const express = require('express')
const cors = require('cors')
const app = express()
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser');
const { createObservability } = require('../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;
observability.installProcessHandlers();

// const { buildUserScema } = require('./Model/userModel')

const PORT = process.env.USER_PORT || process.env.PORT || 3001
const { connect } = require('./Model/dataBaseConnection')
const { connect: connectCommonDb } = require('../Common Microservice/common_functions/databaseConnection')

// Connect to database first
Promise.all([connect(), connectCommonDb()]).then(() => {
    const userRouter = require('./Router/user')
    //middlewares
    app.use(observability.requestMiddleware);
    app.use(express.json())
    app.use(cookieParser())
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.use(cors({
        origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173',
        credentials: true
    }));

    app.get('/health', observability.healthHandler);
    app.get('/metrics', observability.metricsHandler);
    app.use('/user', userRouter);

    app.use(observability.errorHandler);

    app.listen(PORT, () => {
        logger.info('User service started', { event: 'service_started', port: PORT });
    });
}).catch(err => {
    logger.error('User service startup failed', { event: 'service_startup_failed', error: err });
    process.exitCode = 1;
});
