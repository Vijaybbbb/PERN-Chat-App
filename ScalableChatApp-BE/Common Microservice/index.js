// Common utilities for microservices
const { createError } = require('./common_functions/error');
const { verifyTocken } = require('./common_functions/verifyTocken');
const { connect } = require('./common_functions/databaseConnection');

// Export common functions and middleware
module.exports = {
    createError,
    verifyTocken,
    connect
};
