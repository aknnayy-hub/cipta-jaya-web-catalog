const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const { createServer } = require("../src/server");

const publishedProduct = {
  id: "cement-001",
  name: "Semen Portland",
  category: "Semen",
  description: "Semen untuk pekerjaan konstruksi.",
  image: "/assets/semen-portland.jpg",
  price: 65000,
  stock: 0,
  status: "published",
};

let server;
let baseUrl;

before(async () => {
  server = createServer({
    findProductById: async (id) => {
      if (id === "cement-001") {
        return {
          id: publishedProduct.id,
          name: publishedProduct.name,
          category: publishedProduct.category,
          description: publishedProduct.description,
          image: publishedProduct.image,
          price: publishedProduct.price,
          stockQuantity: publishedProduct.stock,
          stockStatus: "out_of_stock",
        };
      }

      if (id === "draft-001" || id === "archived-001") {
        return null;
      }

      return null;
    },
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

test("returns detail for published products even when stock is empty", async () => {
  const response = await fetch(`${baseUrl}/api/products/cement-001`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body.data, {
    id: "cement-001",
    name: "Semen Portland",
    category: "Semen",
    description: "Semen untuk pekerjaan konstruksi.",
    image: "/assets/semen-portland.jpg",
    price: 65000,
    stockQuantity: 0,
    stockStatus: "out_of_stock",
  });
});

test("returns the same not-found response for drafts, archived, and unknown products", async () => {
  for (const id of ["draft-001", "archived-001", "missing-001"]) {
    const response = await fetch(`${baseUrl}/api/products/${id}`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(body.error, {
      code: "PRODUCT_NOT_FOUND",
      message: "Produk tidak ditemukan.",
    });
  }
});

test("rejects malformed product ids", async () => {
  const response = await fetch(`${baseUrl}/api/products/%2F`);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, "INVALID_PRODUCT_ID");
});

test("rejects methods other than GET", async () => {
  const response = await fetch(`${baseUrl}/api/products/cement-001`, {
    method: "POST",
  });
  const body = await response.json();

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
  assert.equal(body.error.code, "METHOD_NOT_ALLOWED");
});
