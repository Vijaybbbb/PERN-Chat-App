const jwt = require('jsonwebtoken');
const { createError } = require('./error.js');
const db = require('./databaseConnection.js');
const queries = require('./queries.js');

const verifyTocken = async (req, res, next) => {
    req.user = req.cookies.user_id;
    
    try {
        const tocken = req.cookies.access_tocken;
        const userId = req.cookies.user_id;
        
        if (!tocken || !userId) {
            return next(createError(401, 'Invalid Credentials'));
        }
        
        // Get user from PostgreSQL
        const userResult = await db.query(queries.findUserById, [userId]);
        
        if (userResult.rows.length === 0) {
            return next(createError(401, 'User not found'));
        }
        
        const user = userResult.rows[0];
        
        if (user.isBlocked === true) {
            return next(createError(401, 'User Blocked'));
        }
        
        jwt.verify(tocken, process.env.JWT_SECRET_KEY, (err, decoded) => {
            if (err) {
                console.log(err);
                return next(createError(401, 'Invalid Token'));
            }
            
            if (userId === decoded.id) {
                next();
            } else {
                return next(createError(401, 'Authentication failed'));
            }
        });
        
    } catch (error) {
        console.log('Token verification error:', error);
        return next(createError(500, 'Internal server error'));
    }
};

module.exports = {
    verifyTocken
};