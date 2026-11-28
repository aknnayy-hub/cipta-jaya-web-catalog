require("dotenv").config();

const {randomUUID} = require("node:crypto");
const {createPool} = require("./db");

const INITIAL_PRODUCTS = [
  {
    name: "Semen Merah Putih Watershield 50kg",
    slug: "semen-merah-putih-watershield-50kg",
    sku: "SMP-WS-50KG",
    category: "Semen & Pasir",
    description: "Formula tahan air dengan daya rekat kuat, cocok untuk pondasi, plesteran, dan dinding basement.",
    price: 68000,
    wholesalePrice: 65000,
    wholesaleMin: 40,
    unit: "sak",
    stockQty: 120,
    image: "/halaman.awal/assets/hero-semen.jpg",
    featured: 1,
    published: 1
  },
  {
    name: "Besi Beton Ulir D10 SNI (12m)",
    slug: "besi-beton-ulir-d10-sni-12m",
    sku: "BSI-ULR-10",
    category: "Besi & Baja",
    description: "Besi tulangan ulir bersertifikat SNI 2052:2017 untuk struktur kolom, balok, dan pondasi bangunan.",
    price: 82500,
    wholesalePrice: 79000,
    wholesaleMin: 50,
    unit: "batang",
    stockQty: 85,
    image: "",
    featured: 1,
    published: 1
  },
  {
    name: "Bata Ringan Hebel AAC 10cm",
    slug: "bata-ringan-hebel-aac-10cm",
    sku: "AAC-10-PRM",
    category: "Bata & Mortar",
    description: "Bata ringan presisi tinggi, kedap suara, ringan, dan mempercepat proses pengerjaan dinding.",
    price: 640000,
    wholesalePrice: 615000,
    wholesaleMin: 10,
    unit: "m³",
    stockQty: 24,
    image: "",
    featured: 1,
    published: 1
  },
  {
    name: "Cat Pelapis Waterproofing 4kg Grey",
    slug: "cat-pelapis-waterproofing-4kg-grey",
    category: "Cat Tembok",
    sku: "CT-WPRF-04",
    description: "Pelindung elastis anti-bocor untuk dak beton, talang, dan dinding luar rumah.",
    price: 165000,
    wholesalePrice: null,
    wholesaleMin: null,
    unit: "galon",
    stockQty: 32,
    image: "",
    featured: 1,
    published: 1
  },
  {
    name: "Pipa PVC 3 Inch Tipe AW (4m)",
    slug: "pipa-pvc-3-inch-tipe-aw-4m",
    sku: "PPA-AW-03",
    category: "Pipa & Sanitari",
    description: "Pipa PVC berdinding tebal tipe AW tahan tekanan tinggi untuk saluran air bersih dan pembuangan.",
    price: 95000,
    wholesalePrice: 90000,
    wholesaleMin: 20,
    unit: "batang",
    stockQty: 45,
    image: "",
    featured: 0,
    published: 1
  },
  {
    name: "Atap Spandek Galvalum 0.30mm",
    slug: "atap-spandek-galvalum-030mm",
    sku: "ATP-GLV-030",
    category: "Atap & Seng",
    description: "Atap seng galvalum tahan karat dan cuaca ekstrem untuk kanopi, gudang, dan rumah.",
    price: 58000,
    wholesalePrice: 55000,
    wholesaleMin: 100,
    unit: "meter",
    stockQty: 200,
    image: "",
    featured: 0,
    published: 1
  }
];

async function main() {
  const pool = createPool();
  try {
    let inserted = 0;
    for (const p of INITIAL_PRODUCTS) {
      const [existing] = await pool.execute("SELECT id FROM products WHERE sku = ? LIMIT 1", [p.sku]);
      if (existing.length) continue;
      await pool.execute(
        `INSERT INTO products
          (id, name, slug, sku, category, description, price, wholesale_price, wholesale_min, unit, stock_qty, image, featured, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), p.name, p.slug, p.sku, p.category, p.description, p.price, p.wholesalePrice, p.wholesaleMin, p.unit, p.stockQty, p.image, p.featured, p.published]
      );
      inserted += 1;
    }
    console.log(`Seeder produk selesai. ${inserted} produk baru ditambahkan.`);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Seeder produk gagal:", error.message);
  process.exitCode = 1;
});
