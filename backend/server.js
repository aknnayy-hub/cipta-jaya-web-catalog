require("dotenv").config();

const {createPool} = require("./db");
const {createApp} = require("./app");
const {MySQLSessionStore} = require("./session-store");

const required = ["SESSION_SECRET", "DB_NAME", "DB_USER"];
const missing = required.filter(key => !process.env[key]);
if (missing.length) {
  throw new Error(`Atur variabel berikut di .env: ${missing.join(", ")}`);
}
if (process.env.SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET harus memiliki sedikitnya 32 karakter.");
}

const pool = createPool();
const sessionStore = new MySQLSessionStore(pool, 8 * 60 * 60 * 1000);
const cleanupTimer = setInterval(() => {
  sessionStore.clearExpired(error => {
    if (error) console.error("Pembersihan sesi kedaluwarsa gagal:", error);
  });
}, 15 * 60 * 1000);
cleanupTimer.unref();
const app = createApp({pool, sessionStore, env: process.env});
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";

app.listen(port, host, () => {
  console.log(`Cipta Jaya berjalan di http://${host}:${port}`);
});
