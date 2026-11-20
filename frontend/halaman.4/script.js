/*
 * Set window.CIPTA_API_BASE and window.CIPTA_WHATSAPP_NUMBER before loading
 * this file to connect checkout to the order API and store WhatsApp account.
 */
const API_BASE = String(window.CIPTA_API_BASE || "").replace(/\/+$/, "");
const CART_STORAGE_KEY = "cipta-jaya-cart";
const money = new Intl.NumberFormat("id-ID");
const demoCart = [
  {
    product: {
      id: "semen-watershield",
      name: "Semen Merah Putih Watershield 50kg",
      price: 58500,
      unit: "sak",
      image: "../halaman.2/assets/semen-watershield.jpg",
      stockQty: 250,
      inStock: true,
      badge: "Mitra Resmi"
    },
    quantity: 20
  },
  {
    product: {
      id: "bata-ringan-elephant",
      name: "Bata Ringan AAC 10cm Prima",
      price: 580000,
      unit: "m³",
      image: "../halaman.2/assets/bata-ringan-elephant.jpg",
      stockQty: 18,
      inStock: true,
      badge: "SNI Presisi"
    },
    quantity: 3
  },
  {
    product: {
      id: "besi-beton-ulir-d10-sni-12m",
      name: "Besi Beton Ulir D10 SNI 12m",
      price: 76500,
      unit: "btg",
      image: "../halaman.2/assets/besi-beton-polos.jpg",
      stockQty: 120,
      inStock: true,
      badge: "Sertifikasi SNI"
    },
    quantity: 10
  }
];
let cart = new Map();
let storageError = "";

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

function normalizeCartItem(entry) {
  const item = entry?.product;
  const quantity = Number(entry?.quantity);
  const price = Number(item?.price);
  const stockQty = item?.stockQty == null ? null : Number(item.stockQty);
  if (item?.id == null || !item.name || !Number.isFinite(price) || price < 0
      || !Number.isInteger(quantity) || quantity < 1
      || (stockQty !== null && (!Number.isFinite(stockQty) || stockQty < 0))) {
    return null;
  }
  return {
    product: {
      ...item,
      id: String(item.id),
      name: String(item.name),
      price,
      unit: String(item.unit || "pcs"),
      image: String(item.image || ""),
      stockQty,
      inStock: typeof item.inStock === "boolean" ? item.inStock : stockQty === null || stockQty > 0,
      badge: String(item.badge || item.sku || "Mitra Resmi")
    },
    quantity: stockQty === null || stockQty === 0 ? quantity : Math.min(quantity, stockQty)
  };
}

function loadCart() {
  let stored;
  try {
    stored = localStorage.getItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error("Keranjang tidak dapat dibaca dari penyimpanan browser:", error);
    storageError = "Keranjang tidak dapat dibaca dari browser. Periksa pengaturan penyimpanan atau muat ulang halaman.";
    return;
  }
  if (stored === null && !API_BASE) {
    cart = new Map(demoCart.map(entry => [entry.product.id, entry]));
    return;
  }
  if (stored === null) return;
  try {
    const savedItems = JSON.parse(stored);
    if (!Array.isArray(savedItems)) throw new Error("Format penyimpanan keranjang bukan daftar produk.");
    const normalizedItems = savedItems.map(normalizeCartItem);
    if (normalizedItems.some(entry => !entry)) throw new Error("Keranjang tersimpan memuat produk atau jumlah yang tidak valid.");
    cart = new Map(normalizedItems.map(entry => [entry.product.id, entry]));
  } catch (error) {
    console.error("Keranjang tersimpan memiliki format yang tidak valid:", error);
    storageError = "Data keranjang tersimpan tidak dapat dibaca. Silakan kembali ke katalog dan susun ulang keranjang.";
    cart = new Map();
  }
}

function persistCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([...cart.values()]));
    return true;
  } catch (error) {
    console.error("Keranjang tidak dapat disimpan di browser:", error);
    setCheckoutMessage("Perubahan keranjang tidak dapat disimpan. Periksa ruang dan izin penyimpanan browser.");
    return false;
  }
}

function cartEntries() {
  return [...cart.values()];
}

function cartCount() {
  return cartEntries().reduce((total, entry) => total + entry.quantity, 0);
}

function cartTotal() {
  return cartEntries().reduce((total, entry) => total + entry.product.price * entry.quantity, 0);
}

function setCheckoutMessage(message, success = false) {
  const node = document.querySelector("#checkoutMessage");
  node.textContent = message;
  node.className = `checkout-message${success ? " success" : ""}`;
}

function renderCart() {
  const entries = cartEntries();
  const quantityTotal = cartCount();
  const total = cartTotal();
  document.querySelector("#headerCartCount").textContent = String(entries.length);
  document.querySelector("#headerCartTotal").textContent = formatPrice(total);
  document.querySelector("#headerCart").setAttribute("aria-label", `Keranjang, ${entries.length} varian produk`);
  document.querySelector("#productCount").textContent = `${entries.length} Varian Produk`;
  document.querySelector("#summaryProductCount").textContent = `${entries.length} Item Produk`;
  document.querySelector("#summaryQuantity").textContent = `${quantityTotal} Unit / Sak / Pcs`;
  document.querySelector("#grandTotal").textContent = formatPrice(total);
  document.querySelector("#cartEmpty").hidden = entries.length > 0;
  document.querySelector("#cartItems").hidden = entries.length === 0;
  document.querySelector("#cartCardFooter").hidden = entries.length === 0;
  const allItemsAvailable = entries.every(({product, quantity}) =>
    product.inStock !== false
      && (!Number.isFinite(product.stockQty) || product.stockQty > 0)
      && (!Number.isFinite(product.stockQty) || product.stockQty >= quantity)
  );
  document.querySelector("#checkoutButton").disabled =
    entries.length === 0 || !allItemsAvailable || Boolean(storageError);

  if (storageError) setCheckoutMessage(storageError);
  document.querySelector("#cartItems").innerHTML = entries.map(({product, quantity}) => {
    const image = safeImage(product.image);
    const stock = Number.isFinite(product.stockQty) ? product.stockQty : null;
    const available = product.inStock !== false && (stock === null || stock > 0);
    const stockText = available
      ? `Ready Stock${stock === null ? "" : ` (${money.format(stock)} ${product.unit})`}`
      : "Stok Habis";
    return `<article class="cart-item" data-id="${escapeHtml(product.id)}">
      ${image ? `<img class="item-image" src="${escapeHtml(image)}" alt="" loading="lazy">` : '<span class="item-image" aria-hidden="true">▧</span>'}
      <div class="item-copy">
        <div class="item-meta"><span class="stock-badge${available ? "" : " out"}">${escapeHtml(stockText)}</span><span class="item-trust">${escapeHtml(product.badge)}</span></div>
        <h3>${escapeHtml(product.name)}</h3>
        <p>${formatPrice(product.price)} / ${escapeHtml(product.unit)}</p>
      </div>
      <div class="item-actions">
        <div class="quantity-tools" aria-label="Jumlah ${escapeHtml(product.name)}">
          <button type="button" data-cart-action="decrease" data-id="${escapeHtml(product.id)}" aria-label="Kurangi ${escapeHtml(product.name)}">−</button>
          <output aria-label="Jumlah">${quantity}</output>
          <button type="button" data-cart-action="increase" data-id="${escapeHtml(product.id)}" aria-label="Tambah ${escapeHtml(product.name)}"${stock !== null && quantity >= stock ? " disabled" : ""}>+</button>
          <button class="remove-button" type="button" data-cart-action="remove" data-id="${escapeHtml(product.id)}" aria-label="Hapus ${escapeHtml(product.name)}">▤</button>
        </div>
        <strong class="item-total">${formatPrice(product.price * quantity)}</strong>
      </div>
    </article>`;
  }).join("");
}

function whatsappUrl(message) {
  const number = String(window.CIPTA_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : "";
}

function setWhatsappLinks() {
  const url = whatsappUrl("Halo Cipta Jaya, saya ingin bertanya mengenai produk bahan bangunan.");
  for (const link of [document.querySelector("#headerWhatsapp"), document.querySelector("#footerWhatsapp")]) {
    if (!url) continue;
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
}

function checkoutMessage(name, address, notes, orderId) {
  return [
    "Halo Cipta Jaya, saya ingin memesan material berikut:",
    ...cartEntries().map(({product, quantity}) =>
      `- ${product.name} (${quantity} ${product.unit}) x ${formatPrice(product.price)} = ${formatPrice(product.price * quantity)}`
    ),
    `Total sementara: ${formatPrice(cartTotal())}`,
    `Nama pemesan: ${name}`,
    `Alamat proyek: ${address}`,
    notes ? `Catatan armada: ${notes}` : "",
    orderId ? `Referensi pesanan: ${orderId}` : "",
    "Mohon konfirmasi ketersediaan, harga, dan ongkos kirim sebelum pesanan diproses."
  ].filter(Boolean).join("\n");
}

async function submitCheckout(event) {
  event.preventDefault();
  setCheckoutMessage("");
  const form = event.currentTarget;
  if (!cart.size) {
    setCheckoutMessage("Keranjang masih kosong. Tambahkan material sebelum checkout.");
    return;
  }
  if (!form.reportValidity()) return;

  const whatsappNumber = String(window.CIPTA_WHATSAPP_NUMBER || "").replace(/\D/g, "");
  if (!whatsappNumber) {
    setCheckoutMessage("Toko belum mengatur nomor WhatsApp. Isi window.CIPTA_WHATSAPP_NUMBER sebelum checkout.");
    return;
  }

  const button = document.querySelector("#checkoutButton");
  button.disabled = true;
  button.textContent = API_BASE ? "Memeriksa pesanan..." : "Menyiapkan WhatsApp...";
  try {
    const customer = {
      name: document.querySelector("#customerName").value.trim(),
      address: document.querySelector("#deliveryAddress").value.trim(),
      notes: document.querySelector("#deliveryNotes").value.trim()
    };
    let orderId = "";
    if (API_BASE) {
      const response = await fetch(`${API_BASE}/api/orders/checkout-intent`, {
        method: "POST",
        credentials: "include",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          items: cartEntries().map(({product, quantity}) => ({productId: product.id, quantity})),
          customer
        })
      });
      const payload = response.status === 204 ? null : await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || `Checkout gagal (HTTP ${response.status}). Periksa stok dan coba lagi.`);
      }
      const order = payload?.data || payload?.order || payload;
      orderId = String(order?.id || order?.orderId || "");
    }

    const url = whatsappUrl(checkoutMessage(customer.name, customer.address, customer.notes, orderId));
    if (!url) throw new Error("Nomor WhatsApp toko belum dikonfigurasi.");
    window.location.assign(url);
  } catch (error) {
    console.error("Checkout gagal:", error);
    setCheckoutMessage(error.message || "Checkout tidak berhasil. Periksa koneksi, lalu coba lagi.");
    button.disabled = false;
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v12H9l-5 3V5Z"></path><path d="M8 9h8M8 13h5"></path></svg> Checkout &amp; Kirim ke WhatsApp';
  }
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

document.querySelector("#cartItems").addEventListener("click", event => {
  const button = event.target.closest("button[data-cart-action]");
  if (!button) return;
  const entry = cart.get(button.dataset.id);
  if (!entry) return;
  if (button.dataset.cartAction === "remove") {
    cart.delete(button.dataset.id);
  } else if (button.dataset.cartAction === "decrease") {
    if (entry.quantity <= 1) cart.delete(button.dataset.id);
    else cart.set(button.dataset.id, {...entry, quantity: entry.quantity - 1});
  } else if (button.dataset.cartAction === "increase") {
    const stock = Number(entry.product.stockQty);
    if (Number.isFinite(stock) && entry.quantity >= stock) return;
    cart.set(button.dataset.id, {...entry, quantity: entry.quantity + 1});
  }
  if (persistCart()) setCheckoutMessage("");
  renderCart();
});

document.querySelector("#checkoutForm").addEventListener("submit", submitCheckout);
loadCart();
setWhatsappLinks();
renderCart();
