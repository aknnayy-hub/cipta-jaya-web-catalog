const path = require("node:path");
const bcrypt = require("bcryptjs");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const {rateLimit} = require("express-rate-limit");
const {randomUUID} = require("node:crypto");
const {uploadSingle} = require("./upload");

const FRONTEND_ROOT = path.resolve(__dirname, "..", "frontend");
const UPLOADS_ROOT = path.resolve(__dirname, "..", "uploads");
const SESSION_MAX_AGE = 8 * 60 * 60 * 1000;
const CATEGORY_SEARCH = {
  "Semen & Pasir": ["semen", "mortar", "pasir", "perekat", "acian"],
  "Besi & Baja": ["besi", "baja", "tulangan", "kawat"],
  "Bata & Mortar": ["bata", "dinding", "hebel", "aac"],
  "Cat Tembok": ["cat", "pelapis", "waterproof"],
  "Pipa & Sanitari": ["pipa", "sanitari", "fitting"],
  "Atap & Seng": ["atap", "seng", "spandek"]
};

function isBoolean(value) {
  return value === true || value === false;
}

function productView(row) {
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    description: row.description || "",
    price: Number(row.price),
    wholesalePrice: row.wholesale_price == null ? null : Number(row.wholesale_price),
    wholesaleMin: row.wholesale_min == null ? null : Number(row.wholesale_min),
    unit: row.unit,
    stockQty: Number(row.stock_qty),
    inStock: Number(row.stock_qty) > 0,
    stockStatus: Number(row.stock_qty) > 0 ? "ready" : "out_of_stock",
    image: row.image || "",
    gallery: row.gallery || [],
    benefits: row.benefits || [],
    specifications: row.specifications || [],
    rating: row.rating == null ? null : Number(row.rating),
    reviewCount: Number(row.review_count),
    soldCount: Number(row.sold_count),
    featured: Boolean(row.featured),
    published: Boolean(row.published),
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function validateProduct(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {error: "Data produk tidak valid."};
  }
  const name = String(input.name || "").trim();
  const sku = String(input.sku || "").trim();
  const category = String(input.category || "").trim();
  const unit = String(input.unit || "pcs").trim();
  const price = Number(input.price);
  const stockQty = input.stockQty == null
    ? (input.inStock === true ? 1 : 0)
    : Number(input.stockQty);
  if (!name || name.length > 180 || !sku || sku.length > 80
      || !category || category.length > 100 || !unit || unit.length > 40) {
    return {error: "Nama, SKU, kategori, dan satuan wajib diisi dengan panjang yang valid."};
  }
  if (!Number.isSafeInteger(price) || price < 0
      || !Number.isSafeInteger(stockQty) || stockQty < 0 || stockQty > 4294967295) {
    return {error: "Harga dan jumlah stok harus berupa bilangan bulat non-negatif."};
  }
  const description = String(input.description || "").trim();
  const image = String(input.image || "").trim();
  if (description.length > 10000 || image.length > 2048) {
    return {error: "Deskripsi atau URL gambar terlalu panjang."};
  }
  const wholesalePrice = input.wholesalePrice == null || input.wholesalePrice === ""
    ? null
    : Number(input.wholesalePrice);
  const wholesaleMin = input.wholesaleMin == null || input.wholesaleMin === ""
    ? null
    : Number(input.wholesaleMin);
  if ((wholesalePrice === null) !== (wholesaleMin === null)) {
    return {error: "Harga grosir dan minimum pembeliannya harus diisi bersama."};
  }
  if ((wholesalePrice !== null && (!Number.isSafeInteger(wholesalePrice) || wholesalePrice < 0))
      || (wholesaleMin !== null && (!Number.isSafeInteger(wholesaleMin) || wholesaleMin < 1 || wholesaleMin > 4294967295))) {
    return {error: "Harga dan minimum pembelian grosir tidak valid."};
  }
  const jsonArray = (value, label) => {
    if (value == null) return null;
    if (!Array.isArray(value) || value.length > 100) throw new Error(`${label} harus berupa daftar maksimal 100 item.`);
    return JSON.stringify(value);
  };
  try {
    return {
      product: {
        name, sku, category, unit, price, stockQty, description, image,
        wholesalePrice, wholesaleMin,
        featured: isBoolean(input.featured) ? input.featured : false,
        published: isBoolean(input.published) ? input.published : false,
        gallery: jsonArray(input.gallery, "Galeri"),
        benefits: jsonArray(input.benefits, "Manfaat"),
        specifications: jsonArray(input.specifications, "Spesifikasi")
      }
    };
  } catch (error) {
    return {error: error.message};
  }
}

function slugify(value) {
  return value.toLocaleLowerCase("id")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200) || randomUUID();
}

function createApp({pool, sessionStore, env = process.env}) {
  const app = express();
  app.disable("x-powered-by");
  if (env.TRUST_PROXY) app.set("trust proxy", Number(env.TRUST_PROXY) || env.TRUST_PROXY);
  app.use(helmet());
  app.use(express.json({limit: "64kb"}));
  app.use(session({
    name: "cipta_jaya_session",
    secret: env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: env.SESSION_COOKIE_SECURE === "true",
      maxAge: SESSION_MAX_AGE
    }
  }));
  app.use((req, res, next) => {
    const origin = req.get("origin");
    if (origin && env.NODE_ENV !== "production") {
      try {
        const parsed = new URL(origin);
        if (["127.0.0.1", "localhost"].includes(parsed.hostname)) {
          res.setHeader("Access-Control-Allow-Origin", origin);
          res.setHeader("Access-Control-Allow-Credentials", "true");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type");
          res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
          if (req.method === "OPTIONS") return res.status(204).end();
          return next();
        }
      } catch {
        return res.status(403).json({message: "Origin permintaan tidak valid."});
      }
    }
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    if (origin) {
      try {
        if (new URL(origin).host !== req.get("host")) {
          return res.status(403).json({message: "Permintaan lintas origin ditolak."});
        }
      } catch {
        return res.status(403).json({message: "Origin permintaan tidak valid."});
      }
    }
    next();
  });

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {message: "Terlalu banyak percobaan masuk. Coba lagi beberapa saat."}
  });
  const checkoutLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: {message: "Terlalu banyak permintaan checkout. Coba lagi sebentar."}
  });
  const requireAdmin = (req, res, next) => {
    if (req.session.user?.role !== "admin") {
      return res.status(401).json({message: "Silakan masuk sebagai admin."});
    }
    next();
  };
  const publicConfig = {
    whatsappNumber: String(env.WHATSAPP_NUMBER || "").replace(/\D/g, "")
  };

  app.get("/config.js", (req, res) => {
    res.type("application/javascript").send(
      `window.CIPTA_API_BASE = "";\nwindow.CIPTA_API_ENABLED = true;\nwindow.CIPTA_WHATSAPP_NUMBER = ${JSON.stringify(publicConfig.whatsappNumber)};\n`
    );
  });
  app.get("/api/health", async (req, res, next) => {
    try {
      await pool.query("SELECT 1");
      res.json({status: "ok"});
    } catch (error) {
      next(error);
    }
  });
  const handleAdminLogin = async (req, res, next) => {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");
    if (!username || !password || username.length > 80) {
      return res.status(400).json({message: "Username dan kata sandi wajib diisi."});
    }
    try {
      const [rows] = await pool.execute(
        "SELECT id, username, password_hash, display_name, role FROM admins WHERE username = ? LIMIT 1",
        [username]
      );
      const admin = rows[0];
      if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
        return res.status(401).json({message: "Username atau kata sandi tidak cocok."});
      }
      req.session.regenerate(error => {
        if (error) return next(error);
        req.session.user = {id: admin.id, username: admin.username, name: admin.display_name, role: admin.role};
        req.session.save(saveError => {
          if (saveError) return next(saveError);
          res.json({user: req.session.user});
        });
      });
    } catch (error) {
      next(error);
    }
  };
  app.post("/api/admin/login", loginLimiter, handleAdminLogin);
  app.post("/api/login", loginLimiter, handleAdminLogin);
  app.get("/api/admin/me", requireAdmin, (req, res) => res.json({user: req.session.user}));
  app.post("/api/admin/logout", requireAdmin, (req, res, next) => {
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie("cipta_jaya_session", {httpOnly: true, sameSite: "lax", secure: env.SESSION_COOKIE_SECURE === "true"});
      res.status(204).end();
    });
  });

  app.get("/api/products", async (req, res, next) => {
    const conditions = ["p.published = 1", "p.archived = 0"];
    const values = [];
    if (req.query.featured === "true") conditions.push("p.featured = 1");
    if (req.query.exclude) {
      conditions.push("p.id <> ?");
      values.push(String(req.query.exclude));
    }
    if (req.query.category) {
      const category = String(req.query.category).trim();
      const aliases = CATEGORY_SEARCH[category];
      if (aliases) {
        conditions.push(`(${aliases.map(() => "p.category LIKE ?").join(" OR ")})`);
        values.push(...aliases.map(alias => `%${alias}%`));
      } else {
        conditions.push("p.category = ?");
        values.push(category.slice(0, 100));
      }
    }
    if (req.query.search) {
      const term = `%${String(req.query.search).trim().slice(0, 100)}%`;
      conditions.push("(p.name LIKE ? OR p.sku LIKE ? OR p.category LIKE ? OR p.description LIKE ?)");
      values.push(term, term, term, term);
    }
    if (req.query.status === "ready") conditions.push("p.stock_qty > 0");
    if (req.query.status === "out") conditions.push("p.stock_qty = 0");
    const sort = {
      "price-asc": "p.price ASC, p.name ASC",
      "price-desc": "p.price DESC, p.name ASC",
      name: "p.name ASC",
      popular: "p.sold_count DESC, p.name ASC"
    }[req.query.sort] || "p.featured DESC, p.name ASC";
    const limit = Math.min(500, Math.max(1, Number.parseInt(req.query.limit, 10) || 500));
    const where = conditions.join(" AND ");
    try {
      const [[rows], [[countRow]], [categoryRows], [[updatedRow]], [[publishedCount]]] = await Promise.all([
        pool.execute(`SELECT p.* FROM products p WHERE ${where} ORDER BY ${sort} LIMIT ?`, [...values, limit]),
        pool.execute(`SELECT COUNT(*) AS total FROM products p WHERE ${where}`, values),
        pool.execute(
          "SELECT category, COUNT(*) AS total FROM products WHERE published = 1 AND archived = 0 GROUP BY category"
        ),
        pool.execute("SELECT MAX(updated_at) AS last_updated FROM products WHERE published = 1 AND archived = 0"),
        pool.execute("SELECT COUNT(*) AS total FROM products WHERE published = 1 AND archived = 0")
      ]);
      const categoryCounts = Object.fromEntries(categoryRows.map(row => [row.category, Number(row.total)]));
      res.json({
        data: rows.map(productView),
        total: Number(countRow.total),
        totalPublished: Number(publishedCount.total),
        categoryCounts,
        lastUpdated: updatedRow.last_updated
      });
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/products/:id", async (req, res, next) => {
    try {
      const [rows] = await pool.execute(
        "SELECT p.* FROM products p WHERE p.id = ? AND p.published = 1 AND p.archived = 0 LIMIT 1",
        [String(req.params.id)]
      );
      if (!rows.length) return res.status(404).json({message: "Produk tidak ditemukan."});
      res.json({data: productView(rows[0])});
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/admin/products", requireAdmin, async (req, res, next) => {
    const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
    const pageSize = 10;
    const search = String(req.query.search || "").trim().slice(0, 100);
    const conditions = [];
    const values = [];
    const status = String(req.query.status || "all");
    if (status === "published") conditions.push("published = 1 AND archived = 0");
    else if (status === "out") conditions.push("stock_qty = 0 AND archived = 0");
    else if (status === "archived") conditions.push("archived = 1");
    else if (status === "draft") conditions.push("published = 0 AND archived = 0");
    if (search) {
      conditions.push("(name LIKE ? OR sku LIKE ? OR category LIKE ?)");
      const term = `%${search}%`;
      values.push(term, term, term);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    try {
      const [[rows], [[countRow]], [[summary]]] = await Promise.all([
        pool.execute(`SELECT * FROM products ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`, [...values, pageSize, (page - 1) * pageSize]),
        pool.execute(`SELECT COUNT(*) AS total FROM products ${where}`, values),
        pool.execute(
          `SELECT COUNT(*) AS total,
            SUM(featured = 1 AND archived = 0) AS featured,
            SUM(stock_qty > 0 AND archived = 0) AS ready,
            SUM(stock_qty = 0 AND archived = 0) AS outOfStock,
            SUM(archived = 1) AS archived,
            SUM(published = 0 AND archived = 0) AS draft,
            SUM(published = 1 AND archived = 0) AS published
           FROM products`
        )
      ]);
      res.json({
        data: rows.map(productView),
        total: Number(countRow.total),
        page,
        pageSize,
        pages: Math.max(1, Math.ceil(Number(countRow.total) / pageSize)),
        summary: Object.fromEntries(Object.entries(summary).map(([key, value]) => [key, Number(value || 0)]))
      });
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/admin/products", requireAdmin, async (req, res, next) => {
    const result = validateProduct(req.body);
    if (result.error) return res.status(400).json({message: result.error});
    const product = result.product;
    const id = randomUUID();
    const baseSlug = slugify(product.name);
    try {
      const [existing] = await pool.execute("SELECT id FROM products WHERE slug = ? LIMIT 1", [baseSlug]);
      const slug = existing.length ? `${baseSlug}-${id.slice(0, 8)}` : baseSlug;
      await pool.execute(
        `INSERT INTO products
          (id, name, slug, sku, category, description, price, wholesale_price, wholesale_min,
           unit, stock_qty, image, gallery, benefits, specifications, featured, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, product.name, slug, product.sku, product.category, product.description, product.price,
          product.wholesalePrice, product.wholesaleMin, product.unit, product.stockQty, product.image,
          product.gallery, product.benefits, product.specifications, product.featured, product.published]
      );
      const [rows] = await pool.execute("SELECT * FROM products WHERE id = ?", [id]);
      res.status(201).json({data: productView(rows[0])});
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return res.status(409).json({message: "SKU tersebut sudah digunakan."});
      next(error);
    }
  });
  app.put("/api/admin/products/:id", requireAdmin, async (req, res, next) => {
    const result = validateProduct(req.body);
    if (result.error) return res.status(400).json({message: result.error});
    const product = result.product;
    try {
      await pool.execute(
        `UPDATE products SET name = ?, sku = ?, category = ?, description = ?, price = ?,
          wholesale_price = ?, wholesale_min = ?, unit = ?, stock_qty = ?, image = ?,
          gallery = ?, benefits = ?, specifications = ?, featured = ?, published = ?
         WHERE id = ?`,
        [product.name, product.sku, product.category, product.description, product.price,
          product.wholesalePrice, product.wholesaleMin, product.unit, product.stockQty, product.image,
          product.gallery, product.benefits, product.specifications, product.featured, product.published,
          String(req.params.id)]
      );
      const [rows] = await pool.execute("SELECT * FROM products WHERE id = ?", [String(req.params.id)]);
      if (!rows.length) return res.status(404).json({message: "Produk tidak ditemukan."});
      res.json({data: productView(rows[0])});
    } catch (error) {
      if (error.code === "ER_DUP_ENTRY") return res.status(409).json({message: "SKU tersebut sudah digunakan."});
      next(error);
    }
  });
  app.patch("/api/admin/products/:id", requireAdmin, async (req, res, next) => {
    const allowed = {
      featured: ["featured", value => isBoolean(value) ? Number(value) : null],
      published: ["published", value => isBoolean(value) ? Number(value) : null],
      archived: ["archived", value => isBoolean(value) ? Number(value) : null],
      inStock: ["stock_qty", value => isBoolean(value) ? (value ? 1 : 0) : null],
      stockQty: ["stock_qty", value => Number.isSafeInteger(value) && value >= 0 && value <= 4294967295 ? value : null]
    };
    const entries = Object.entries(req.body || {});
    if (!entries.length || entries.some(([key]) => !allowed[key])) {
      return res.status(400).json({message: "Perubahan produk tidak valid."});
    }
    const fields = [];
    const values = [];
    for (const [key, value] of entries) {
      const [column, normalize] = allowed[key];
      const normalized = normalize(value);
      if (normalized === null) return res.status(400).json({message: `Nilai ${key} tidak valid.`});
      fields.push(`${column} = ?`);
      values.push(normalized);
    }
    try {
      await pool.execute(
        `UPDATE products SET ${fields.join(", ")} WHERE id = ?`,
        [...values, String(req.params.id)]
      );
      const [rows] = await pool.execute("SELECT * FROM products WHERE id = ?", [String(req.params.id)]);
      if (!rows.length) return res.status(404).json({message: "Produk tidak ditemukan."});
      res.json({data: productView(rows[0])});
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/orders/checkout-intent", checkoutLimiter, async (req, res, next) => {
    const items = req.body?.items;
    const customer = req.body?.customer;
    const name = String(customer?.name || "").trim();
    const address = String(customer?.address || "").trim();
    const notes = String(customer?.notes || "").trim();
    if (!Array.isArray(items) || items.length < 1 || items.length > 50
        || !name || name.length > 100 || !address || address.length > 500 || notes.length > 300) {
      return res.status(400).json({message: "Data pemesan dan daftar barang wajib diisi dengan benar."});
    }
    const quantities = new Map();
    for (const item of items) {
      const productId = String(item?.productId || "");
      const quantity = Number(item?.quantity);
      if (!productId || productId.length > 36 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) {
        return res.status(400).json({message: "Produk atau jumlah pesanan tidak valid."});
      }
      quantities.set(productId, (quantities.get(productId) || 0) + quantity);
    }
    if ([...quantities.values()].some(quantity => quantity > 100000)) {
      return res.status(400).json({message: "Jumlah produk melampaui batas pemesanan."});
    }
    let connection;
    try {
      connection = await pool.getConnection();
      await connection.beginTransaction();
      const ids = [...quantities.keys()].sort();
      const placeholders = ids.map(() => "?").join(",");
      const [products] = await connection.execute(
        `SELECT id, name, sku, unit, price, wholesale_price, wholesale_min, stock_qty FROM products
         WHERE id IN (${placeholders}) AND published = 1 AND archived = 0
         ORDER BY id FOR UPDATE`,
        ids
      );
      if (products.length !== ids.length) {
        await connection.rollback();
        return res.status(409).json({message: "Satu atau beberapa produk sudah tidak tersedia."});
      }
      let total = 0;
      const orderItems = products.map(product => {
        const quantity = quantities.get(product.id);
        if (quantity > Number(product.stock_qty)) {
          throw Object.assign(new Error(`Stok ${product.name} tidak mencukupi.`), {status: 409});
        }
        const unitPrice = product.wholesale_price != null
          && quantity >= Number(product.wholesale_min)
          ? Number(product.wholesale_price)
          : Number(product.price);
        const lineTotal = unitPrice * quantity;
        if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(total + lineTotal)) {
          throw Object.assign(new Error("Total pesanan melampaui batas yang dapat diproses."), {status: 400});
        }
        total += lineTotal;
        return {product, quantity, unitPrice, lineTotal};
      });
      const orderId = randomUUID();
      await connection.execute(
        "INSERT INTO orders (id, customer_name, delivery_address, notes, total_amount) VALUES (?, ?, ?, ?, ?)",
        [orderId, name, address, notes || null, total]
      );
      for (const item of orderItems) {
        await connection.execute(
          `INSERT INTO order_items
            (order_id, product_id, product_name, sku, unit, unit_price, quantity, line_total)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.product.id, item.product.name, item.product.sku, item.product.unit,
            item.unitPrice, item.quantity, item.lineTotal]
        );
      }
      await connection.commit();
      res.status(201).json({
        data: {
          id: orderId,
          status: "pending_confirmation",
          total,
          items: orderItems.map(({product, quantity, unitPrice, lineTotal}) => ({
            productId: product.id,
            name: product.name,
            unit: product.unit,
            quantity,
            unitPrice,
            lineTotal
          }))
        }
      });
    } catch (error) {
      if (connection) await connection.rollback();
      if (error.status) return res.status(error.status).json({message: error.message});
      next(error);
    } finally {
      if (connection) connection.release();
    }
  });

  // === Upload foto produk (admin only) ===
  app.post("/api/admin/upload", requireAdmin, (req, res, next) => {
    uploadSingle(req, res, (error) => {
      if (error) {
        const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
        return res.status(status).json({message: error.message || "Upload gagal."});
      }
      if (!req.file) {
        return res.status(400).json({message: "Tidak ada file yang diunggah."});
      }
      // Kembalikan path relatif yang bisa langsung dipakai sebagai src gambar
      const relativePath = `/uploads/products/${req.file.filename}`;
      res.status(201).json({
        data: {
          filename: req.file.filename,
          path: relativePath,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    });
  });

  app.get("/", (req, res) => res.sendFile(path.join(FRONTEND_ROOT, "halaman.awal", "index.html")));
  app.get("/dashboard/dashboard.html", (req, res) => {
    if (req.session.user?.role !== "admin") return res.redirect("/login/login.html");
    res.sendFile(path.join(FRONTEND_ROOT, "dashboard", "dashboard.html"));
  });
  // Sajikan folder uploads dan halaman.awal sebagai file statis
  app.use("/uploads", express.static(UPLOADS_ROOT, {index: false}));
  app.use(express.static(path.join(FRONTEND_ROOT, "halaman.awal"), {index: false}));
  app.use(express.static(FRONTEND_ROOT, {index: false}));
  app.use("/api", (req, res) => res.status(404).json({message: "Endpoint API tidak ditemukan."}));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    console.error("Permintaan gagal:", error);
    res.status(500).json({message: "Terjadi kesalahan server."});
  });
  return app;
}

module.exports = {createApp, productView, validateProduct};
