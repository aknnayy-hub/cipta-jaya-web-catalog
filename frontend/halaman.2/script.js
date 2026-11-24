/*
 * Configure window.CIPTA_API_BASE before loading this file to connect the public
 * product endpoint. The endpoint must only return products intended for public view.
 */
const API_BASE = String(window.CIPTA_API_BASE || "").replace(/\/+$/, "");
const API_ENABLED = window.CIPTA_API_ENABLED ?? (window.location.protocol !== "file:" || Boolean(API_BASE));
const PRODUCT_ENDPOINT = `${API_BASE}/api/products`;
const categoryDefinitions = [
  {key: "all", label: "Semua Kategori"},
  {key: "Semen & Perekat", label: "Semen & Perekat"},
  {key: "Besi & Kawat", label: "Besi & Kawat"},
  {key: "Bata & Hebel", label: "Bata & Hebel"},
  {key: "Cat & Waterproofing", label: "Cat & Waterproofing"},
  {key: "Pipa PVC & Fitting", label: "Pipa PVC & Fitting"}
];
const categoryAliases = {
  "Semen & Perekat": ["semen", "perekat", "mortar", "acian"],
  "Besi & Kawat": ["besi", "kawat", "baja"],
  "Bata & Hebel": ["bata", "hebel", "aac"],
  "Cat & Waterproofing": ["cat", "waterproof", "pelapis"],
  "Pipa PVC & Fitting": ["pipa", "fitting"]
};
const sampleProducts = [
  {
    id: "semen-pcc",
    name: "Semen Merah Putih PCC 50kg",
    category: "Semen & Perekat",
    price: 58000,
    unit: "sak",
    description: "Semen serbaguna berkualitas untuk pekerjaan struktur, pasangan, dan plesteran.",
    image: "assets/semen-pcc.jpg",
    inStock: true,
    stockQty: 84,
    mockupBadgeInImage: true
  },
  {
    id: "semen-watershield",
    name: "Semen Merah Putih Watershield 50kg",
    category: "Semen & Perekat",
    price: 68000,
    unit: "sak",
    description: "Semen dengan perlindungan terhadap rembesan air untuk kebutuhan konstruksi.",
    image: "assets/semen-watershield.jpg",
    inStock: true,
    stockQty: 32,
    mockupBadgeInImage: true
  },
  {
    id: "semen-acian",
    name: "Semen Putih Acian 40kg",
    category: "Semen & Perekat",
    price: 89000,
    unit: "sak",
    description: "Semen putih untuk pekerjaan acian halus dan hasil akhir dinding yang rapi.",
    image: "assets/semen-acian.jpg",
    inStock: false,
    stockQty: 0,
    mockupBadgeInImage: true
  },
  {
    id: "bata-ringan-elephant",
    name: "Bata Ringan Elephant 10cm",
    category: "Bata & Hebel",
    price: 720000,
    unit: "m³",
    description: "Bata ringan presisi yang membantu mempercepat pekerjaan pasangan dinding.",
    image: "assets/bata-ringan-elephant.jpg",
    inStock: true,
    stockQty: 18,
    mockupBadgeInImage: true
  },
  {
    id: "besi-beton-polos",
    name: "Besi Beton Polos 8mm SNI",
    category: "Besi & Kawat",
    price: 52000,
    unit: "batang",
    description: "Besi beton untuk kebutuhan konstruksi, tersedia dalam panjang standar.",
    image: "assets/besi-beton-polos.jpg",
    inStock: true,
    stockQty: 120,
    mockupBadgeInImage: true
  },
  {
    id: "pipa-pvc-wavin",
    name: "Pipa PVC Wavin AW 3/4 inci",
    category: "Pipa PVC & Fitting",
    price: 38000,
    unit: "batang",
    description: "Pipa PVC untuk instalasi air bersih, kuat dan praktis dipasang.",
    image: "assets/pipa-pvc-wavin.jpg",
    inStock: true,
    stockQty: 57,
    mockupBadgeInImage: true
  }
];
let products = API_ENABLED ? [] : [...sampleProducts];
let activeCategory = "all";
let activeProduct = null;
let loading = API_ENABLED;
let loadFailed = false;
let apiTotal = API_ENABLED ? 0 : 48;
let apiCategoryCounts = null;
let searchTimeout = 0;
let requestNumber = 0;
let toastTimeout = 0;
const CART_STORAGE_KEY = "cipta-jaya-cart";

function loadSavedCart() {
  try {
    const saved = localStorage.getItem(CART_STORAGE_KEY);
    if (saved === null) return new Map();
    const entries = JSON.parse(saved);
    if (!Array.isArray(entries)) throw new Error("Format keranjang tersimpan bukan daftar produk.");
    const validEntries = entries.filter(entry =>
      entry?.product?.id != null
      && Number.isFinite(Number(entry.product.price))
      && Number.isInteger(Number(entry.quantity))
      && Number(entry.quantity) > 0
    );
    if (validEntries.length !== entries.length) throw new Error("Keranjang tersimpan memuat produk atau jumlah yang tidak valid.");
    return new Map(validEntries.map(entry => [String(entry.product.id), {
      product: entry.product,
      quantity: Number(entry.quantity)
    }]));
  } catch (error) {
    console.error("Keranjang tersimpan tidak dapat dibaca:", error);
    return new Map();
  }
}

const cart = loadSavedCart();
const money = new Intl.NumberFormat("id-ID");
const productGrid = document.querySelector("#productGrid");
const searchInputs = [
  document.querySelector("#desktopSearch"),
  document.querySelector("#mobileSearch"),
  document.querySelector("#catalogSearch")
];
const detailDialog = document.querySelector("#detailDialog");
const cartDialog = document.querySelector("#cartDialog");

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function productImage(value) {
  if (!value) return "";
  const imagePath = String(value).trim();
  const isRelative = !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(imagePath);
  try {
    const url = new URL(imagePath, window.location.href);
    if (url.protocol === "file:" && isRelative) return url.href;
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function cartImage(value) {
  const imagePath = String(value || "").trim();
  const image = productImage(imagePath);
  if (!image) return "";
  const isRelative = !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(imagePath);
  return new URL(image).protocol === "file:" && isRelative
    ? `../halaman.2/${imagePath}`
    : image;
}

function formatPrice(value) {
  return `Rp ${money.format(Number(value) || 0)}`;
}

function productIsAvailable(product) {
  return product.inStock === true;
}

function categoryMatches(product, category) {
  if (category === "all") return true;
  const productCategory = String(product.category || "").toLocaleLowerCase("id");
  if (productCategory === category.toLocaleLowerCase("id")) return true;
  return (categoryAliases[category] || []).some(alias => productCategory.includes(alias));
}

function currentQuery() {
  return searchInputs.map(input => input.value.trim().toLocaleLowerCase("id")).find(Boolean) || "";
}

function visibleProducts() {
  const query = currentQuery();
  const status = document.querySelector("#statusFilter").value;
  const readyOnly = document.querySelector("#readyOnly").checked;
  const list = products.filter(product => {
    const searchable = `${product.name || ""} ${product.category || ""} ${product.sku || ""} ${product.description || ""}`.toLocaleLowerCase("id");
    const matchesStatus = readyOnly || status === "ready"
      ? productIsAvailable(product)
      : status === "out" ? !productIsAvailable(product) : true;
    return categoryMatches(product, activeCategory)
      && matchesStatus
      && (!query || searchable.includes(query));
  });
  const sort = document.querySelector("#sortSelect").value;
  if (sort === "price-asc") list.sort((a, b) => Number(a.price) - Number(b.price));
  if (sort === "price-desc") list.sort((a, b) => Number(b.price) - Number(a.price));
  if (sort === "name") list.sort((a, b) => String(a.name).localeCompare(String(b.name), "id"));
  return list;
}

function updateCategoryTabs() {
  const buttons = [...document.querySelectorAll(".category-tab")];
  for (const button of buttons) {
    const key = button.dataset.category || "all";
    const count = key === "all"
      ? apiTotal
      : apiCategoryCounts && Number.isFinite(Number(apiCategoryCounts[key]))
        ? Number(apiCategoryCounts[key])
        : Number(button.dataset.defaultCount || 0);
    const countNode = button.querySelector("[data-category-count]");
    if (countNode) countNode.textContent = `(${count})`;
    button.classList.toggle("active", key === activeCategory);
    button.setAttribute("aria-pressed", String(key === activeCategory));
  }
  document.querySelector("#skuCount").textContent = String(apiTotal);
}

function renderProducts() {
  const list = visibleProducts();
  const loadingState = document.querySelector("#loadingState");
  const emptyState = document.querySelector("#emptyState");
  const errorState = document.querySelector("#errorState");
  loadingState.hidden = !loading;
  emptyState.hidden = loading || loadFailed || list.length > 0;
  errorState.hidden = !loadFailed;
  productGrid.hidden = loading || loadFailed;

  const categoryLabel = categoryDefinitions.find(item => item.key === activeCategory)?.label || "Semua Kategori";
  document.querySelector("#resultSummary").textContent = `${categoryLabel} • Ditemukan ${list.length} produk`;
  updateCategoryTabs();
  productGrid.innerHTML = list.map(product => {
    const image = productImage(product.image);
    const title = escapeHtml(product.name || "Produk Cipta Jaya");
    const id = escapeHtml(product.id);
    const available = productIsAvailable(product);
    const mockupImage = product.mockupBadgeInImage === true;
    const badge = mockupImage ? "" : `<span class="photo-stock${available ? "" : " is-out"}">${available ? "Ready di Gudang" : "Stok Habis"}</span>${product.tag ? `<span class="photo-tag">${escapeHtml(product.tag)}</span>` : ""}`;
    return `<article class="product-card">
      <div class="product-photo">
        ${image ? `<img src="${escapeHtml(image)}" alt="${title}" loading="lazy">` : `<span class="product-image-placeholder" role="img" aria-label="Foto belum tersedia">▧</span>`}
        ${badge}
        <button class="photo-view-button${mockupImage ? " preview-photo" : ""}" type="button" data-action="detail" data-id="${id}" aria-label="Lihat detail ${title}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.7"></circle></svg>
        </button>
      </div>
      <div class="product-info">
        <div class="product-meta"><span class="product-category">${escapeHtml(product.category || "Bahan Bangunan")}</span><span class="stock-note${available ? "" : " is-out"}">${available ? "● Ready di Gudang" : "● Sedang Restok"}</span></div>
        <h3 class="product-title">${title}</h3>
        <p class="product-description">${escapeHtml(product.description || "Material bangunan berkualitas untuk kebutuhan proyek Anda.")}</p>
        <p class="product-price">${formatPrice(product.price)} <small>/ ${escapeHtml(product.unit || "pcs")}</small></p>
        <div class="product-actions">
          <button class="product-action" type="button" data-action="detail" data-id="${id}">Lihat Detail</button>
          <button class="product-action add-to-cart" type="button" data-action="add" data-id="${id}"${available ? "" : " disabled"} aria-label="Tambah ${title} ke keranjang">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L21 8H6"></path><circle cx="10" cy="20" r="1"></circle><circle cx="18" cy="20" r="1"></circle></svg>
            ${available ? "+ Keranjang" : "Stok Habis"}
          </button>
        </div>
      </div>
    </article>`;
  }).join("");
}

function cartProducts() {
  return [...cart.values()];
}

function cartCount() {
  return cartProducts().reduce((total, item) => total + item.quantity, 0);
}

function cartTotal() {
  return cartProducts().reduce((total, item) => total + Number(item.product.price || 0) * item.quantity, 0);
}

function renderCart() {
  const items = cartProducts();
  const count = cartCount();
  const total = formatPrice(cartTotal());
  document.querySelector("#headerCartCount").textContent = count;
  document.querySelector("#headerCartTotal").textContent = total;
  document.querySelector("#openCart").setAttribute("aria-label", `Buka keranjang, ${count} barang`);
  document.querySelector("#floatingCount").textContent = count;
  document.querySelector("#floatingItems").textContent = `${count} Barang`;
  document.querySelector("#floatingTotal").textContent = total;
  document.querySelector("#dialogCartTotal").textContent = total;
  document.querySelector("#cartEmpty").hidden = items.length > 0;
  document.querySelector("#cartItems").innerHTML = items.map(({product, quantity}) => {
    const image = productImage(product.image);
    const title = escapeHtml(product.name || "Produk Cipta Jaya");
    const id = escapeHtml(product.id);
    const atLimit = Number.isFinite(product.stockQty) && quantity >= product.stockQty;
    return `<article class="cart-item">
      ${image ? `<img src="${escapeHtml(image)}" alt="">` : `<span class="product-image-placeholder" aria-hidden="true">▧</span>`}
      <div><b>${title}</b><small>${formatPrice(product.price)} / ${escapeHtml(product.unit || "pcs")}</small></div>
      <div class="cart-item-quantity">
        <button class="quantity-button" type="button" data-action="decrease" data-id="${id}" aria-label="Kurangi ${title}">−</button>
        <span>${quantity}</span>
        <button class="quantity-button" type="button" data-action="increase" data-id="${id}" aria-label="Tambah ${title}"${atLimit ? " disabled" : ""}>+</button>
      </div>
    </article>`;
  }).join("");
  const checkout = document.querySelector("#checkoutWhatsapp");
  checkout.setAttribute("aria-disabled", String(items.length === 0));
}

function persistCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartProducts().map(({product, quantity}) => ({
      product: {...product, image: cartImage(product.image)},
      quantity
    }))));
  } catch (error) {
    console.error("Keranjang tidak dapat disimpan:", error);
    showToast("Perubahan keranjang tidak dapat disimpan di browser ini.");
  }
}

function showToast(message) {
  const node = document.querySelector("#toast");
  node.textContent = message;
  node.classList.add("show");
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => node.classList.remove("show"), 2600);
}

function addToCart(product) {
  if (!productIsAvailable(product)) {
    showToast("Produk sedang tidak tersedia.");
    return;
  }
  const id = String(product.id);
  const current = cart.get(id);
  if (Number.isFinite(product.stockQty) && current && current.quantity >= product.stockQty) {
    showToast("Jumlah pesanan sudah mencapai stok yang tersedia.");
    return;
  }
  cart.set(id, {product, quantity: (current?.quantity || 0) + 1});
  persistCart();
  renderCart();
  showToast(`${product.name} ditambahkan ke keranjang.`);
}

function openProductDetails(product) {
  activeProduct = product;
  const image = productImage(product.image);
  const detailImage = document.querySelector("#detailImage");
  detailImage.hidden = !image;
  if (image) detailImage.src = image;
  detailImage.alt = product.name || "";
  document.querySelector("#detailCategory").textContent = product.category || "Bahan Bangunan";
  document.querySelector("#detailTitle").textContent = product.name || "Produk Cipta Jaya";
  document.querySelector("#detailDescription").textContent = product.description || "Material bangunan berkualitas untuk kebutuhan proyek Anda.";
  const stockNode = document.querySelector("#detailStock");
  stockNode.textContent = productIsAvailable(product)
    ? `Tersedia${Number.isFinite(product.stockQty) ? ` • ${product.stockQty} ${product.unit || "unit"}` : " di gudang"}`
    : "Stok habis • Sedang menunggu ketersediaan kembali";
  stockNode.classList.toggle("is-out", !productIsAvailable(product));
  document.querySelector("#detailPrice").textContent = `${formatPrice(product.price)} / ${product.unit || "pcs"}`;
  const addButton = document.querySelector("#detailAdd");
  addButton.disabled = !productIsAvailable(product);
  addButton.textContent = productIsAvailable(product) ? "＋ Tambah ke Keranjang" : "Stok Habis";
  detailDialog.showModal();
}

function setCategory(category) {
  activeCategory = categoryDefinitions.some(item => item.key === category) ? category : "all";
  loadProducts();
}

function normalizeProduct(product) {
  if (!product || product.id == null || !product.name) {
    throw new Error("Respons API memuat produk tanpa id atau nama.");
  }
  const quantityValue = product.stockQty ?? product.stock;
  const stockQty = quantityValue == null || quantityValue === "" ? null : Number(quantityValue);
  const status = String(product.stockStatus || product.status || "").toLowerCase();
  const price = Number(product.price);
  const knownAvailableStatus = ["ready", "available", "in_stock", "in-stock"].includes(status);
  const knownUnavailableStatus = ["out", "out_of_stock", "out-of-stock", "sold_out", "sold-out"].includes(status);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`Harga produk ${product.id} tidak valid.`);
  }
  if (typeof product.inStock !== "boolean" && !Number.isFinite(stockQty)
    && !knownAvailableStatus && !knownUnavailableStatus) {
    throw new Error(`Status stok produk ${product.id} tidak tersedia.`);
  }
  const inStock = typeof product.inStock === "boolean"
    ? product.inStock
    : Number.isFinite(stockQty)
      ? stockQty > 0
      : knownAvailableStatus;
  return {
    ...product,
    id: String(product.id),
    name: String(product.name),
    category: String(product.category || product.categoryName || "Bahan Bangunan"),
    price,
    unit: String(product.unit || "pcs"),
    image: String(product.image || ""),
    description: String(product.description || ""),
    inStock,
    stockQty: Number.isFinite(stockQty) && stockQty >= 0 ? stockQty : null,
    mockupBadgeInImage: false
  };
}

function updateLastUpdated(value) {
  if (typeof value !== "string" || !value.trim()) return;
  const node = document.querySelector("#lastUpdated");
  if (!node) return;
  const date = new Date(value);
  const output = Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta"
    }).format(date);
  node.textContent = output;
}

async function loadProducts() {
  if (!API_ENABLED) {
    loading = false;
    loadFailed = false;
    renderProducts();
    return;
  }
  const currentRequest = ++requestNumber;
  loading = true;
  loadFailed = false;
  renderProducts();
  const statusValue = document.querySelector("#readyOnly").checked
    ? "ready"
    : document.querySelector("#statusFilter").value;
  const params = new URLSearchParams({
    search: currentQuery(),
    category: activeCategory === "all" ? "" : activeCategory,
    status: statusValue,
    sort: document.querySelector("#sortSelect").value
  });
  try {
    const response = await fetch(`${PRODUCT_ENDPOINT}?${params}`, {credentials: "same-origin"});
    if (!response.ok) throw new Error(`API ${response.status}`);
    const payload = response.status === 204 ? [] : await response.json();
    const result = Array.isArray(payload) ? payload : payload.data || payload.items;
    if (!Array.isArray(result)) throw new Error("Respons API tidak berisi daftar produk.");
    const normalized = result.map(normalizeProduct);
    if (currentRequest !== requestNumber) return;
    products = normalized;
    const total = Array.isArray(payload) ? normalized.length : Number(payload.totalPublished ?? payload.total);
    apiTotal = Number.isFinite(total) && total >= 0 ? total : normalized.length;
    apiCategoryCounts = Array.isArray(payload) ? null : payload.categoryCounts || null;
    updateLastUpdated(Array.isArray(payload) ? "" : payload.lastUpdated);
    loadFailed = false;
  } catch (error) {
    if (currentRequest !== requestNumber) return;
    products = [];
    apiTotal = 0;
    loadFailed = true;
    console.error("Gagal memuat katalog publik:", error);
    showToast("Katalog gagal dimuat dari server. Periksa koneksi, lalu coba lagi.");
  }
  loading = false;
  renderProducts();
  renderCart();
}

productGrid.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const product = products.find(item => String(item.id) === button.dataset.id);
  if (!product) return;
  if (button.dataset.action === "detail") openProductDetails(product);
  if (button.dataset.action === "add") addToCart(product);
});

document.querySelector("#categoryTabs").addEventListener("click", event => {
  const button = event.target.closest("button[data-category]");
  if (button) setCategory(button.dataset.category);
});

for (const button of document.querySelectorAll(".category-tab")) {
  const key = button.dataset.category;
  const count = key === "all" ? (API_ENABLED ? 0 : 48) : API_ENABLED ? 0 : ({
    "Semen & Perekat": 12,
    "Besi & Kawat": 14,
    "Bata & Hebel": 8,
    "Cat & Waterproofing": 9,
    "Pipa PVC & Fitting": 5
  })[key] || 0;
  button.dataset.defaultCount = String(count);
  const countNode = button.querySelector("span:last-child");
  if (countNode) countNode.dataset.categoryCount = "";
}

for (const input of searchInputs) {
  input.addEventListener("input", () => {
    for (const otherInput of searchInputs) {
      if (otherInput !== input) otherInput.value = input.value;
    }
    if (!API_ENABLED) {
      const initialParams = new URLSearchParams(window.location.search);
      const initialSearch = initialParams.get("search") || "";
      const initialCategory = initialParams.get("category") || "all";
      if (categoryDefinitions.some(item => item.key === initialCategory)) activeCategory = initialCategory;
      for (const input of searchInputs) input.value = initialSearch;
      renderProducts();
      return;
    }
    requestNumber++;
    window.clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(loadProducts, 250);
  });
}

document.querySelector("#sortSelect").addEventListener("change", loadProducts);
document.querySelector("#statusFilter").addEventListener("change", () => {
  if (document.querySelector("#statusFilter").value === "out") {
    document.querySelector("#readyOnly").checked = false;
  }
  loadProducts();
});
document.querySelector("#readyOnly").addEventListener("change", loadProducts);

const menuButton = document.querySelector("#menuButton");
const primaryNav = document.querySelector("#primaryNav");
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  primaryNav.classList.toggle("open", open);
});
primaryNav.addEventListener("click", event => {
  if (!event.target.closest("a")) return;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Buka menu");
  primaryNav.classList.remove("open");
});

function openCart() {
  renderCart();
  cartDialog.showModal();
}

document.querySelector("#openCart").addEventListener("click", openCart);
document.querySelector("#openCartBottom").addEventListener("click", openCart);
document.querySelector("#closeCart").addEventListener("click", () => cartDialog.close());
document.querySelector(".cart-page-link").addEventListener("click", persistCart);
document.querySelector("#closeDetail").addEventListener("click", () => detailDialog.close());
document.querySelector("#detailAdd").addEventListener("click", () => {
  if (activeProduct) addToCart(activeProduct);
  detailDialog.close();
});

document.querySelector("#cartItems").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const item = cart.get(button.dataset.id);
  if (!item) return;
  if (button.dataset.action === "increase") {
    if (Number.isFinite(item.product.stockQty) && item.quantity >= item.product.stockQty) return;
    cart.set(button.dataset.id, {...item, quantity: item.quantity + 1});
  }
  if (button.dataset.action === "decrease") {
    if (item.quantity <= 1) cart.delete(button.dataset.id);
    else cart.set(button.dataset.id, {...item, quantity: item.quantity - 1});
  }
  persistCart();
  renderCart();
});

function whatsappUrl(message) {
  const number = String(window.CIPTA_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";
}

const inquiryUrl = whatsappUrl("Halo Cipta Jaya, saya ingin bertanya mengenai produk bahan bangunan.");
for (const link of [document.querySelector("#headerWhatsapp"), document.querySelector("#footerWhatsapp")]) {
  if (inquiryUrl) {
    link.href = inquiryUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
}

document.querySelector("#checkoutWhatsapp").addEventListener("click", event => {
  const items = cartProducts();
  if (!items.length) {
    event.preventDefault();
    return;
  }
  const message = [
    "Halo Cipta Jaya, saya ingin memesan:",
    ...items.map(({product, quantity}) => `- ${product.name} (${quantity} ${product.unit || "pcs"}) — ${formatPrice(Number(product.price) * quantity)}`),
    `Total: ${formatPrice(cartTotal())}`
  ].join("\n");
  const url = whatsappUrl(message);
  if (!url) {
    event.preventDefault();
    showToast("Toko belum mengatur nomor WhatsApp untuk pemesanan online.");
    return;
  }
  event.currentTarget.href = url;
  event.currentTarget.target = "_blank";
  event.currentTarget.rel = "noopener noreferrer";
});

renderProducts();
renderCart();
loadProducts();
