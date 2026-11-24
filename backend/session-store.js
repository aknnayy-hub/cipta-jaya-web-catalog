const session = require("express-session");

class MySQLSessionStore extends session.Store {
  constructor(pool, maxAge) {
    super();
    this.pool = pool;
    this.maxAge = maxAge;
  }

  expiration(sessionData) {
    const cookieExpiry = sessionData.cookie?.expires
      ? new Date(sessionData.cookie.expires).getTime()
      : Date.now() + this.maxAge;
    return Math.max(0, Math.floor(cookieExpiry / 1000));
  }

  get(sessionId, callback) {
    this.pool.execute(
      "SELECT data, expires FROM sessions WHERE session_id = ? LIMIT 1",
      [sessionId]
    ).then(([rows]) => {
      if (!rows.length) return callback(null, null);
      if (rows[0].expires <= Math.floor(Date.now() / 1000)) {
        return this.destroy(sessionId, error => callback(error, null));
      }
      try {
        callback(null, JSON.parse(rows[0].data));
      } catch (error) {
        callback(error);
      }
    }).catch(callback);
  }

  set(sessionId, sessionData, callback = () => {}) {
    const data = JSON.stringify(sessionData);
    const expires = this.expiration(sessionData);
    this.pool.execute(
      `INSERT INTO sessions (session_id, expires, data) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE expires = VALUES(expires), data = VALUES(data)`,
      [sessionId, expires, data]
    ).then(() => callback()).catch(callback);
  }

  touch(sessionId, sessionData, callback = () => {}) {
    this.pool.execute(
      "UPDATE sessions SET expires = ? WHERE session_id = ?",
      [this.expiration(sessionData), sessionId]
    ).then(() => callback()).catch(callback);
  }

  destroy(sessionId, callback = () => {}) {
    this.pool.execute("DELETE FROM sessions WHERE session_id = ?", [sessionId])
      .then(() => callback()).catch(callback);
  }

  clearExpired(callback = () => {}) {
    this.pool.execute("DELETE FROM sessions WHERE expires <= ?", [Math.floor(Date.now() / 1000)])
      .then(() => callback()).catch(callback);
  }
}

module.exports = {MySQLSessionStore};
