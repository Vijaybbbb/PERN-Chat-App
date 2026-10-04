const express = require('express')
const { register, login, allUsers, refreshToken, logout } = require('../Controller/user')
const { verifyTocken } = require('../../Common Microservice')
const { userRateLimiter, authRateLimiter } = require('../../Common Microservice/common_functions/rateLimiters')
const router = express.Router()


router.post('/register', authRateLimiter, register)

router.post('/login', authRateLimiter, login)

router.post('/refresh-token', authRateLimiter, refreshToken)

router.post('/logout', verifyTocken, userRateLimiter, logout)

router.get('/allUsers', verifyTocken, userRateLimiter, allUsers)




module.exports = router
