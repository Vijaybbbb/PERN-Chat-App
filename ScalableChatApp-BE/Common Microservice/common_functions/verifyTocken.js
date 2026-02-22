const jwt = require('jsonwebtoken');
const { createError } = require('./error.js');
const queries = require('./queries.js');
const redisClient = require('../redisClient.js');

// Lazy load db to avoid initialization issues
const getDb = () => require('./databaseConnection.js');

const verifyToken = async (req, res, next) => {
    try {
        const accessToken = req.cookies.access_token || req.headers.authorization?.split(' ')[1];
        
        if (!accessToken) {
            return next(createError(401, 'Access token not provided'));
        }
        
        // Verify access token
        jwt.verify(accessToken, process.env.JWT_SECRET_KEY, async (err, decoded) => {
            if (err) {
                if (err.name === 'TokenExpiredError') {
                    // Try to refresh token automatically
                    return await handleTokenRefresh(req, res, next);
                }
                return next(createError(401, 'Invalid access token'));
            }
            
            // Get user from PostgreSQL
            const db = getDb();
            const userResult = await db.query(queries.findUserById, [decoded.id]);
            
            if (userResult.rows.length === 0) {
                return next(createError(401, 'User not found'));
            }
            
            const user = userResult.rows[0];
            
            if (user.isBlocked === true) {
                return next(createError(401, 'User Blocked'));
            }
            
            req.userId = decoded.id;
            req.user = user;
            next();
        });
        
    } catch (error) {
        console.log('Token verification error:', error);
        return next(createError(500, 'Internal server error'));
    }
};

const handleTokenRefresh = async (req, res, next) => {
    try {
        const refreshToken = req.cookies.refresh_token;
        
        if (!refreshToken) {
            return next(createError(401, 'Refresh token not provided'));
        }
        
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET_KEY);
        
        // Check if refresh token exists in Redis
        const storedToken = await redisClient.get(`refresh_token:${decoded.id}`);
        if (!storedToken || storedToken !== refreshToken) {
            return next(createError(401, 'Invalid refresh token'));
        }
        
        // Generate new access token
        const newAccessToken = jwt.sign(
            { id: decoded.id, isAdmin: decoded.isAdmin },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '15m' }
        );
        
        // Set new access token in cookie
        res.cookie('access_token', newAccessToken, {
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000 // 15 minutes
        });
        
        // Get user and continue
        const db = getDb();
        const userResult = await db.query(queries.findUserById, [decoded.id]);
        if (userResult.rows.length === 0) {
            return next(createError(401, 'User not found'));
        }
        
        const user = userResult.rows[0];
        if (user.isBlocked === true) {
            return next(createError(401, 'User Blocked'));
        }
        
        req.userId = decoded.id;
        req.user = user;
        next();
        
    } catch (error) {
        console.log('Token refresh error:', error);
        return next(createError(401, 'Token refresh failed'));
    }
};

module.exports = {
    verifyToken,
    // Keep old name for backward compatibility
    verifyTocken: verifyToken
};