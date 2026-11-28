const SAMPLE_PRODUCTS = [
  {
    id: "prod-semen-mp-50",
    name: "Semen Merah Putih PCC 50 Kg",
    category: "Semen & Pasir",
    price: 68000,
    unit: "sak",
    wholesalePrice: 65000,
    wholesaleMin: 40,
    stockQty: 120,
    status: "Dipublikasikan",
    featured: true,
    description: "Semen Portland Komposit berkualitas tinggi untuk konstruksi umum, plesteran, dan pasangan bata.",
    image: "../halaman.awal/assets/hero-semen.jpg"
  },
  {
    id: "prod-besi-ulir-10",
    name: "Besi Beton Ulir 10mm SNI (12m)",
    category: "Besi & Baja",
    price: 82500,
    unit: "batang",
    wholesalePrice: 79000,
    wholesaleMin: 50,
    stockQty: 85,
    status: "Dipublikasikan",
    featured: true,
    description: "Besi tulangan ulir bersertifikat SNI untuk struktur kolom, balok, dan pondasi bangunan.",
    image: ""
  },
  {
    id: "prod-cat-interior-5kg",
    name: "Cat Tembok Interior Anti-Noda 5 Kg",
    category: "Cat Tembok",
    price: 145000,
    unit: "galon",
    wholesalePrice: null,
    wholesaleMin: null,
    stockQty: 32,
    status: "Dipublikasikan",
    featured: true,
    description: "Cat tembok matte dengan daya tutup maksimal, rendah bau, dan mudah dibersihkan.",
    image: ""
  },
  {
    id: "prod-bata-ringan-10",
    name: "Bata Ringan Hebel AAC 10cm",
    category: "Bata & Mortar",
    price: 640000,
    unit: "m³",
    wholesalePrice: 615000,
    wholesaleMin: 10,
    stockQty: 18,
    status: "Dipublikasikan",
    featured: true,
    description: "Bata ringan presisi tinggi, ringan, kedap suara, dan mempercepat pengerjaan dinding.",
    image: ""
  },
  {
    id: "prod-pipa-pvc-3",
    name: "Pipa PVC 3 Inch Tipe AW (4m)",
    category: "Pipa & Sanitari",
    price: 95000,
    unit: "batang",
    wholesalePrice: 90000,
    wholesaleMin: 20,
    stockQty: 45,
    status: "Dipublikasikan",
    featured: false,
    description: "Pipa PVC tebal tipe AW tahan tekanan tinggi untuk saluran air bersih dan pembuangan.",
    image: ""
  },
  {
    id: "prod-pasir-lumajang",
    name: "Pasir Cor Hitam Super (1 Rit)",
    category: "Semen & Pasir",
    price: 1450000,
    unit: "rit",
    wholesalePrice: null,
    wholesaleMin: null,
    stockQty: 0,
    status: "Stok Habis",
    featured: false,
    description: "Pasir cor bersih minim lumpur, cocok untuk pengecoran dak dan pondasi kokoh.",
    image: ""
  },
  {
    id: "prod-galvalum-030",
    name: "Atap Spandek Galvalum 0.30mm",
    category: "Atap & Seng",
    price: 58000,
    unit: "meter",
    wholesalePrice: 55000,
    wholesaleMin: 100,
    stockQty: 200,
    status: "Dipublikasikan",
    featured: false,
    description: "Atap seng galvalum tahan karat dan cuaca ekstrem untuk kanopi, gudang, dan rumah.",
    image: ""
  },
  {
    id: "prod-mortar-perekat",
    name: "Mortar Perekat Bata Ringan 40 Kg",
    category: "Bata & Mortar",
    price: 89000,
    unit: "sak",
    wholesalePrice: 84000,
    wholesaleMin: 30,
    stockQty: 0,
    status: "Stok Habis",
    featured: false,
    description: "Semen instan perekat bata ringan dengan daya rekat tinggi dan aplikasi tipis.",
    image: ""
  }
];

const CART_KEY = "cj_cart_items";
let activeCategory = "all";

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

function saveCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
  updateCartBadge();
}

function updateCartBadge() {
  const cart = getCart();
  const totalQty = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalAmount = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  const countEl = document.getElementById("cartCount");
  const totalEl = document.getElementById("cartTotal");
  if (countEl) countEl.textContent = totalQty;
  if (totalEl) totalEl.textContent = formatRupiah(totalAmount);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function addToCart(productId) {
  const product = SAMPLE_PRODUCTS.find(p => p.id === productId);
  if (!product || product.stockQty <= 0) {
    showToast("Produk sedang tidak tersedia");
    return;
  }
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.qty += 1;
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
      qty: 1
    });
    showToast("Produk berhasil ditambahkan ke keranjang");
  }
  saveCart(cart);
}

function getFilteredProducts() {
  const query = (document.getElementById("headerSearch")?.value || "").trim().toLowerCase();
  const stockFilter = document.getElementById("stockFilter")?.value || "all";
  const sortFilter = document.getElementById("sortFilter")?.value || "featured";

  let list = SAMPLE_PRODUCTS.filter(p => p.status === "Dipublikasikan" || p.status === "Stok Habis");

  if (activeCategory !== "all") {
    list = list.filter(p => p.category === activeCategory);
  }
  if (stockFilter === "ready") {
    list = list.filter(p => p.stockQty > 0);
  } else if (stockFilter === "out") {
    list = list.filter(p => p.stockQty <= 0);
  }
  if (query) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    );
  }

  if (sortFilter === "price-asc") {
    list.sort((a, b) => a.price - b.price);
  } else if (sortFilter === "price-desc") {
    list.sort((a, b) => b.price - a.price);
  } else if (sortFilter === "name-asc") {
    list.sort((a, b) => a.name.localeCompare(b.name, "id"));
  } else {
    list.sort((a, b) => Number(b.featured) - Number(a.featured));
  }

  return list;
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const emptyState = document.getElementById("emptyState");
  const resultCount = document.getElementById("resultCount");
  const products = getFilteredProducts();

  resultCount.textContent = `${products.length} Produk`;

  if (!products.length) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  grid.innerHTML = products.map(p => {
    const isReady = p.stockQty > 0;
    const mediaHtml = p.image
      ? `<img src="${p.image}" alt="${p.name}" loading="lazy">`
      : `<div class="card-media-placeholder" aria-hidden="true">🧱</div>`;
    const wholesaleHtml = p.wholesalePrice
      ? `<div class="card-wholesale">Grosir ${formatRupiah(p.wholesalePrice)} (min. ${p.wholesaleMin} ${p.unit})</div>`
      : "";

    return `
      <article class="product-card ${isReady ? "" : "out-of-stock"}">
        <div class="card-media">
          ${mediaHtml}
          <div class="badge-row">
            <span class="stock-badge ${isReady ? "" : "out"}">${isReady ? "Ready" : "Tidak Ada"}</span>
            ${p.featured ? '<span class="featured-badge">★ Unggulan</span>' : ""}
          </div>
        </div>
        <div class="card-body">
          <span class="card-category">${p.category}</span>
          <h2 class="card-title">${p.name}</h2>
          <p class="card-desc">${p.description}</p>
          <div class="card-price-wrap">
            <div class="card-price">${formatRupiah(p.price)} <small>/ ${p.unit}</small></div>
            ${wholesaleHtml}
          </div>
          <div class="card-actions">
            <a class="button button-outline" href="../detail-produk/detail-produk.html?id=${encodeURIComponent(p.id)}">Lihat Detail</a>
            <button class="button button-primary" type="button" data-add="${p.id}" ${isReady ? "" : "disabled"}>
              ${isReady ? "+ Keranjang" : "Stok Habis"}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const initialCat = params.get("kategori");
  if (initialCat) {
    activeCategory = initialCat;
    document.querySelectorAll("#categoryChips .chip").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.category === initialCat);
    });
  }

  document.getElementById("categoryChips")?.addEventListener("click", event => {
    const btn = event.target.closest(".chip");
    if (!btn) return;
    activeCategory = btn.dataset.category;
    document.querySelectorAll("#categoryChips .chip").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    renderProducts();
  });

  document.getElementById("headerSearch")?.addEventListener("input", renderProducts);
  document.getElementById("stockFilter")?.addEventListener("change", renderProducts);
  document.getElementById("sortFilter")?.addEventListener("change", renderProducts);

  document.getElementById("resetFilters")?.addEventListener("click", () => {
    activeCategory = "all";
    document.getElementById("headerSearch").value = "";
    document.getElementById("stockFilter").value = "all";
    document.querySelectorAll("#categoryChips .chip").forEach(c => {
      c.classList.toggle("active", c.dataset.category === "all");
    });
    renderProducts();
  });

  document.getElementById("productGrid")?.addEventListener("click", event => {
    const btn = event.target.closest("[data-add]");
    if (btn) addToCart(btn.dataset.add);
  });

  document.getElementById("menuButton")?.addEventListener("click", () => {
    const nav = document.getElementById("primaryNav");
    const open = nav.classList.toggle("open");
    document.getElementById("menuButton").setAttribute("aria-expanded", String(open));
  });

  updateCartBadge();
  renderProducts();
});
