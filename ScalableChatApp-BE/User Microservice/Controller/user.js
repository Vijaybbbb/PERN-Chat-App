const queries = require('../Model/queries');
const { createError } = require('../../Common Microservice');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const redisClient = require('../../Common Microservice/redisClient');
const CACHE_TTL = process.env.CACHE_TTL || 3600;

// Lazy load db to avoid initialization issues
const getDb = () => require('../Model/dataBaseConnection');

// Token generation functions
const generateAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: '15m' });
};

const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET_KEY, { expiresIn: '7d' });
};

const register = async (req, res, next) => {
    try {
        const db = getDb();
        const existingUserResult = await db.query(queries.findUserByEmail, [req.body.userData.email]);
        
        if (existingUserResult.rows.length > 0) {
            return next(createError(401, 'User already Exist'));
        }

        const { name, email, password } = req.body.userData;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUserResult = await db.query(queries.createUser, [
            name,
            email,
            hashedPassword,
            req.body.images
        ]);
        
        const newUser = newUserResult.rows[0];

        const tokenPayload = { id: newUser.id, isAdmin: newUser.isAdmin };
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);
        
        // Store refresh token in Redis
        await redisClient.setEx(`refresh_token:${newUser.id}`, 7 * 24 * 60 * 60, refreshToken);
        
        const { password: userPassword, isAdmin, ...otherDetails } = newUser;
        
        res.cookie('access_token', accessToken, {
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000 // 15 minutes
        }).cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        }).status(200).json({ ...otherDetails, accessToken });
        
    } catch (error) {
        console.log(error);
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
            
            const accessToken = generateAccessToken(tokenPayload);
            const refreshToken = generateRefreshToken(tokenPayload);
            
            // Store refresh token in Redis
            await redisClient.setEx(`refresh_token:${existingUser.id}`, 7 * 24 * 60 * 60, refreshToken);
            
            const { password, isAdmin, ...otherDetails } = existingUser;
            
            res.cookie('access_token', accessToken, {
                httpOnly: true,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 15 * 60 * 1000 // 15 minutes
            }).cookie('refresh_token', refreshToken, {
                httpOnly: true,
                path: '/',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            }).status(200).json({ ...otherDetails, accessToken });
        } else {
            return next(createError(401, 'Invalid Credentials'));
        }
    } catch (error) {
        console.log(error);
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
        console.log(error);
        return next(createError(401, 'Something went Wrong'));
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const { refresh_token } = req.cookies;
        
        if (!refresh_token) {
            return next(createError(401, 'Refresh token not provided'));
        }
        
        // Verify refresh token
        const decoded = jwt.verify(refresh_token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET_KEY);
        
        // Check if refresh token exists in Redis
        const storedToken = await redisClient.get(`refresh_token:${decoded.id}`);
        if (!storedToken || storedToken !== refresh_token) {
            return next(createError(401, 'Invalid refresh token'));
        }
        
        // Generate new access token
        const tokenPayload = { id: decoded.id, isAdmin: decoded.isAdmin };
        const newAccessToken = generateAccessToken(tokenPayload);
        
        res.cookie('access_token', newAccessToken, {
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 15 * 60 * 1000 // 15 minutes
        }).status(200).json({ accessToken: newAccessToken });
        
    } catch (error) {
        console.log(error);
        return next(createError(401, 'Invalid refresh token'));
    }
};

const logout = async (req, res, next) => {
    try {
        const { refresh_token } = req.cookies;
        const userId = req.user;
        
        if (refresh_token && userId) {
            // Remove refresh token from Redis
            await redisClient.del(`refresh_token:${userId}`);
        }
        
        res.clearCookie('access_token')
           .clearCookie('refresh_token')
           .status(200)
           .json({ message: 'Logged out successfully' });
           
    } catch (error) {
        console.log(error);
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