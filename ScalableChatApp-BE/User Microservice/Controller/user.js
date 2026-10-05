const queries = require('../Model/queries');
const { createError } = require('../../Common Microservice');
const bcrypt = require('bcryptjs'); // Changed from bcrypt to bcryptjs
const redisClient = require('../../Common Microservice/redisClient');
const { createObservability } = require('../../Common Microservice/observability');
const observability = createObservability(process.env.SERVICE_NAME);
const {
    REFRESH_TOKEN_TTL_SECONDS,
    issueTokenPair,
    rotateRefreshToken,
    revokeRefreshToken,
    blacklistToken
} = require('../../Common Microservice/common_functions/token');
const CACHE_TTL = process.env.CACHE_TTL || 3600;

// Lazy load db to avoid initialization issues
const getDb = () => require('../Model/dataBaseConnection');

const setAuthCookies = (res, { accessToken, refreshToken }) => {
    return res.cookie('access_token', accessToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 15 * 60 * 1000
    }).cookie('refresh_token', refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000
    });
};

const register = async (req, res, next) => {
    try {
        const db = getDb();
        const existingUserResult = await db.query(queries.findUserByEmail, [req.body.userData.email]);
        
        if (existingUserResult.rows.length > 0) {
            return next(createError(401, 'User already Exist'));
        }

        const { name, email, password } = req.body.userData;
        let hashedPassword;
        try {
            hashedPassword = await bcrypt.hash(password, 5);
        } catch (hashError) {
            req.log.error('Password hashing failed', { event: 'password_hash_failed', error: hashError });
            observability.recordOperation('user_register', 'failure');
            return next(createError(500, 'Password hashing failed'));
        }
        
        const newUserResult = await db.query(queries.createUser, [
            name,
            email,
            hashedPassword,
            req.body.images
        ]);
        const newUser = newUserResult.rows[0];

        const tokenPayload = { id: newUser.id, isAdmin: newUser.isAdmin };
        const tokens = await issueTokenPair(tokenPayload);
        
        const { password: userPassword, isAdmin, ...otherDetails } = newUser;
        
        observability.recordOperation('user_register');
        req.log.info('User registered', { event: 'user_registered', userId: newUser.id });
        setAuthCookies(res, tokens).status(200).json({ ...otherDetails, accessToken: tokens.accessToken });
        
    } catch (error) {
        observability.recordOperation('user_register', 'failure');
        req.log.error('User registration failed', { event: 'user_registration_failed', error });
        return next(createError(401, 'Failed'));
    }
};

const login = async (req, res, next) => {
    try {
        const db = getDb();
        const { email, password } = req.body;
        
        const existingUserResult = await db.query(queries.findUserByEmail, [email]);
        
        if (existingUserResult.rows.length === 0) {
            return next(createError(401, 'User not Found'));
        }
        
        const existingUser = existingUserResult.rows[0];
        const checkPassword = await bcrypt.compare(password, existingUser.password);
        
        if (checkPassword) {
            const tokenPayload = {
                id: existingUser.id,
                isAdmin: existingUser.isAdmin
            };
            
            const tokens = await issueTokenPair(tokenPayload);
            
            const { password, isAdmin, ...otherDetails } = existingUser;
            observability.recordOperation('user_login');
            req.log.info('User logged in', { event: 'user_login_succeeded', userId: existingUser.id });
            setAuthCookies(res, tokens).status(200).json({ ...otherDetails, accessToken: tokens.accessToken });
        } else {
            observability.recordOperation('user_login', 'failure');
            return next(createError(401, 'Invalid Credentials'));
        }
    } catch (error) {
        observability.recordOperation('user_login', 'failure');
        req.log.error('User login failed', { event: 'user_login_failed', error });
        return next(createError(401, 'Failed'));
    }
};

const allUsers = async (req, res, next) => {
    try {
        const db = getDb();
        const searchQuery = req.query.search || '';
        const cacheKey = `users:search:${searchQuery}:${req.userId}`;
        
        // Check cache
        const cachedUsers = await redisClient.get(cacheKey);
        if (cachedUsers) {
            return res.status(200).json(JSON.parse(cachedUsers));
        }
        
        let usersResult;
        if (searchQuery) {
            usersResult = await db.query(queries.searchUsers, [req.userId, `%${searchQuery}%`]);
        } else {
            usersResult = await db.query(queries.getAllUsersExceptCurrent, [req.userId]);
        }
        
        const users = usersResult.rows;
        
        // Cache results
        await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(users));
        
        return res.status(200).json(users);
    } catch (error) {
        req.log.error('User search failed', { event: 'user_search_failed', error });
        return next(createError(401, 'Something went Wrong'));
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const { refresh_token } = req.cookies;
        
        if (!refresh_token) {
            return next(createError(401, 'Refresh token not provided'));
        }
        
        // Rotation atomically consumes the old refresh session and issues a
        // brand-new access/refresh pair.
        const tokens = await rotateRefreshToken(refresh_token);
        observability.recordOperation('token_refresh');
        setAuthCookies(res, tokens).status(200).json({ accessToken: tokens.accessToken });
        
    } catch (error) {
        observability.recordOperation('token_refresh', 'failure');
        req.log.warn('Refresh token rotation failed', { event: 'token_refresh_failed', error });
        return next(createError(401, 'Invalid refresh token'));
    }
};

const logout = async (req, res, next) => {
    try {
        const { refresh_token } = req.cookies;
        const accessToken = req.authToken || req.cookies.access_token || req.headers.authorization?.split(' ')[1];

        if (accessToken) {
            await blacklistToken(accessToken, null, 15 * 60);
        }

        if (refresh_token) {
            try {
                await revokeRefreshToken(refresh_token);
            } catch (error) {
                // The refresh token may already have expired or been rotated.
                req.log.debug('Refresh token was already unavailable during logout', {
                    event: 'refresh_token_revoke_skipped',
                    error
                });
            }
        }
        observability.recordOperation('user_logout');
        res.clearCookie('access_token')
           .clearCookie('refresh_token')
           .status(200)
           .json({ message: 'Logged out successfully' });
           
    } catch (error) {
        observability.recordOperation('user_logout', 'failure');
        req.log.error('User logout failed', { event: 'user_logout_failed', error });
        return next(createError(500, 'Logout failed'));
    }
};

module.exports = {
    register,
    login,
    allUsers,
    refreshToken,
    logout
};
