const mysql = require("mysql2/promise");

function createPool(env = process.env) {
  return mysql.createPool({
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    database: env.DB_NAME || "cipta_jaya",
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    supportBigNumbers: true,
    bigNumberStrings: false,
    charset: "utf8mb4"
  });
}

module.exports = {createPool};
