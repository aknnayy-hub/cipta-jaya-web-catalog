const fs = require("node:fs/promises");
const path = require("node:path");

const PRODUCTS_FILE = path.join(__dirname, "..", "data", "products.json");

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateProduct(product) {
  return (
    product !== null &&
    typeof product === "object" &&
    isNonEmptyString(product.id) &&
    isNonEmptyString(product.name) &&
    isNonEmptyString(product.category) &&
    isNonEmptyString(product.description) &&
    isNonEmptyString(product.image) &&
    typeof product.price === "number" &&
    Number.isFinite(product.price) &&
    product.price >= 0 &&
    Number.isInteger(product.stock) &&
    product.stock >= 0 &&
    ["published", "draft", "archived"].includes(product.status)
  );
}

async function findPublishedProductById(id, filePath = PRODUCTS_FILE) {
  const contents = await fs.readFile(filePath, "utf8");
  const products = JSON.parse(contents);

  if (!Array.isArray(products)) {
    throw new TypeError("Product data must be a JSON array");
  }

  const product = products.find((item) => item && item.id === id);
  if (!product || product.status !== "published") {
    return null;
  }

  if (!validateProduct(product)) {
    throw new TypeError(`Product data is invalid for product ${id}`);
  }

  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description,
    image: product.image,
    price: product.price,
    stockQuantity: product.stock,
    stockStatus: product.stock > 0 ? "in_stock" : "out_of_stock",
  };
}

module.exports = { findPublishedProductById };
