const express = require('express');
const router = express.Router();
const { adminLogin } = require('../Controller/auth');
const { authRateLimiter } = require('../../Common Microservice/common_functions/rateLimiters');

// Admin login
router.post('/login', authRateLimiter, adminLogin);

module.exports = router;
