const rateLimit = require('express-rate-limit');

// Applied to /login and /register to slow down brute-force / credential-stuffing attempts.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
});

module.exports = { authLimiter };
