const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { after, before, test } = require("node:test");
const { findPublishedProductById } = require("../src/products");

let dataFile;
let tempDirectory;

before(async () => {
  tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "cipta-jaya-products-"));
  dataFile = path.join(tempDirectory, "products.json");
});

after(async () => {
  await fs.rm(tempDirectory, { recursive: true, force: true });
});

test("maps published product fields and marks zero stock as out of stock", async () => {
  await fs.writeFile(
    dataFile,
    JSON.stringify([
      {
        id: "cement-001",
        name: "Semen Portland",
        category: "Semen",
        description: "Semen untuk pekerjaan konstruksi.",
        image: "/assets/semen-portland.jpg",
        price: 65000,
        stock: 0,
        status: "published",
      },
    ]),
  );

  assert.deepEqual(await findPublishedProductById("cement-001", dataFile), {
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

test("does not return draft or archived products", async () => {
  await fs.writeFile(
    dataFile,
    JSON.stringify([
      { id: "draft-001", status: "draft" },
      { id: "archived-001", status: "archived" },
    ]),
  );

  assert.equal(await findPublishedProductById("draft-001", dataFile), null);
  assert.equal(await findPublishedProductById("archived-001", dataFile), null);
});

test("rejects malformed published product data", async () => {
  await fs.writeFile(dataFile, JSON.stringify([{ id: "invalid-001", status: "published" }]));

  await assert.rejects(
    findPublishedProductById("invalid-001", dataFile),
    /Product data is invalid/,
  );
});
