const assert = require("node:assert/strict");
const {after, before, test} = require("node:test");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const {createApp, validateProduct} = require("./app");

let server;
let baseUrl;
let cookie;

const adminPassword = "test-password-only-for-tests";
let adminRow;

function fakePool() {
  return {
    async query() {
      return [[{1: 1}], []];
    },
    async execute(sql) {
      if (sql.includes("FROM admins")) return [[adminRow], []];
      if (sql.startsWith("SELECT p.* FROM products")) return [[], []];
      if (sql.startsWith("SELECT COUNT(*) AS total FROM products p")) return [[{total: 0}], []];
      if (sql.startsWith("SELECT category, COUNT(*)")) return [[], []];
      if (sql.startsWith("SELECT MAX(updated_at)")) return [[{last_updated: null}], []];
      if (sql.startsWith("SELECT * FROM products") && sql.includes("ORDER BY updated_at")) return [[], []];
      if (sql.startsWith("SELECT COUNT(*) AS total FROM products")) return [[{total: 0}], []];
      if (sql.startsWith("SELECT COUNT(*) AS total,")) {
        return [[{total: 0, featured: 0, ready: 0, outOfStock: 0, archived: 0, draft: 0, published: 0}], []];
      }
      return [[], []];
    }
  };
}

function checkoutPool() {
  const savedOrders = [];
  const savedItems = [];
  const product = {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Semen Test",
    sku: "SMN-TEST",
    unit: "sak",
    price: 1000,
    wholesale_price: 800,
    wholesale_min: 10,
    stock_qty: 20
  };
  return {
    savedOrders,
    savedItems,
    async getConnection() {
      return {
        async beginTransaction() {},
        async commit() {},
        async rollback() {},
        release() {},
        async execute(sql, params) {
          if (sql.includes("FROM products") && sql.includes("FOR UPDATE")) {
            return [[product].filter(row => params.includes(row.id)), []];
          }
          if (sql.startsWith("INSERT INTO orders")) {
            savedOrders.push(params);
            return [{affectedRows: 1}, []];
          }
          if (sql.startsWith("INSERT INTO order_items")) {
            savedItems.push(params);
            return [{affectedRows: 1}, []];
          }
          return [[], []];
        }
      };
    }
  };
}

before(async () => {
  adminRow = {
    id: 7,
    username: "test-admin",
    password_hash: await bcrypt.hash(adminPassword, 4),
    display_name: "Test Admin",
    role: "admin"
  };
  const app = createApp({
    pool: fakePool(),
    sessionStore: new session.MemoryStore(),
    env: {SESSION_SECRET: "test-session-secret-with-more-than-32-characters", WHATSAPP_NUMBER: "6281234567890"}
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

test("public catalog reads use the public API and admin data requires a session", async () => {
  const home = await fetch(`${baseUrl}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Toko Bahan Bangunan Cipta Jaya/);

  const config = await fetch(`${baseUrl}/config.js`);
  assert.match(await config.text(), /6281234567890/);

  const catalog = await fetch(`${baseUrl}/api/products?featured=true&published=true`);
  assert.equal(catalog.status, 200);
  assert.deepEqual(await catalog.json(), {
    data: [],
    total: 0,
    totalPublished: 0,
    categoryCounts: {},
    lastUpdated: null
  });

  const denied = await fetch(`${baseUrl}/api/admin/products`);
  assert.equal(denied.status, 401);
  assert.equal((await denied.json()).message, "Silakan masuk sebagai admin.");

  const privateDashboard = await fetch(`${baseUrl}/dashboard/dashboard.html`, {redirect: "manual"});
  assert.equal(privateDashboard.status, 302);
  assert.equal(privateDashboard.headers.get("location"), "/login/login.html");
});

test("admin login creates a session used to protect dashboard and product APIs", async () => {
  const failed = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({username: "test-admin", password: "wrong-password"})
  });
  assert.equal(failed.status, 401);

  const response = await fetch(`${baseUrl}/api/admin/login`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({username: "test-admin", password: adminPassword})
  });
  assert.equal(response.status, 200);
  cookie = response.headers.get("set-cookie").split(";")[0];
  assert.equal((await response.json()).user.role, "admin");

  const dashboard = await fetch(`${baseUrl}/dashboard/dashboard.html`, {headers: {Cookie: cookie}});
  assert.equal(dashboard.status, 200);
  assert.match(await dashboard.text(), /Kelola Data &amp; Stok Produk/);

  const products = await fetch(`${baseUrl}/api/admin/products?page=1`, {headers: {Cookie: cookie}});
  assert.equal(products.status, 200);
  const payload = await products.json();
  assert.equal(payload.total, 0);
  assert.equal(payload.summary.total, 0);

  const profile = await fetch(`${baseUrl}/api/admin/me`, {headers: {Cookie: cookie}});
  assert.equal((await profile.json()).user.username, "test-admin");
  const logout = await fetch(`${baseUrl}/api/admin/logout`, {
    method: "POST",
    headers: {Cookie: cookie}
  });
  assert.equal(logout.status, 204);
  const expiredSession = await fetch(`${baseUrl}/api/admin/products`, {headers: {Cookie: cookie}});
  assert.equal(expiredSession.status, 401);
});

test("product validation rejects invalid quantities and prices", () => {
  const valid = validateProduct({
    name: "Semen Contoh",
    sku: "SMN-001",
    category: "Semen & Perekat",
    price: 58000,
    stockQty: 15,
    unit: "sak"
  });
  assert.equal(valid.error, undefined);
  assert.equal(valid.product.stockQty, 15);
  assert.ok(validateProduct({name: "x", sku: "x", category: "x", price: 2.5}).error);
  assert.ok(validateProduct({name: "x", sku: "x", category: "x", price: 10, stockQty: -1}).error);
  assert.ok(validateProduct({name: "x", sku: "x", category: "x", price: 10, wholesalePrice: 8}).error);
});

test("checkout stores a pending order using current stock and wholesale price", async t => {
  const pool = checkoutPool();
  const app = createApp({
    pool,
    sessionStore: new session.MemoryStore(),
    env: {SESSION_SECRET: "test-session-secret-with-more-than-32-characters"}
  });
  const checkoutServer = app.listen(0, "127.0.0.1");
  await new Promise(resolve => checkoutServer.once("listening", resolve));
  t.after(() => new Promise((resolve, reject) =>
    checkoutServer.close(error => error ? reject(error) : resolve())
  ));
  const url = `http://127.0.0.1:${checkoutServer.address().port}/api/orders/checkout-intent`;
  const payload = {
    items: [{productId: "11111111-1111-4111-8111-111111111111", quantity: 10}],
    customer: {name: "Pemesan Uji", address: "Alamat proyek"}
  };
  const response = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.data.status, "pending_confirmation");
  assert.equal(result.data.total, 8000);
  assert.equal(result.data.items[0].unitPrice, 800);
  assert.equal(pool.savedOrders[0][4], 8000);
  assert.equal(pool.savedItems[0][5], 800);

  const outOfStock = await fetch(url, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      ...payload,
      items: [{productId: "11111111-1111-4111-8111-111111111111", quantity: 21}]
    })
  });
  assert.equal(outOfStock.status, 409);
  assert.equal(pool.savedOrders.length, 1);
});
