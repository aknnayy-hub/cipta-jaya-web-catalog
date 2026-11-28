/**
 * upload.js
 * Middleware multer untuk upload foto produk ke folder uploads/products/.
 * Menyimpan file dengan nama unik (UUID + ekstensi asli) agar tidak bentrok.
 * Menolak file selain gambar dan ukuran > 5 MB.
 */
const path = require("node:path");
const fs = require("node:fs");
const {randomUUID} = require("node:crypto");

// multer akan diinstall sebagai dependency
const multer = require("multer");

const UPLOAD_DIR = path.resolve(__dirname, "..", "uploads", "products");

// Pastikan folder upload selalu ada
fs.mkdirSync(UPLOAD_DIR, {recursive: true});

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif"
]);

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, UPLOAD_DIR);
  },
  filename(req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    callback(null, `${randomUUID()}${ext}`);
  }
});

function fileFilter(req, file, callback) {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    return callback(new Error("Hanya file gambar (JPEG, PNG, WebP, GIF) yang diperbolehkan."));
  }
  callback(null, true);
}

const uploadSingle = multer({storage, fileFilter, limits: {fileSize: MAX_SIZE}}).single("photo");

module.exports = {uploadSingle, UPLOAD_DIR};
