const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { getSecret, isTokenBlacklisted } = require('../../Common Microservice/common_functions/token');
const { createObservability } = require('../../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);

// Default admin credentials (change in production)
const ADMIN_CREDENTIALS = {
    username: process.env.DB_ADMIN_USERNAME || 'admin',
    password: process.env.DB_ADMIN_PASSWORD || 'admin123'
};

const adminLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            const token = jwt.sign(
                { username, role: 'admin' },
                getSecret('JWT_ACCESS_SECRET'),
                { expiresIn: '24h' }
            );
            
            observability.recordOperation('database_admin_login');
            req.log.info('Database admin logged in', { event: 'database_admin_login_succeeded' });
            res.status(200).json({
                success: true,
                message: 'Admin login successful',
                token
            });
        } else {
            observability.recordOperation('database_admin_login', 'failure');
            req.log.warn('Database admin login rejected', { event: 'database_admin_login_rejected' });
            res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }
    } catch (error) {
        observability.recordOperation('database_admin_login', 'failure');
        req.log.error('Database admin login failed', { event: 'database_admin_login_failed', error });
        res.status(500).json({
            success: false,
            message: 'Login failed',
            requestId: req.requestId
        });
    }
};

const verifyAdmin = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }
    
    try {
        const decoded = jwt.verify(token, getSecret('JWT_ACCESS_SECRET'));
        if (await isTokenBlacklisted(token)) {
            return res.status(401).json({
                success: false,
                message: 'Token revoked'
            });
        }
        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        req.admin = decoded;
        next();
    } catch (error) {
        req.log.warn('Database admin token rejected', { event: 'database_admin_token_rejected', error });
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
};

module.exports = {
    adminLogin,
    verifyAdmin
};
