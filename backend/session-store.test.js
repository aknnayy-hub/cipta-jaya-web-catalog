const assert = require("node:assert/strict");
const {test} = require("node:test");
const {MySQLSessionStore} = require("./session-store");

test("MySQL session store persists, expires, and deletes session data", async () => {
  const rows = new Map();
  const pool = {
    async execute(sql, params) {
      if (sql.startsWith("SELECT data")) {
        const row = rows.get(params[0]);
        return [row ? [row] : [], []];
      }
      if (sql.startsWith("INSERT INTO sessions")) {
        rows.set(params[0], {expires: params[1], data: params[2]});
      } else if (sql.startsWith("UPDATE sessions")) {
        const row = rows.get(params[1]);
        if (row) row.expires = params[0];
      } else if (sql.startsWith("DELETE FROM sessions WHERE session_id")) {
        rows.delete(params[0]);
      } else if (sql.startsWith("DELETE FROM sessions WHERE expires")) {
        for (const [id, row] of rows) if (row.expires <= params[0]) rows.delete(id);
      }
      return [{affectedRows: 1}, []];
    }
  };
  const store = new MySQLSessionStore(pool, 60_000);
  const sessionData = {user: {id: 5}, cookie: {expires: new Date(Date.now() + 60_000)}};
  await new Promise((resolve, reject) => store.set("active", sessionData, error => error ? reject(error) : resolve()));

  const active = await new Promise((resolve, reject) => store.get("active", (error, value) =>
    error ? reject(error) : resolve(value)
  ));
  assert.deepEqual(active.user, {id: 5});

  const expired = {...sessionData, cookie: {expires: new Date(Date.now() - 1000)}};
  await new Promise((resolve, reject) => store.set("expired", expired, error => error ? reject(error) : resolve()));
  const missing = await new Promise((resolve, reject) => store.get("expired", (error, value) =>
    error ? reject(error) : resolve(value)
  ));
  assert.equal(missing, null);
  assert.equal(rows.has("expired"), false);

  await new Promise((resolve, reject) => store.destroy("active", error => error ? reject(error) : resolve()));
  assert.equal(rows.has("active"), false);
});
