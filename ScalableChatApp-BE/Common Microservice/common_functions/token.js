const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const redisClient = require('../redisClient');

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

const getSecret = (name) => {
    const secret = process.env[name];
    if (!secret || secret.length < 32) {
        throw new Error(`${name} must be set and contain at least 32 characters`);
    }
    return secret;
};

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const refreshSessionKey = (userId, jti) => `auth:refresh:${userId}:${jti}`;
const blacklistKey = (token) => `auth:blacklist:${hashToken(token)}`;

const signAccessToken = (payload) => jwt.sign(
    { ...payload, jti: crypto.randomUUID(), tokenType: 'access' },
    getSecret('JWT_ACCESS_SECRET'),
    { expiresIn: ACCESS_TOKEN_TTL }
);

const signRefreshToken = (payload) => {
    const jti = crypto.randomUUID();
    const token = jwt.sign(
        { ...payload, jti, tokenType: 'refresh' },
        getSecret('JWT_REFRESH_SECRET'),
        { expiresIn: REFRESH_TOKEN_TTL_SECONDS }
    );
    return { token, jti };
};

const issueTokenPair = async (payload) => {
    const accessToken = signAccessToken(payload);
    const { token: refreshToken, jti } = signRefreshToken(payload);

    await redisClient.setEx(
        refreshSessionKey(payload.id, jti),
        REFRESH_TOKEN_TTL_SECONDS,
        hashToken(refreshToken)
    );

    return { accessToken, refreshToken };
};

const secondsUntilExpiry = (decoded, fallbackSeconds) => {
    const remaining = decoded?.exp
        ? decoded.exp - Math.floor(Date.now() / 1000)
        : fallbackSeconds;
    return Math.max(1, Math.min(remaining, fallbackSeconds));
};

const blacklistToken = async (token, decoded, fallbackSeconds) => {
    await redisClient.setEx(
        blacklistKey(token),
        secondsUntilExpiry(decoded, fallbackSeconds),
        '1'
    );
};

const isTokenBlacklisted = async (token) => Boolean(await redisClient.get(blacklistKey(token)));

// Atomically consumes a refresh session. A refresh token can therefore only
// be used once, even if two refresh requests arrive at the same time.
const consumeRefreshSession = async (userId, jti, token) => {
    const result = await redisClient.eval(
        `
        if redis.call('get', KEYS[1]) == ARGV[1] then
            return redis.call('del', KEYS[1])
        end
        return 0
        `,
        {
            keys: [refreshSessionKey(userId, jti)],
            arguments: [hashToken(token)]
        }
    );
    return Number(result) === 1;
};

const rotateRefreshToken = async (refreshToken) => {
    const decoded = jwt.verify(refreshToken, getSecret('JWT_REFRESH_SECRET'));

    if (decoded.tokenType !== 'refresh' || !decoded.id || !decoded.jti) {
        throw new Error('Invalid refresh token claims');
    }

    if (await isTokenBlacklisted(refreshToken)) {
        throw new Error('Refresh token has been blacklisted');
    }

    const consumed = await consumeRefreshSession(decoded.id, decoded.jti, refreshToken);
    if (!consumed) {
        // This is either an expired/replayed token. Keep it blacklisted for
        // the remainder of its lifetime so repeated attacks are cheap to reject.
        await blacklistToken(refreshToken, decoded, REFRESH_TOKEN_TTL_SECONDS);
        throw new Error('Refresh token has already been used or revoked');
    }

    await blacklistToken(refreshToken, decoded, REFRESH_TOKEN_TTL_SECONDS);
    const tokens = await issueTokenPair({ id: decoded.id, isAdmin: decoded.isAdmin });
    return { ...tokens, decoded };
};

const revokeRefreshToken = async (refreshToken) => {
    const decoded = jwt.verify(refreshToken, getSecret('JWT_REFRESH_SECRET'));
    if (decoded.id && decoded.jti) {
        await redisClient.del(refreshSessionKey(decoded.id, decoded.jti));
    }
    await blacklistToken(refreshToken, decoded, REFRESH_TOKEN_TTL_SECONDS);
};

module.exports = {
    ACCESS_TOKEN_TTL,
    REFRESH_TOKEN_TTL_SECONDS,
    getSecret,
    hashToken,
    signAccessToken,
    issueTokenPair,
    blacklistToken,
    isTokenBlacklisted,
    rotateRefreshToken,
    revokeRefreshToken,
    secondsUntilExpiry
};
