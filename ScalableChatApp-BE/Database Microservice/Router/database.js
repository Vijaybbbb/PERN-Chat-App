const express = require('express');
const router = express.Router();
const {
    createTables,
    dropTables,
    resetDatabase,
    checkTables,
    getTableInfo,
    healthCheck
} = require('../Controller/database');
const { verifyAdmin } = require('../Controller/auth');

// Health check (public)
router.get('/health', healthCheck);

// Check existing tables (public)
router.get('/tables/check', checkTables);

// Get table information (admin only)
router.get('/tables/:tableName/info', verifyAdmin, getTableInfo);

// Create all tables (admin only)
router.post('/tables/create', verifyAdmin, createTables);

// Drop all tables (admin only)
router.delete('/tables/drop', verifyAdmin, dropTables);

// Reset database (admin only)
router.post('/reset', verifyAdmin, resetDatabase);

module.exports = router;