const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../config/jwt');

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    // 'strict' is fine while frontend + API share a site (localhost:3000 -> localhost:5000).
    // If you deploy them on different sites, set COOKIE_SAMESITE=none and COOKIE_SECURE=true.
    sameSite: process.env.COOKIE_SAMESITE || 'strict',
    // Scoped to /api/auth so the browser sends it to BOTH /refresh and /logout
    // (with path=/api/auth/refresh, /logout never received it and couldn't revoke the token).
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}

function msFromExpiry(expiry) {
  // crude parser for values like "7d", "15m"
  const match = /^(\d+)([smhd])$/.exec(expiry || '7d');
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const n = Number(match[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return n * unit;
}

async function issueTokens(user) {
  const payload = { sub: user.id, email: user.email, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  const expiresAt = new Date(Date.now() + msFromExpiry(process.env.JWT_REFRESH_EXPIRES));
  await RefreshToken.store(user.id, refreshToken, expiresAt);

  return { accessToken, refreshToken };
}

// POST /api/auth/register
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, email, password } = req.body;

  try {
    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, passwordHash });

    const { accessToken, refreshToken } = await issueTokens(user);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions());

    return res.status(201).json({
      message: 'Registration successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = await User.findByEmail(email);

    // Generic error message on purpose — don't reveal whether the email exists.
    const invalidMsg = { error: 'Invalid email or password' };
    if (!user) return res.status(401).json(invalidMsg);

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return res.status(423).json({
        error: `Account temporarily locked. Try again after ${new Date(user.locked_until).toLocaleTimeString()}`,
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      await User.incrementFailedAttempts(user.id);
      const attempts = user.failed_login_attempts + 1;
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        await User.lockAccount(user.id, lockedUntil);
        return res.status(423).json({ error: 'Too many failed attempts. Account locked for 15 minutes.' });
      }
      return res.status(401).json(invalidMsg);
    }

    await User.resetFailedAttempts(user.id);

    const { accessToken, refreshToken } = await issueTokens(user);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions());

    return res.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      accessToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/auth/refresh — reads refreshToken from httpOnly cookie, rotates it
exports.refresh = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ error: 'No refresh token provided' });

  try {
    const stored = await RefreshToken.findValid(token);
    if (!stored) return res.status(401).json({ error: 'Refresh token invalid or expired' });

    const payload = verifyRefreshToken(token); // throws if signature/expiry invalid
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ error: 'User no longer exists' });

    // Rotate: revoke the old refresh token, issue a new pair
    await RefreshToken.revoke(token);
    const { accessToken, refreshToken } = await issueTokens(user);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions());

    return res.json({ accessToken });
  } catch (err) {
    return res.status(401).json({ error: 'Refresh token invalid or expired' });
  }
};

// POST /api/auth/logout
exports.logout = async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    await RefreshToken.revoke(token);
  }
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: process.env.COOKIE_SAMESITE || 'strict',
    path: '/api/auth',
  });
  return res.json({ message: 'Logged out successfully' });
};

// GET /api/auth/me — requires authenticate middleware
exports.me = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
