const crypto = require('crypto');
const { getDb } = require('../config/db');

// We never store the raw refresh token — only a SHA-256 hash of it —
// so a leaked database doesn't hand out usable tokens.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const RefreshToken = {
  hashToken,

  async store(userId, token, expiresAt) {
    const expires = expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt;
    getDb()
      .prepare(`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`)
      .run(userId, hashToken(token), expires);
  },

  async findValid(token) {
    return (
      getDb()
        .prepare(
          `SELECT * FROM refresh_tokens
           WHERE token_hash = ? AND revoked = 0 AND expires_at > ?
           LIMIT 1`
        )
        .get(hashToken(token), new Date().toISOString()) || null
    );
  },

  async revoke(token) {
    getDb().prepare(`UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?`).run(hashToken(token));
  },

  async revokeAllForUser(userId) {
    getDb().prepare(`UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?`).run(userId);
  },
};

module.exports = RefreshToken;
