const express = require('express')
const cors = require('cors')
const app = express()
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser');

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('UNCAUGHT EXCEPTION:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
    process.exit(1);
});

// const { buildUserScema } = require('./Model/userModel')


dotenv.config()
const PORT = process.env.USER_PORT || process.env.PORT || 3001
const { connect } = require('./Model/dataBaseConnection')

// Connect to database first
connect().then(() => {
    const userRouter = require('./Router/user')
    //middlewares

    // Log all incoming requests
    app.use((req, res, next) => {
        console.log(`Incoming request: ${req.method} ${req.url}`);
        next();
    });

    app.use(express.json())
    app.use(cookieParser())
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    app.use(cors({
        origin: process.env.NODE_ENV === 'production' ? true : 'http://localhost:5173',
        credentials: true
    }));

    app.use('/user', userRouter);

    // Simple test endpoint
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    app.use((err, req, res, next) => {
        const errorStatus = err.status || 500
        const errorMessage = err.message || 'Something Went Wrong'
        return res.status(errorStatus).json({
            success: false,
            status: errorStatus,
            message: errorMessage,
            stack: err.stack
        })
    });

app.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
}).catch(err => {
    console.error('Database connection failed:', err);
});
