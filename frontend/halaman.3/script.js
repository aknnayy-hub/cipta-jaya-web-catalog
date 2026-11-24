/*
 * Set window.CIPTA_API_BASE before loading this file to connect the product detail API.
 * The public endpoints must only expose products intended for customer view.
 */
const API_BASE = String(window.CIPTA_API_BASE || "").replace(/\/+$/, "");
const API_ENABLED = window.CIPTA_API_ENABLED ?? (window.location.protocol !== "file:" || Boolean(API_BASE));
const DEFAULT_PRODUCT_ID = "semen-merah-putih-watershield-50kg";
const productId = String(
  window.CIPTA_PRODUCT_ID
  || new URLSearchParams(window.location.search).get("id")
  || DEFAULT_PRODUCT_ID
);
const sampleProduct = {
  id: DEFAULT_PRODUCT_ID,
  name: "Semen Merah Putih Watershield 50kg (Anti Lembap & Anti Rembes)",
  category: "Semen & Perekat",
  price: 58500,
  unit: "sak (50 kg)",
  stockQty: 480,
  inStock: true,
  rating: 4.9,
  reviewCount: 128,
  soldCount: 3200,
  sku: "SMP-WTR-50K",
  wholesalePrice: 57000,
  wholesaleMin: 50,
  image: "assets/watershield-main.png",
  description: "Semen inovatif berteknologi water repellent yang memberi perlindungan ekstra terhadap penyerapan air, mencegah rembes, bercak lembap, dan lumut pada dinding, dak beton, dan pondasi. Cocok untuk struktur basah, kamar mandi, basement, serta plesteran exterior tahan cuaca ekstrem.",
  benefits: ["Anti Rembes", "Mutu Terjamin", "Tahan Cuaca"],
  specifications: [
    {label: "Rekomendasi Kegunaan", value: "Plesteran, pasangan bata, dak beton, kamar mandi, basement, serta lantai"},
    {label: "Estimasi Daya Sebar", value: "± 2.5 - 3.0 m² per sak (aplikasi tebal standar 10 mm)"},
    {label: "Masa Simpan Optimal", value: "3 bulan (penyimpanan kering di atas pallet kayu)"}
  ],
  gallery: [
    {thumbnail: "assets/gallery-warehouse.png", image: "assets/watershield-main.png"},
    {thumbnail: "assets/gallery-bag.png", image: "../halaman.2/assets/semen-watershield.jpg"},
    {thumbnail: "assets/gallery-granules.png", image: "assets/gallery-granules.png"},
    {thumbnail: "assets/gallery-certificate.png", image: "assets/gallery-certificate.png"}
  ]
};
const sampleRecommendations = [
  {
    id: "pasir-bangka",
    name: "Pasir Pasang Bangka Ayak Halus (1 Kijang Pick Up) x2",
    category: "Agregat",
    price: 650000,
    unit: "pickup",
    inStock: true,
    description: "Bebas lumpur, cocok untuk pasangan plesteran tahan retak.",
    image: "assets/recommend-sand.png",
    mockupImage: true
  },
  {
    id: "bata-ringan-elephant",
    name: "Bata Ringan Hebel AAC Standar Presisi 10cm x 20cm x 60cm",
    category: "Bata Ringan",
    price: 9500,
    unit: "pcs",
    inStock: true,
    description: "Siku rapi dan presisi untuk dinding kokoh kedap suara.",
    image: "assets/recommend-blocks.png",
    mockupImage: true
  },
  {
    id: "fiber-mesh",
    name: "Fiber Mesh Kasa Penguat Plester & Acian Sudut 50m",
    category: "Aksesoris",
    price: 45000,
    unit: "roll",
    inStock: true,
    description: "Mencegah rembesan celah kusen pintu dan sudut dak beton.",
    image: "assets/recommend-mesh.png",
    mockupImage: true
  },
  {
    id: "semen-pcc",
    name: "Semen Merah Putih Serbaguna 40kg (PCC)",
    category: "Semen Standar",
    price: 46000,
    unit: "sak",
    inStock: true,
    description: "Solusi ekonomis untuk struktur umum, batako, dan pondasi.",
    image: "assets/recommend-pcc.png",
    mockupImage: true
  }
];
const money = new Intl.NumberFormat("id-ID");
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
let product = API_ENABLED
  ? null
  : productId === DEFAULT_PRODUCT_ID
    ? sampleProduct
    : sampleRecommendations.find(item => item.id === productId) || sampleProduct;
let recommendations = API_ENABLED ? [] : sampleRecommendations;
let activeImage = "";
let recommendationsFailed = false;
let requestNumber = 0;
let toastTimeout = 0;

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function formatPrice(value) {
  return `Rp ${money.format(Number(value) || 0)}`;
}

function safeImage(value) {
  if (!value) return "";
  const path = String(value).trim();
  const isRelative = !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path);
  try {
    const url = new URL(path, window.location.href);
    if (url.protocol === "file:" && isRelative) return url.href;
    return ["http:", "https:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function cartImage(value) {
  const imagePath = String(value || "").trim();
  const image = safeImage(imagePath);
  if (!image) return "";
  const isRelative = !/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(imagePath);
  return new URL(image).protocol === "file:" && isRelative
    ? `../halaman.3/${imagePath}`
    : image;
}

function normalizeProduct(value) {
  if (!value || value.id == null || !value.name) {
    throw new Error("Respons API memuat produk tanpa id atau nama.");
  }
  const price = Number(value.price);
  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`Harga produk ${value.id} tidak valid.`);
  }
  const stockValue = value.stockQty ?? value.stock;
  const stockQty = stockValue == null || stockValue === "" ? null : Number(stockValue);
  const stockStatus = String(value.stockStatus || value.status || "").toLowerCase();
  const readyStatus = ["ready", "available", "in_stock", "in-stock"].includes(stockStatus);
  const unavailableStatus = ["out", "out_of_stock", "out-of-stock", "sold_out", "sold-out"].includes(stockStatus);
  if (typeof value.inStock !== "boolean" && !Number.isFinite(stockQty) && !readyStatus && !unavailableStatus) {
    throw new Error(`Status stok produk ${value.id} tidak tersedia.`);
  }
  if (Number.isFinite(stockQty) && stockQty < 0) {
    throw new Error(`Jumlah stok produk ${value.id} tidak valid.`);
  }
  const inStock = typeof value.inStock === "boolean"
    ? value.inStock
    : Number.isFinite(stockQty)
      ? stockQty > 0
      : readyStatus;
  return {
    ...value,
    id: String(value.id),
    name: String(value.name),
    category: String(value.category || value.categoryName || "Material Bangunan"),
    price,
    unit: String(value.unit || "pcs"),
    stockQty: Number.isFinite(stockQty) ? stockQty : null,
    inStock,
    image: String(value.image || ""),
    description: String(value.description || ""),
    mockupImage: false
  };
}

function productIsAvailable(item) {
  return item?.inStock === true && !(Number.isFinite(item.stockQty) && item.stockQty <= 0);
}

function unitPrice(item, quantity) {
  const wholesalePrice = Number(item.wholesalePrice);
  const wholesaleMin = Number(item.wholesaleMin) || 50;
  return quantity >= wholesaleMin && Number.isFinite(wholesalePrice) && wholesalePrice >= 0
    ? wholesalePrice
    : Number(item.price) || 0;
}

function quantityLimit(item) {
  return Number.isFinite(item.stockQty) ? Math.max(1, item.stockQty) : 9999;
}

function updateProductImage(imageUrl, thumbnailButton) {
  if (!imageUrl) return;
  activeImage = imageUrl;
  const mainImage = document.querySelector("#mainProductImage");
  mainImage.src = imageUrl;
  mainImage.alt = product?.name || "Foto produk Cipta Jaya";
  document.querySelector("#zoomedImage").src = imageUrl;
  document.querySelector("#zoomedImage").alt = mainImage.alt;
  document.querySelectorAll(".gallery-thumb").forEach(button => {
    button.classList.toggle("selected", button === thumbnailButton);
    button.setAttribute("aria-pressed", String(button === thumbnailButton));
  });
}

function renderGallery(item) {
  const imageList = Array.isArray(item.gallery) && item.gallery.length
    ? item.gallery
    : [{image: item.image, thumbnail: item.image}];
  const mainImage = safeImage(item.image) || safeImage(imageList[0].image || imageList[0].url);
  const thumbContainer = document.querySelector("#galleryThumbnails");
  const thumbnails = imageList.slice(0, 4);
  thumbContainer.innerHTML = thumbnails.map((entry, index) => {
    const fullImage = safeImage(typeof entry === "string" ? entry : entry.image || entry.url);
    const thumbImage = safeImage(typeof entry === "string" ? entry : entry.thumbnail || entry.image || entry.url);
    return `<button class="gallery-thumb${index === 0 ? " selected" : ""}" type="button" data-image="${escapeHtml(fullImage)}" aria-label="Tampilkan foto produk ${index + 1}" aria-pressed="${index === 0}">
      <img src="${escapeHtml(thumbImage)}" alt="" loading="lazy">
    </button>`;
  }).join("");
  const firstButton = thumbContainer.querySelector(".gallery-thumb");
  updateProductImage(mainImage || safeImage("assets/watershield-main.png"), firstButton);
}

function renderSpecifications(item) {
  const specifications = Array.isArray(item.specifications) && item.specifications.length
    ? item.specifications
    : item.id === DEFAULT_PRODUCT_ID ? sampleProduct.specifications : [];
  const node = document.querySelector("#productSpecifications");
  node.hidden = specifications.length === 0;
  node.innerHTML = specifications.map(specification =>
    `<div><dt>${escapeHtml(specification.label || specification.name || "Spesifikasi")}</dt><dd>${escapeHtml(specification.value || specification.description || "Informasi belum tersedia.")}</dd></div>`
  ).join("");
}

function renderBenefits(item) {
  const benefits = Array.isArray(item.benefits)
    ? item.benefits
    : item.id === DEFAULT_PRODUCT_ID
      ? sampleProduct.benefits
      : [];
  const icons = ["◈", "✓", "⌁"];
  const benefitsNode = document.querySelector("#productBenefits");
  benefitsNode.hidden = benefits.length === 0;
  benefitsNode.innerHTML = benefits.slice(0, 3).map((benefit, index) =>
    `<div><span class="benefit-icon ${["water", "quality", "weather"][index]}" aria-hidden="true">${icons[index]}</span><b>${escapeHtml(benefit)}</b></div>`
  ).join("");
}

function renderProduct() {
  if (!product) return;
  document.title = `${product.name} | Cipta Jaya`;
  document.querySelector("#breadcrumbProduct").textContent = product.name;
  document.querySelector("#productCategory").textContent = product.category;
  document.querySelector("#productTitle").textContent = product.name;
  const hasRating = product.rating != null && Number.isFinite(Number(product.rating));
  document.querySelector("#productRating").textContent = hasRating
    ? Number(product.rating).toLocaleString("id-ID")
    : "—";
  document.querySelector("#reviewCount").textContent = Number(product.reviewCount) > 0
    ? `(${Number(product.reviewCount).toLocaleString("id-ID")} Ulasan Mandor & Kontraktor)`
    : "(Belum ada ulasan)";
  document.querySelector("#soldCount").textContent = Number(product.soldCount) > 0
    ? `Terjual ${Number(product.soldCount).toLocaleString("id-ID")} ${product.unit?.split(" ")[0] || "unit"}`
    : "Belum ada data penjualan";
  document.querySelector("#productSku").textContent = `SKU: ${product.sku || product.id}`;
  document.querySelector("#productPrice").textContent = formatPrice(product.price);
  document.querySelector("#productUnit").textContent = `/ ${product.unit}`;
  document.querySelector("#wholesaleLabel").textContent = product.wholesalePrice
    ? `Grosir Mulai ${product.wholesaleMin || 50} Sak: ${formatPrice(product.wholesalePrice)}`
    : "Hubungi toko untuk harga grosir";
  const description = escapeHtml(product.description);
  document.querySelector("#productDescription").innerHTML = product.id === DEFAULT_PRODUCT_ID
    ? description.replace(/water repellent/i, "<b>water repellent</b>")
    : description;
  document.querySelector("#availabilityLabel").innerHTML = productIsAvailable(product)
    ? `<i></i> ✓ Ready di Toko Cipta Jaya (Stok: ${Number.isFinite(product.stockQty) ? `${money.format(product.stockQty)} ${escapeHtml(product.unit.split(" ")[0])}` : "Tersedia"})`
    : `<i></i> Stok sedang habis`;
  document.querySelector("#availabilityLabel").classList.toggle("is-out", !productIsAvailable(product));
  const quantityInput = document.querySelector("#quantityInput");
  const quantityUnit = product.unit.split(" ")[0];
  document.querySelector("#quantityLabel").textContent = `Jumlah Pesanan (${quantityUnit}):`;
  document.querySelector(".quantity-presets").hidden = product.id !== DEFAULT_PRODUCT_ID;
  quantityInput.value = product.id === DEFAULT_PRODUCT_ID ? "25" : "1";
  quantityInput.max = quantityLimit(product);
  if (Number(quantityInput.value) > quantityLimit(product)) quantityInput.value = quantityLimit(product);
  renderSpecifications(product);
  renderBenefits(product);
  renderGallery(product);
  renderQuantity();
  document.querySelector("#addToCart").disabled = !productIsAvailable(product);
  document.querySelector("#orderWhatsapp").setAttribute("aria-disabled", String(!productIsAvailable(product)));
}

function renderQuantity() {
  const input = document.querySelector("#quantityInput");
  const quantity = Math.min(quantityLimit(product || sampleProduct), Math.max(1, Number(input.value) || 1));
  input.value = String(quantity);
  document.querySelector("#subtotalPrice").textContent = formatPrice(unitPrice(product || sampleProduct, quantity) * quantity);
  document.querySelectorAll(".quantity-presets button").forEach(button => {
    const preset = Number(button.dataset.quantity);
    button.disabled = preset > quantityLimit(product || sampleProduct);
    button.classList.toggle("selected", preset === quantity);
  });
  const available = productIsAvailable(product);
  document.querySelector("#addToCart").disabled = !available;
  document.querySelector("#orderWhatsapp").setAttribute("aria-disabled", String(!available));
}

function cartEntries() {
  return [...cart.values()];
}

function cartCount() {
  return cartEntries().reduce((total, entry) => total + entry.quantity, 0);
}

function cartTotal() {
  return cartEntries().reduce((total, entry) => total + unitPrice(entry.product, entry.quantity) * entry.quantity, 0);
}

function renderCart() {
  const entries = cartEntries();
  const count = cartCount();
  document.querySelector("#headerCartCount").textContent = String(count);
  document.querySelector("#headerCartTotal").textContent = formatPrice(cartTotal());
  document.querySelector("#openCart").setAttribute("aria-label", `Buka keranjang, ${count} barang`);
  document.querySelector("#dialogCartTotal").textContent = formatPrice(cartTotal());
  document.querySelector("#cartEmpty").hidden = entries.length > 0;
  document.querySelector("#cartItems").innerHTML = entries.map(({product: item, quantity}) => {
    const image = safeImage(item.image);
    const title = escapeHtml(item.name);
    const id = escapeHtml(item.id);
    return `<article class="cart-item">
      ${image ? `<img src="${escapeHtml(image)}" alt="">` : ""}
      <div><b>${title}</b><small>${formatPrice(unitPrice(item, quantity))} / ${escapeHtml(item.unit || "pcs")}</small></div>
      <div class="cart-item-quantity">
        <button class="quantity-button" type="button" data-cart-action="decrease" data-id="${id}" aria-label="Kurangi ${title}">−</button>
        <span>${quantity}</span>
        <button class="quantity-button" type="button" data-cart-action="increase" data-id="${id}" aria-label="Tambah ${title}"${Number.isFinite(item.stockQty) && quantity >= item.stockQty ? " disabled" : ""}>+</button>
      </div>
    </article>`;
  }).join("");
  document.querySelector("#checkoutWhatsapp").setAttribute("aria-disabled", String(entries.length === 0));
}

function persistCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartEntries().map(({product: item, quantity}) => ({
      product: {...item, image: cartImage(item.image)},
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

function addToCart(item, quantity) {
  if (!productIsAvailable(item)) {
    showToast("Produk sedang tidak tersedia.");
    return false;
  }
  const key = String(item.id);
  const existing = cart.get(key);
  const nextQuantity = (existing?.quantity || 0) + quantity;
  if (Number.isFinite(item.stockQty) && nextQuantity > item.stockQty) {
    showToast("Jumlah pesanan melebihi stok yang tersedia.");
    return false;
  }
  cart.set(key, {product: item, quantity: nextQuantity});
  persistCart();
  renderCart();
  showToast(`${quantity} ${item.unit || "unit"} ${item.name} ditambahkan ke keranjang.`);
  return true;
}

function setQuantity(value) {
  const input = document.querySelector("#quantityInput");
  const next = Number(value);
  if (!Number.isInteger(next) || next < 1) {
    input.value = "1";
    renderQuantity();
    return;
  }
  input.value = String(Math.min(next, quantityLimit(product || sampleProduct)));
  renderQuantity();
}

function whatsappUrl(message) {
  const number = String(window.CIPTA_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";
}

function setWhatsappLinks() {
  const contactUrl = whatsappUrl("Halo Cipta Jaya, saya ingin bertanya mengenai produk bahan bangunan.");
  for (const link of [document.querySelector("#headerWhatsapp"), document.querySelector("#footerWhatsapp")]) {
    if (contactUrl) {
      link.href = contactUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  }
}

function orderMessage(item, quantity) {
  return [
    "Halo Cipta Jaya, saya ingin memesan:",
    `- ${item.name} (${quantity} ${item.unit || "pcs"}) — ${formatPrice(unitPrice(item, quantity) * quantity)}`,
    "Mohon konfirmasi ketersediaan dan ongkos kirim."
  ].join("\n");
}

function openWhatsApp(message, event) {
  const url = whatsappUrl(message);
  if (!url) {
    event.preventDefault();
    showToast("Toko belum mengatur nomor WhatsApp untuk pemesanan online.");
    return;
  }
  event.currentTarget.href = url;
  event.currentTarget.target = "_blank";
  event.currentTarget.rel = "noopener noreferrer";
}

function renderRecommendations() {
  const grid = document.querySelector("#recommendationsGrid");
  const error = document.querySelector("#recommendationsError");
  error.hidden = !recommendationsFailed;
  grid.hidden = recommendationsFailed;
  if (recommendationsFailed) return;
  grid.innerHTML = recommendations.map(item => {
    const image = safeImage(item.image);
    const id = escapeHtml(item.id);
    const name = escapeHtml(item.name);
    const badge = item.mockupImage ? "" : `<span class="recommendation-badge">${escapeHtml(item.category)}</span>`;
    return `<article class="recommendation-card">
      <a class="recommendation-image" href="?id=${encodeURIComponent(id)}" aria-label="Lihat ${name}">
        ${image ? `<img src="${escapeHtml(image)}" alt="${name}" loading="lazy">` : ""}
        ${badge}
      </a>
      <div class="recommendation-copy">
        <a class="recommendation-title" href="?id=${encodeURIComponent(id)}">${name}</a>
        <p>${escapeHtml(item.description || "Material pilihan untuk melengkapi kebutuhan proyek Anda.")}</p>
        <div><b>${formatPrice(item.price)} <small>/ ${escapeHtml(item.unit || "pcs")}</small></b><button type="button" data-recommendation="${id}" aria-label="Tambah ${name} ke keranjang"${productIsAvailable(item) ? "" : " disabled"}>＋</button></div>
      </div>
    </article>`;
  }).join("");
}

function setProductError(message) {
  document.querySelector("#detailLoading").hidden = true;
  document.querySelector("#productDetailContent").hidden = true;
  const error = document.querySelector("#detailError");
  error.hidden = false;
  error.querySelector("span").textContent = message;
}

function getProductPayload(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload.data || payload.product || payload.item || payload;
  }
  return Array.isArray(payload) ? payload[0] : null;
}

function getProductList(payload) {
  if (Array.isArray(payload)) return payload;
  return payload?.data || payload?.items || payload?.products || null;
}

async function loadProduct() {
  if (!API_ENABLED) {
    renderProduct();
    renderRecommendations();
    return;
  }
  const currentRequest = ++requestNumber;
  document.querySelector("#detailLoading").hidden = false;
  document.querySelector("#productDetailContent").hidden = true;
  try {
    const response = await fetch(`${API_BASE}/api/products/${encodeURIComponent(productId)}`, {credentials: "same-origin"});
    if (!response.ok) throw new Error(`API ${response.status}`);
    const payload = response.status === 204 ? null : await response.json();
    const result = normalizeProduct(getProductPayload(payload));
    if (currentRequest !== requestNumber) return;
    product = result;
    renderProduct();
    document.querySelector("#detailLoading").hidden = true;
    document.querySelector("#productDetailContent").hidden = false;
  } catch (error) {
    if (currentRequest !== requestNumber) return;
    console.error("Gagal memuat detail produk:", error);
    setProductError("Detail produk gagal dimuat dari server. Periksa koneksi, lalu coba lagi.");
  }
  loadRecommendations();
}

async function loadRecommendations() {
  if (!API_ENABLED) {
    renderRecommendations();
    return;
  }
  try {
    const params = new URLSearchParams({
      featured: "true",
      published: "true",
      limit: "4",
      exclude: product?.id || productId
    });
    const response = await fetch(`${API_BASE}/api/products?${params}`, {credentials: "same-origin"});
    if (!response.ok) throw new Error(`API ${response.status}`);
    const payload = response.status === 204 ? [] : await response.json();
    const result = getProductList(payload);
    if (!Array.isArray(result)) throw new Error("Respons rekomendasi tidak berisi daftar produk.");
    recommendations = result.slice(0, 4).map(normalizeProduct);
    recommendationsFailed = false;
  } catch (error) {
    console.error("Gagal memuat rekomendasi produk:", error);
    recommendations = [];
    recommendationsFailed = true;
  }
  renderRecommendations();
}

document.querySelector("#headerSearchForm").addEventListener("submit", event => {
  event.preventDefault();
  const query = document.querySelector("#headerSearch").value.trim();
  const target = new URL("../halaman.2/index.html", window.location.href);
  if (query) target.searchParams.set("search", query);
  window.location.href = target.href;
});

const menuButton = document.querySelector("#menuButton");
const primaryNav = document.querySelector("#primaryNav");
menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Tutup menu" : "Buka menu");
  primaryNav.classList.toggle("open", isOpen);
});
primaryNav.addEventListener("click", event => {
  if (!event.target.closest("a")) return;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Buka menu");
  primaryNav.classList.remove("open");
});

document.querySelector("#galleryThumbnails").addEventListener("click", event => {
  const button = event.target.closest("button[data-image]");
  if (button) updateProductImage(button.dataset.image, button);
});

document.querySelector("#openImage").addEventListener("click", () => {
  if (!activeImage) return;
  document.querySelector("#zoomedImage").src = activeImage;
  document.querySelector("#imageDialog").showModal();
});
document.querySelector("#closeImage").addEventListener("click", () => document.querySelector("#imageDialog").close());

document.querySelector("#decreaseQuantity").addEventListener("click", () => {
  setQuantity(Number(document.querySelector("#quantityInput").value) - 1);
});
document.querySelector("#increaseQuantity").addEventListener("click", () => {
  setQuantity(Number(document.querySelector("#quantityInput").value) + 1);
});
document.querySelector("#quantityInput").addEventListener("input", () => {
  const value = Number(document.querySelector("#quantityInput").value);
  if (Number.isInteger(value) && value >= 1) renderQuantity();
});
document.querySelector("#quantityInput").addEventListener("change", () => setQuantity(document.querySelector("#quantityInput").value));
document.querySelector(".quantity-presets").addEventListener("click", event => {
  const button = event.target.closest("button[data-quantity]");
  if (button && !button.disabled) setQuantity(button.dataset.quantity);
});

document.querySelector("#addToCart").addEventListener("click", () => {
  if (!product) return;
  addToCart(product, Number(document.querySelector("#quantityInput").value));
});

document.querySelector("#orderWhatsapp").addEventListener("click", event => {
  if (!product || !productIsAvailable(product)) {
    event.preventDefault();
    showToast("Produk sedang tidak tersedia.");
    return;
  }
  openWhatsApp(orderMessage(product, Number(document.querySelector("#quantityInput").value)), event);
});

document.querySelector("#recommendationsGrid").addEventListener("click", event => {
  const button = event.target.closest("button[data-recommendation]");
  if (!button) return;
  const item = recommendations.find(entry => String(entry.id) === button.dataset.recommendation);
  if (item) addToCart(item, 1);
});

function openCart() {
  renderCart();
  document.querySelector("#cartDialog").showModal();
}

document.querySelector("#openCart").addEventListener("click", openCart);
document.querySelector("#closeCart").addEventListener("click", () => document.querySelector("#cartDialog").close());
document.querySelector(".cart-page-link").addEventListener("click", persistCart);
document.querySelector("#cartItems").addEventListener("click", event => {
  const button = event.target.closest("button[data-cart-action]");
  if (!button) return;
  const entry = cart.get(button.dataset.id);
  if (!entry) return;
  if (button.dataset.cartAction === "increase") {
    if (Number.isFinite(entry.product.stockQty) && entry.quantity >= entry.product.stockQty) return;
    cart.set(button.dataset.id, {...entry, quantity: entry.quantity + 1});
  } else if (button.dataset.cartAction === "decrease") {
    if (entry.quantity <= 1) cart.delete(button.dataset.id);
    else cart.set(button.dataset.id, {...entry, quantity: entry.quantity - 1});
  }
  persistCart();
  renderCart();
});

document.querySelector("#checkoutWhatsapp").addEventListener("click", event => {
  const entries = cartEntries();
  if (!entries.length) {
    event.preventDefault();
    return;
  }
  const message = [
    "Halo Cipta Jaya, saya ingin memesan:",
    ...entries.map(({product: item, quantity}) => `- ${item.name} (${quantity} ${item.unit || "pcs"}) — ${formatPrice(unitPrice(item, quantity) * quantity)}`),
    `Total: ${formatPrice(cartTotal())}`
  ].join("\n");
  openWhatsApp(message, event);
});

document.querySelector("#retryDetail").addEventListener("click", () => {
  if (!API_ENABLED) return;
  document.querySelector("#detailError").hidden = true;
  loadProduct();
});

setWhatsappLinks();
renderCart();
renderProduct();
renderRecommendations();
loadProduct();
