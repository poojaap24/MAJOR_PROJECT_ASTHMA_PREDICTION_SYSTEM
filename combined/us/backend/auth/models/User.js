const { getDb } = require('../config/db');

const iso = (d) => (d instanceof Date ? d.toISOString() : d);

const User = {
  async create({ name, email, passwordHash }) {
    const result = getDb()
      .prepare(`INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)`)
      .run(name, email, passwordHash);
    return this.findById(Number(result.lastInsertRowid));
  },

  async findByEmail(email) {
    return getDb().prepare(`SELECT * FROM users WHERE email = ? LIMIT 1`).get(email) || null;
  },

  async findById(id) {
    return (
      getDb()
        .prepare(`SELECT id, name, email, role, is_verified, created_at FROM users WHERE id = ? LIMIT 1`)
        .get(id) || null
    );
  },

  async incrementFailedAttempts(id) {
    getDb()
      .prepare(`UPDATE users SET failed_login_attempts = failed_login_attempts + 1 WHERE id = ?`)
      .run(id);
  },

  async resetFailedAttempts(id) {
    getDb()
      .prepare(`UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`)
      .run(id);
  },

  async lockAccount(id, lockedUntil) {
    getDb().prepare(`UPDATE users SET locked_until = ? WHERE id = ?`).run(iso(lockedUntil), id);
  },

  async updatePassword(id, passwordHash) {
    getDb()
      .prepare(
        `UPDATE users SET password_hash = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
      )
      .run(passwordHash, id);
  },
};

module.exports = User;
