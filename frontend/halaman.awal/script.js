/*
 * Set window.CIPTA_API_BASE before this file to connect the public catalog API.
 * The API must return published products; admin authorization belongs on the server.
 */
const API_BASE = (window.CIPTA_API_BASE || "").replace(/\/$/, "");
const API_ENABLED = window.CIPTA_API_ENABLED ?? (window.location.protocol !== "file:" || Boolean(API_BASE));
const PRODUCT_ENDPOINT = `${API_BASE}/api/products`;
const CART_STORAGE_KEY = "cipta-jaya-cart";
const categoryAliases = {
  "Semen & Pasir": ["semen", "mortar", "pasir"],
  "Besi & Baja": ["besi", "baja", "tulangan"],
  "Bata & Mortar": ["bata", "dinding"],
  "Cat Tembok": ["cat", "pelapis", "waterproof"],
  "Pipa & Sanitari": ["pipa", "sanitari"],
  "Atap & Seng": ["atap", "seng", "spandek"]
};
const sampleProducts = [
  {
    id: "p-watershield",
    name: "Semen Merah Putih Watershield 50kg",
    category: "Semen & Mortar",
    categoryKey: "Semen & Pasir",
    price: 58000,
    unit: "sak",
    description: "Formula tahan air dengan daya rekat kuat, cocok untuk pondasi dan dinding basement.",
    image: "assets/semen-watershield.jpg"
  },
  {
    id: "p-besi-ulir",
    name: "Besi Beton Ulir D10 SNI (12m)",
    category: "Besi & Baja Tulangan",
    categoryKey: "Besi & Baja",
    price: 76500,
    unit: "btg",
    description: "Standar Nasional Indonesia dengan sertifikasi untuk kekuatan konstruksi.",
    image: "assets/besi-beton.jpg"
  },
  {
    id: "p-bata-ringan",
    name: "Bata Ringan AAC 10cm Prima",
    category: "Bata & Dinding",
    categoryKey: "Bata & Mortar",
    price: 580000,
    unit: "m³",
    description: "Presisi tinggi, kedap suara, dan mempercepat proses pengerjaan dinding.",
    image: "assets/bata-ringan.jpg"
  },
  {
    id: "p-waterproofing",
    name: "Cat Pelapis Waterproofing 4kg Grey",
    category: "Cat & Pelapis",
    categoryKey: "Cat Tembok",
    price: 165000,
    unit: "galon",
    description: "Pelindung elastis anti-bocor untuk dak beton, talang, dan dinding luar.",
    image: "assets/cat-waterproofing.jpg"
  }
];
let products = API_ENABLED ? [] : [...sampleProducts];
let activeCategory = "";
let activeProduct = null;
let loadFailed = false;
let loading = API_ENABLED;
let catalogMode = false;
let searchTimeout;
let requestNumber = 0;
const cart = new Map();
const money = new Intl.NumberFormat("id-ID");
const productGrid = document.querySelector("#productGrid");
const searchInputs = [document.querySelector("#catalogSearch"), document.querySelector("#mobileSearch")];
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

function formatPrice(value) {
  return `Rp ${money.format(Number(value) || 0)}`;
}

function productMatchesCategory(product, category) {
  if (!category) return true;
  const key = String(product.categoryKey || "");
  if (key) return key === category;
  const name = String(product.category || "").toLocaleLowerCase("id");
  return (categoryAliases[category] || []).some(alias => name.includes(alias));
}

function visibleProducts() {
  const query = searchInputs.map(input => input.value.trim().toLocaleLowerCase("id")).find(Boolean) || "";
  return products.filter(product => {
    const searchable = `${product.name || ""} ${product.category || ""} ${product.sku || ""}`.toLocaleLowerCase("id");
    return productMatchesCategory(product, activeCategory) && (!query || searchable.includes(query));
  });
}

function renderProducts() {
  const list = visibleProducts();
  document.querySelector("#loadingProducts").hidden = !loading;
  document.querySelector("#loadError").hidden = !loadFailed;
  document.querySelector("#loadError").textContent = loadFailed
    ? "Katalog belum dapat dimuat. Periksa koneksi Anda dan coba lagi."
    : "";
  document.querySelector("#noResults").hidden = loadFailed || loading || list.length > 0;
  productGrid.hidden = loadFailed;
  productGrid.innerHTML = list.map(product => {
    const image = productImage(product.image);
    const title = escapeHtml(product.name || "Produk Cipta Jaya");
    const id = escapeHtml(product.id);
    return `<article class="product-card">
      <div class="product-image-wrap">${image ? `<img src="${escapeHtml(image)}" alt="${title}" loading="lazy">` : `<span class="product-image-placeholder" role="img" aria-label="Foto belum tersedia">▧</span>`}</div>
      <div class="product-info">
        <p class="product-category">${escapeHtml(product.category || "Bahan Bangunan")}</p>
        <h3 class="product-title">${title}</h3>
        <p class="product-description">${escapeHtml(product.description || "Material bangunan berkualitas untuk kebutuhan proyek Anda.")}</p>
        <p class="product-price">${formatPrice(product.price)} <small>/ ${escapeHtml(product.unit || "pcs")}</small></p>
        <div class="product-actions">
          <button class="product-action" type="button" data-action="detail" data-id="${id}">Lihat Detail</button>
          <button class="product-action add-to-cart" type="button" data-action="add" data-id="${id}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.5a2 2 0 0 0 2-1.6L21 8H6"></path><circle cx="10" cy="20" r="1"></circle><circle cx="18" cy="20" r="1"></circle></svg>
            + Keranjang
          </button>
        </div>
      </div>
    </article>`;
  }).join("");
}

function updateCategoryCounts(counts = {}) {
  const cards = [...document.querySelectorAll(".category-card[data-category]")];
  for (const card of cards) {
    const category = card.dataset.category;
    const aliases = categoryAliases[category] || [];
    const total = Object.entries(counts).reduce((sum, [name, count]) => {
      const normalized = name.toLocaleLowerCase("id");
      return sum + (category === "all" || aliases.some(alias => normalized.includes(alias)) ? Number(count) || 0 : 0);
    }, 0);
    const label = card.querySelector("small");
    if (label) label.textContent = `${total} Produk`;
  }
}

function cartProducts() {
  return [...cart.values()];
}

function loadCart() {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored === null) return;
    const entries = JSON.parse(stored);
    if (!Array.isArray(entries)) throw new Error("Format keranjang tidak valid.");
    for (const entry of entries) {
      const product = entry?.product;
      const quantity = Number(entry?.quantity);
      if (product?.id == null || !product.name || !Number.isFinite(Number(product.price))
          || !Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Isi keranjang tidak valid.");
      }
      cart.set(String(product.id), {product, quantity});
    }
  } catch (error) {
    console.error("Keranjang tersimpan tidak dapat dibaca:", error);
    toast("Keranjang tersimpan tidak dapat dibaca. Silakan susun ulang keranjang.");
    cart.clear();
  }
}

function persistCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartProducts()));
  } catch (error) {
    console.error("Keranjang tidak dapat disimpan:", error);
    toast("Perubahan keranjang tidak dapat disimpan di browser ini.");
  }
}

function cartTotal() {
  return cartProducts().reduce((total, item) => total + (Number(item.product.price) || 0) * item.quantity, 0);
}

function renderCart() {
  const items = cartProducts();
  const count = items.reduce((total, item) => total + item.quantity, 0);
  const total = formatPrice(cartTotal());
  document.querySelector("#cartCount").textContent = count;
  document.querySelector("#cartTotal").textContent = total;
  document.querySelector("#openCart").setAttribute("aria-label", `Buka keranjang, ${count} produk`);
  document.querySelector("#dialogCartTotal").textContent = total;
  document.querySelector("#cartEmpty").hidden = items.length > 0;
  document.querySelector("#cartItems").innerHTML = items.map(({product, quantity}) => {
    const image = productImage(product.image);
    const title = escapeHtml(product.name || "Produk Cipta Jaya");
    const id = escapeHtml(product.id);
    return `<article class="cart-item">
      ${image ? `<img src="${escapeHtml(image)}" alt="">` : `<span class="product-image-placeholder" aria-hidden="true">▧</span>`}
      <div><b>${title}</b><small>${formatPrice(product.price)} / ${escapeHtml(product.unit || "pcs")}</small></div>
      <div class="cart-item-quantity">
        <button class="quantity-button" type="button" data-action="decrease" data-id="${id}" aria-label="Kurangi ${title}">−</button>
        <span>${quantity}</span>
        <button class="quantity-button" type="button" data-action="increase" data-id="${id}" aria-label="Tambah ${title}">+</button>
      </div>
    </article>`;
  }).join("");
  const checkout = document.querySelector("#checkoutWhatsapp");
  checkout.setAttribute("aria-disabled", String(items.length === 0));
}

function toast(message) {
  const node = document.querySelector("#toast");
  node.textContent = message;
  node.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => node.classList.remove("show"), 2600);
}

function addToCart(product) {
  const id = String(product.id);
  const current = cart.get(id);
  cart.set(id, {product, quantity: (current?.quantity || 0) + 1});
  persistCart();
  renderCart();
  toast(`${product.name} ditambahkan ke keranjang.`);
}

function openProductDetails(product) {
  activeProduct = product;
  const image = productImage(product.image);
  const detailImage = document.querySelector("#detailImage");
  detailImage.hidden = !image;
  detailImage.src = image;
  detailImage.alt = product.name || "";
  document.querySelector("#detailCategory").textContent = product.category || "Bahan Bangunan";
  document.querySelector("#detailTitle").textContent = product.name || "Produk Cipta Jaya";
  document.querySelector("#detailDescription").textContent = product.description || "Material bangunan berkualitas untuk kebutuhan proyek Anda.";
  document.querySelector("#detailPrice").textContent = `${formatPrice(product.price)} / ${product.unit || "pcs"}`;
  detailDialog.showModal();
}

function setCategory(category) {
  activeCategory = category === "all" ? "" : category;
  document.querySelectorAll(".category-card").forEach(button => {
    button.classList.toggle("selected", button.dataset.category === activeCategory);
  });
  renderProducts();
  if (API_ENABLED) loadProducts();
}

async function loadProducts() {
  if (!API_ENABLED) {
    renderProducts();
    return;
  }
  const currentRequest = ++requestNumber;
  loading = true;
  loadFailed = false;
  renderProducts();
  const query = searchInputs.map(input => input.value.trim()).find(Boolean) || "";
  const params = new URLSearchParams({
    featured: String(!catalogMode),
    published: "true",
    search: query,
    category: activeCategory
  });
  try {
    const response = await fetch(`${PRODUCT_ENDPOINT}?${params}`, {credentials: "same-origin"});
    if (!response.ok) throw new Error(`API ${response.status}`);
    const payload = response.status === 204 ? [] : await response.json();
    const result = Array.isArray(payload) ? payload : payload.data || payload.items;
    if (!Array.isArray(result)) throw new Error("Respons API tidak berisi daftar produk.");
    if (currentRequest !== requestNumber) return;
    products = result;
    if (!Array.isArray(payload)) updateCategoryCounts(payload.categoryCounts || {});
    loadFailed = false;
  } catch {
    if (currentRequest !== requestNumber) return;
    products = [];
    loadFailed = true;
    toast("Katalog gagal dimuat dari server.");
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

document.querySelector("#categoryGrid").addEventListener("click", event => {
  const button = event.target.closest("button[data-category]");
  if (button) setCategory(button.dataset.category);
});

document.querySelector(".text-link[data-category]").addEventListener("click", () => {
  setCategory("all");
  document.querySelector("#katalog").scrollIntoView({behavior: "smooth"});
});

document.querySelector("#allCatalogButton").addEventListener("click", event => {
  catalogMode = !catalogMode;
  document.querySelector("#productsTitle").textContent = catalogMode
    ? "Katalog Lengkap Bahan Bangunan"
    : "Produk Unggulan Pilihan (Best Seller)";
  document.querySelector(".product-heading .section-description").textContent = catalogMode
    ? "Temukan material konstruksi berkualitas untuk kebutuhan rumah dan proyek Anda."
    : "Material konstruksi utama berstatus \"Dipublikasikan\" yang paling sering dipesan proyek.";
  event.currentTarget.firstChild.textContent = catalogMode
    ? "Kembali ke Produk Unggulan "
    : "Buka Katalog Lengkap (140+ Produk) ";
  loadProducts();
  document.querySelector("#katalog").scrollIntoView({behavior: "smooth"});
});

for (const input of searchInputs) {
  input.addEventListener("input", () => {
    for (const otherInput of searchInputs) {
      if (otherInput !== input) otherInput.value = input.value;
    }
    if (!API_ENABLED) {
      renderProducts();
      return;
    }
    requestNumber++;
    window.clearTimeout(searchTimeout);
    searchTimeout = window.setTimeout(loadProducts, 250);
  });
}

const menuButton = document.querySelector("#menuButton");
const primaryNav = document.querySelector("#primaryNav");
menuButton.addEventListener("click", () => {
  const open = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Tutup menu" : "Buka menu");
  primaryNav.classList.toggle("open", open);
});
primaryNav.addEventListener("click", event => {
  if (event.target.closest("a")) {
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Buka menu");
    primaryNav.classList.remove("open");
  }
});

document.querySelector("#openCart").addEventListener("click", () => {
  renderCart();
  cartDialog.showModal();
});
document.querySelector("#closeCart").addEventListener("click", () => cartDialog.close());
document.querySelector("#closeDetail").addEventListener("click", () => detailDialog.close());
document.querySelector("#detailAdd").addEventListener("click", () => {
  if (activeProduct) addToCart(activeProduct);
  detailDialog.close();
});

document.querySelector("#cartItems").addEventListener("click", event => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  const item = cart.get(id);
  if (!item) return;
  if (button.dataset.action === "increase") cart.set(id, {...item, quantity: item.quantity + 1});
  if (button.dataset.action === "decrease") {
    if (item.quantity <= 1) cart.delete(id);
    else cart.set(id, {...item, quantity: item.quantity - 1});
  }
  persistCart();
  renderCart();
});

function whatsappUrl(message) {
  const number = String(window.CIPTA_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";
}

for (const link of [document.querySelector("#headerWhatsapp"), document.querySelector("#footerWhatsapp")]) {
  const url = whatsappUrl("Halo Cipta Jaya, saya ingin bertanya mengenai produk bahan bangunan.");
  if (url) link.href = url;
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
    toast("Toko belum mengatur nomor WhatsApp untuk pemesanan online.");
    return;
  }
  event.currentTarget.href = url;
  event.currentTarget.target = "_blank";
  event.currentTarget.rel = "noopener noreferrer";
});

loadCart();
renderProducts();
renderCart();
loadProducts();
