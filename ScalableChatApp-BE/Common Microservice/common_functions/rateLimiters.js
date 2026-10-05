const { rateLimit } = require('express-rate-limit');
const { createObservability } = require('../observability');
const observability = createObservability(process.env.SERVICE_NAME);

// express-rate-limit 7.x does not expose ipKeyGenerator. Express has already
// resolved the client address into req.ip, so use that value for IP fallback.
const clientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

const keyByUserOrIp = (req) => req.userId
    ? `user:${req.userId}`
    : `ip:${clientIp(req)}`;

const rateLimitHandler = (name) => (req, res, _next, options) => {
    observability.recordOperation(`rate_limit_${name}`, 'failure');
    req.log?.warn('Request rate limit exceeded', {
        event: 'rate_limit_exceeded',
        limiter: name,
        userId: req.userId,
        ip: clientIp(req)
    });
    res.status(options.statusCode).json(options.message);
};

const userRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: keyByUserOrIp,
    handler: rateLimitHandler('user'),
    message: { success: false, message: 'Too many requests. Please try again shortly.' }
});

const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => `auth:${clientIp(req)}`,
    handler: rateLimitHandler('auth'),
    message: { success: false, message: 'Too many authentication attempts. Please try again later.' }
});

// Bedrock calls are slower and more expensive than normal API requests.
const aiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 12,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: keyByUserOrIp,
    handler: rateLimitHandler('ai'),
    message: { success: false, message: 'Too many AI requests. Please try again shortly.' }
});

module.exports = { userRateLimiter, authRateLimiter, aiRateLimiter };
