const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./Model/dataBaseConnection');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.DATABASE_PORT || 4005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to database
db.connect();

// Routes
app.use('/api/auth', require('./Router/auth'));
app.use('/api/database', require('./Router/database'));

// Serve admin UI
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        service: 'Database Microservice',
        status: 'running',
        port: PORT,
        adminUI: '/admin',
        endpoints: {
            adminLogin: 'POST /api/auth/login',
            health: '/api/database/health',
            checkTables: '/api/database/tables/check',
            createTables: 'POST /api/database/tables/create (admin)',
            dropTables: 'DELETE /api/database/tables/drop (admin)',
            resetDatabase: 'POST /api/database/reset (admin)',
            tableInfo: '/api/database/tables/:tableName/info (admin)'
        }
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: err.message
    });
});

app.listen(PORT, () => {
    console.log(`Database Microservice running on port ${PORT}`);
    console.log(`Admin UI available at: http://localhost:${PORT}/admin`);
});