/**
 * seed-admin.js
 * Membuat akun admin default (username: admin, password: admin).
 * Jalankan: node backend/seed-admin.js
 * Jika akun sudah ada, hanya menampilkan pesan bahwa akun sudah terdaftar.
 */
require("dotenv").config();

const bcrypt = require("bcryptjs");
const {createPool} = require("./db");

async function main() {
  const pool = createPool();
  try {
    // Pastikan tabel admins sudah ada
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        username      VARCHAR(80)  NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        display_name  VARCHAR(120) NOT NULL DEFAULT 'Admin',
        role          VARCHAR(20)  NOT NULL DEFAULT 'admin',
        created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id)
      ) ENGINE=InnoDB
    `);

    // Cek apakah admin sudah ada
    const [existing] = await pool.execute(
      "SELECT id FROM admins WHERE username = ? LIMIT 1",
      ["admin"]
    );
    if (existing.length) {
      console.log("Akun admin 'admin' sudah terdaftar di database.");
      return;
    }

    // Buat akun admin default
    const hash = await bcrypt.hash("admin", 12);
    await pool.execute(
      "INSERT INTO admins (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)",
      ["admin", hash, "Administrator Cipta Jaya", "admin"]
    );
    console.log("Akun admin berhasil dibuat:");
    console.log("  Username : admin");
    console.log("  Password : admin");
    console.log("  Role     : admin");
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(`Gagal membuat admin: ${error.message}`);
  process.exitCode = 1;
});
