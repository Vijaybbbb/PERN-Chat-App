const express = require('express');
const cors = require('cors');
const app = express();
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
dotenv.config()
process.env.SERVICE_NAME = process.env.SERVICE_NAME || 'chat-service';
const { createObservability } = require('../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const { logger } = observability;
const { connect } = require('./Model/dataBaseConnection');
const { connect: connectCommonDb } = require('../Common Microservice/common_functions/databaseConnection');

observability.installProcessHandlers();
const PORT = process.env.CHAT_PORT || process.env.PORT || 3002

// Connect to database first
Promise.all([connect(), connectCommonDb()]).then(() => {
    // const userRouter = require('./Router/user')
    const chatRouter = require('./Router/chat')
    //const messageRouter = require('./Router/message')

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

    app.get('/health', observability.healthHandler)
    app.get('/metrics', observability.metricsHandler)
    app.use('/chat',chatRouter)

    app.post('/clearCookie', (req, res) => {

           try {
                  res.cookie('access_tocken', '', { expires: new Date(0) });
                  // Send a response
                  res.status(200).json('Cookie cleared');
           } catch (error) {
                  req.log.error('Failed to clear cookie', { event: 'clear_cookie_failed', error });
                  res.status(500).json({ success: false, message: 'Failed to clear cookie', requestId: req.requestId });
           }
    });

    app.use(observability.errorHandler)

    app.listen(PORT,()=>{
        logger.info('Chat service started', { event: 'service_started', port: PORT });
    })
}).catch(err => {
    logger.error('Chat service startup failed', { event: 'service_startup_failed', error: err });
    process.exitCode = 1;
});




