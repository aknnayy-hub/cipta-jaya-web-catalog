require("dotenv").config();

const bcrypt = require("bcryptjs");
const {createPool} = require("./db");
const readline = require("node:readline/promises");
const {stdin, stdout} = require("node:process");

async function main() {
  const prompt = readline.createInterface({input: stdin, output: stdout});
  const username = (await prompt.question("Admin username: ")).trim();
  const displayName = (await prompt.question("Nama admin: ")).trim();
  const password = await prompt.question("Password admin: ");
  prompt.close();

  if (!/^[a-zA-Z0-9._-]{3,80}$/.test(username)) {
    throw new Error("Username harus 3-80 karakter (huruf, angka, titik, garis bawah, atau strip).");
  }
  if (!displayName || displayName.length > 120 || password.length < 12) {
    throw new Error("Nama harus diisi dan password harus minimal 12 karakter.");
  }

  const pool = createPool();
  try {
    const hash = await bcrypt.hash(password, 12);
    await pool.execute(
      "INSERT INTO admins (username, password_hash, display_name) VALUES (?, ?, ?)",
      [username, hash, displayName]
    );
    console.log("Admin berhasil dibuat.");
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error(`Gagal membuat admin: ${error.message}`);
  process.exitCode = 1;
});
