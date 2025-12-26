const express = require('express');
const router = express.Router();
const { adminLogin } = require('../Controller/auth');

// Admin login
router.post('/login', adminLogin);

module.exports = router;