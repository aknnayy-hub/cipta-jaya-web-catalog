const http = require("node:http");
const { findPublishedProductById } = require("./products");

const PRODUCT_PATH = /^\/api\/products\/([^/]+)$/;
const PRODUCT_ID = /^[A-Za-z0-9_-]{1,64}$/;

function sendJson(response, statusCode, body, headers = {}) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

function createServer({ findProductById = findPublishedProductById } = {}) {
  return http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    const pathMatch = url.pathname.match(PRODUCT_PATH);

    if (!pathMatch) {
      sendJson(response, 404, {
        error: { code: "NOT_FOUND", message: "Endpoint tidak ditemukan." },
      });
      return;
    }

    if (request.method !== "GET") {
      sendJson(
        response,
        405,
        {
          error: {
            code: "METHOD_NOT_ALLOWED",
            message: "Metode request tidak didukung.",
          },
        },
        { Allow: "GET" },
      );
      return;
    }

    let id;
    try {
      id = decodeURIComponent(pathMatch[1]);
    } catch {
      sendJson(response, 400, {
        error: { code: "INVALID_PRODUCT_ID", message: "ID produk tidak valid." },
      });
      return;
    }

    if (!PRODUCT_ID.test(id)) {
      sendJson(response, 400, {
        error: { code: "INVALID_PRODUCT_ID", message: "ID produk tidak valid." },
      });
      return;
    }

    try {
      const product = await findProductById(id);
      if (!product) {
        sendJson(response, 404, {
          error: { code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan." },
        });
        return;
      }

      sendJson(response, 200, { data: product });
    } catch (error) {
      console.error("Failed to load product detail:", error);
      sendJson(response, 500, {
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Terjadi kesalahan saat memuat produk.",
        },
      });
    }
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, () => {
    console.log(`Product API listening on http://localhost:${port}`);
  });
}

module.exports = { createServer };
