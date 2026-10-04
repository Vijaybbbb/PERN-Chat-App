const jwt = require('jsonwebtoken');
const { createError } = require('./error.js');
const queries = require('./queries.js');
const { getSecret, isTokenBlacklisted } = require('./token');

// Lazy load db - each microservice owns its PostgreSQL pool.
const getDb = () => require('./databaseConnection.js');

const verifyToken = async (req, res, next) => {
    try {
        const accessToken = req.cookies.access_token || req.headers.authorization?.split(' ')[1];

        if (!accessToken) {
            return next(createError(401, 'Access token not provided'));
        }

        const decoded = jwt.verify(accessToken, getSecret('JWT_ACCESS_SECRET'));
        if (decoded.tokenType !== 'access' || await isTokenBlacklisted(accessToken)) {
            return next(createError(401, 'Invalid or revoked access token'));
        }

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
        req.authToken = accessToken;
        req.authClaims = decoded;
        return next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(createError(401, 'Access token expired'));
        }
        console.log('Token verification error:', error.message);
        return next(createError(401, 'Invalid access token'));
    }
};

module.exports = {
    verifyToken,
    // Keep old name for backward compatibility.
    verifyTocken: verifyToken
};
