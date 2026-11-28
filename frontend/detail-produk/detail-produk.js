const SAMPLE_PRODUCTS = [
  {
    id: "prod-semen-mp-50",
    sku: "SMN-MP-50",
    name: "Semen Merah Putih PCC 50 Kg",
    category: "Semen & Pasir",
    price: 68000,
    unit: "sak",
    wholesalePrice: 65000,
    wholesaleMin: 40,
    stockQty: 120,
    featured: true,
    description: "Semen Portland Komposit (PCC) resmi dari Semen Merah Putih dengan kekuatan tekan optimal untuk pengecoran beton, pasangan bata, plesteran, dan acian.",
    image: "../halaman.awal/assets/hero-semen.jpg",
    specs: [
      ["Merek", "Semen Merah Putih"],
      ["Berat Bersih", "50 Kg / sak"],
      ["Standar", "SNI 7064:2014"],
      ["Aplikasi", "Struktur & Plesteran"]
    ]
  },
  {
    id: "prod-besi-ulir-10",
    sku: "BSI-ULR-10",
    name: "Besi Beton Ulir 10mm SNI (12m)",
    category: "Besi & Baja",
    price: 82500,
    unit: "batang",
    wholesalePrice: 79000,
    wholesaleMin: 50,
    stockQty: 85,
    featured: true,
    description: "Besi beton ulir berstandar SNI dengan daya ikat tinggi terhadap beton, ideal untuk sloof, kolom, balok, dan dak lantai bertingkat.",
    image: "",
    specs: [
      ["Diameter", "10 mm (Ulir)"],
      ["Panjang", "12 Meter"],
      ["Standar", "SNI 2052:2017"],
      ["Tipe", "BJTS 420B"]
    ]
  },
  {
    id: "prod-cat-interior-5kg",
    sku: "CAT-INT-05",
    name: "Cat Tembok Interior Anti-Noda 5 Kg",
    category: "Cat Tembok",
    price: 145000,
    unit: "galon",
    wholesalePrice: null,
    wholesaleMin: null,
    stockQty: 32,
    featured: true,
    description: "Cat tembok interior berbahan dasar air dengan hasil akhir halus matte, daya tutup luas, dan mudah dibersihkan dari noda rumah tangga.",
    image: "",
    specs: [
      ["Kemasan", "5 Kg (Galon)"],
      ["Hasil Akhir", "Matte Halus"],
      ["Daya Sebar", "10–12 m² / Kg"],
      ["Pengencer", "Air Bersih"]
    ]
  },
  {
    id: "prod-bata-ringan-10",
    sku: "BTA-AAC-10",
    name: "Bata Ringan Hebel AAC 10cm",
    category: "Bata & Mortar",
    price: 640000,
    unit: "m³",
    wholesalePrice: 615000,
    wholesaleMin: 10,
    stockQty: 18,
    featured: true,
    description: "Bata ringan AAC dengan ukuran presisi, bobot ringan sehingga mengurangi beban struktur bangunan, serta kedap panas dan suara.",
    image: "",
    specs: [
      ["Dimensi", "60 x 20 x 10 cm"],
      ["Isi per m³", "83 buah"],
      ["Kuat Tekan", "≥ 4.0 MPa"],
      ["Tipe", "AAC Standard"]
    ]
  },
  {
    id: "prod-pipa-pvc-3",
    sku: "PPA-AW-03",
    name: "Pipa PVC 3 Inch Tipe AW (4m)",
    category: "Pipa & Sanitari",
    price: 95000,
    unit: "batang",
    wholesalePrice: 90000,
    wholesaleMin: 20,
    stockQty: 45,
    featured: false,
    description: "Pipa PVC tipe AW berdinding tebal, tahan tekanan pompa air dan instalasi saluran pembuangan utama.",
    image: "",
    specs: [
      ["Ukuran", "3 Inch"],
      ["Panjang", "4 Meter"],
      ["Kelas", "Tipe AW (Tekanan Tinggi)"],
      ["Material", "uPVC Murni"]
    ]
  },
  {
    id: "prod-pasir-lumajang",
    sku: "PSR-COR-01",
    name: "Pasir Cor Hitam Super (1 Rit)",
    category: "Semen & Pasir",
    price: 1450000,
    unit: "rit",
    wholesalePrice: null,
    wholesaleMin: null,
    stockQty: 0,
    featured: false,
    description: "Pasir cor kualitas super minim kadar lumpur untuk campuran beton cor berdaya tahan tinggi.",
    image: "",
    specs: [
      ["Volume", "1 Rit Dump"],
      ["Kadar Lumpur", "< 3%"],
      ["Penggunaan", "Cor Beton & Pondasi"],
      ["Pengiriman", "Armada Toko"]
    ]
  }
];

const CART_KEY = "cj_cart_items";

function formatRupiah(amount) {
  return "Rp " + Number(amount || 0).toLocaleString("id-ID");
}

function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function updateCartBadge() {
  const cart = getCart();
  const totalQty = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalAmount = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  document.getElementById("cartCount").textContent = totalQty;
  document.getElementById("cartTotal").textContent = formatRupiah(totalAmount);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function renderDetail() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id") || SAMPLE_PRODUCTS[0].id;
  const product = SAMPLE_PRODUCTS.find(p => p.id === productId);

  const container = document.getElementById("detailContainer");
  const notFound = document.getElementById("notFoundState");

  if (!product) {
    container.hidden = true;
    notFound.hidden = false;
    return;
  }

  document.title = `${product.name} | Cipta Jaya`;
  document.getElementById("breadcrumbCategory").textContent = product.category;
  document.getElementById("breadcrumbName").textContent = product.name;

  const isReady = product.stockQty > 0;
  const mediaHtml = product.image
    ? `<img src="${product.image}" alt="${product.name}">`
    : `<div class="detail-media-placeholder" aria-hidden="true">🧱</div>`;

  const wholesaleHtml = product.wholesalePrice
    ? `<div class="price-wholesale">Harga Grosir: ${formatRupiah(product.wholesalePrice)} / ${product.unit} (min. ${product.wholesaleMin} ${product.unit})</div>`
    : "";

  const specsHtml = (product.specs || [])
    .map(([k, v]) => `<li><span>${k}</span><strong>${v}</strong></li>`)
    .join("");

  const waText = encodeURIComponent(`Halo Admin Cipta Jaya, saya ingin menanyakan ketersediaan dan harga produk: ${product.name} (SKU: ${product.sku}).`);

  container.innerHTML = `
    <div class="detail-media">${mediaHtml}</div>
    <div class="detail-info">
      <div class="badges">
        <span class="badge badge-cat">${product.category}</span>
        <span class="badge ${isReady ? "badge-ready" : "badge-out"}">${isReady ? "Stok Ready" : "Stok Tidak Ada"}</span>
        ${product.featured ? '<span class="badge badge-featured">★ Produk Unggulan</span>' : ""}
      </div>
      <h1 class="detail-title">${product.name}</h1>
      <div class="detail-sku">SKU: ${product.sku}</div>

      <div class="price-box">
        <div class="price-main">${formatRupiah(product.price)} <small>/ ${product.unit}</small></div>
        ${wholesaleHtml}
      </div>

      <p class="detail-desc">${product.description}</p>

      <div class="specs-box">
        <h2>Spesifikasi Produk</h2>
        <ul class="specs-list">${specsHtml}</ul>
      </div>

      <div class="purchase-row">
        <div class="qty-control">
          <button type="button" id="qtyMinus" aria-label="Kurangi jumlah" ${isReady ? "" : "disabled"}>-</button>
          <input type="number" id="qtyInput" value="1" min="1" aria-label="Jumlah beli" ${isReady ? "" : "disabled"}>
          <button type="button" id="qtyPlus" aria-label="Tambah jumlah" ${isReady ? "" : "disabled"}>+</button>
        </div>
        <button class="button button-primary" type="button" id="addCartBtn" ${isReady ? "" : "disabled"}>
          ${isReady ? "Tambah ke Keranjang" : "Stok Sedang Habis"}
        </button>
        <a class="button button-wa" href="https://wa.me/62895366125869?text=${waText}" target="_blank" rel="noopener noreferrer">
          Tanya Admin
        </a>
      </div>
    </div>
  `;

  const qtyInput = document.getElementById("qtyInput");
  document.getElementById("qtyMinus")?.addEventListener("click", () => {
    const val = Math.max(1, Number(qtyInput.value || 1) - 1);
    qtyInput.value = val;
  });
  document.getElementById("qtyPlus")?.addEventListener("click", () => {
    qtyInput.value = Math.max(1, Number(qtyInput.value || 1) + 1);
  });
  document.getElementById("addCartBtn")?.addEventListener("click", () => {
    if (!isReady) return;
    const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
    const cart = getCart();
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
      existing.qty += qty;
      showToast("Jumlah produk di keranjang diperbarui");
    } else {
      cart.push({
        id: product.id,
        name: product.name,
        category: product.category,
        price: product.price,
        unit: product.unit,
        image: product.image,
        inStock: true,
        qty
      });
      showToast("Produk berhasil ditambahkan ke keranjang");
    }
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartBadge();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("menuButton")?.addEventListener("click", () => {
    const nav = document.getElementById("primaryNav");
    const open = nav.classList.toggle("open");
    document.getElementById("menuButton").setAttribute("aria-expanded", String(open));
  });
  updateCartBadge();
  renderDetail();
});
