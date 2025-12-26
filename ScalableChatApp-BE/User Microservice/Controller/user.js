const db = require('../Model/dataBaseConnection');
const queries = require('../Model/queries');
const { createError } = require('../../Common Microservice');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const redisClient = require('../../Common Microservice/redisClient');
const CACHE_TTL = process.env.CACHE_TTL || 3600;

const register = async (req, res, next) => {
    try {
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

        const token = jwt.sign({ 
            id: newUser.id, 
            isAdmin: newUser.isAdmin 
        }, process.env.JWT_SECRET_KEY);
        
        const { password: userPassword, isAdmin, ...otherDetails } = newUser;
        
        res.cookie('access_tocken', token, {
            httpOnly: true,
            path: '/',
            secure: process.env.NODE_ENV === 'production',
        }).cookie('user_id', newUser.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        }).status(200).json({ ...otherDetails });
        
    } catch (error) {
        console.log(error);
        return next(createError(401, 'Failed'));
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        
        const existingUserResult = await db.query(queries.findUserByEmail, [email]);
        
        if (existingUserResult.rows.length === 0) {
            return next(createError(401, 'User not Found'));
        }
        
        const existingUser = existingUserResult.rows[0];
        const checkPassword = await bcrypt.compare(password, existingUser.password);
        
        if (checkPassword) {
            const token = jwt.sign({
                id: existingUser.id,
                isAdmin: existingUser.isAdmin
            }, process.env.JWT_SECRET_KEY);
            
            const { password, isAdmin, ...otherDetails } = existingUser;
            
            res.cookie('access_tocken', token, {
                httpOnly: true,
                path: '/'
            }).cookie('user_id', existingUser.id, {
                httpOnly: true,
                path: '/',
            }).status(200).json({ ...otherDetails });
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
        const searchQuery = req.query.search || '';
        const cacheKey = `users:search:${searchQuery}:${req.user}`;
        
        // Check cache
        const cachedUsers = await redisClient.get(cacheKey);
        if (cachedUsers) {
            return res.status(200).json(JSON.parse(cachedUsers));
        }
        
        let usersResult;
        if (searchQuery) {
            usersResult = await db.query(queries.searchUsers, [req.user, `%${searchQuery}%`]);
        } else {
            usersResult = await db.query(queries.getAllUsersExceptCurrent, [req.user]);
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

module.exports = {
    register,
    login,
    allUsers
};