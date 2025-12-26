const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

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
                process.env.JWT_SECRET_KEY,
                { expiresIn: '24h' }
            );
            
            res.status(200).json({
                success: true,
                message: 'Admin login successful',
                token
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: error.message
        });
    }
};

const verifyAdmin = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'No token provided'
        });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        req.admin = decoded;
        next();
    } catch (error) {
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