const CART_KEY = "cj_cart_items";
const WA_NUMBER = "62895366125869";

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
  renderCart();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2600);
}

function updateQty(index, newQty) {
  const cart = getCart();
  if (!cart[index]) return;
  cart[index].qty = Math.max(1, parseInt(newQty, 10) || 1);
  saveCart(cart);
}

function removeItem(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
  showToast("Produk dihapus dari keranjang");
}

function buildRecapMessage() {
  const cart = getCart();
  const name = document.getElementById("customerName").value.trim();
  const address = document.getElementById("customerAddress").value.trim();
  const notes = document.getElementById("customerNotes").value.trim();

  let total = 0;
  const lines = cart.map((item, idx) => {
    const subtotal = Number(item.price) * Number(item.qty);
    total += subtotal;
    return `${idx + 1}. ${item.name}\n   ${item.qty} ${item.unit} x ${formatRupiah(item.price)} = ${formatRupiah(subtotal)}`;
  });

  return [
    "Halo Admin Cipta Jaya, saya ingin memesan material berikut:",
    "",
    ...lines,
    "",
    `Total Estimasi: ${formatRupiah(total)}`,
    `Nama Pemesan: ${name}`,
    `Alamat Kirim: ${address}`,
    notes ? `Catatan: ${notes}` : null
  ].filter(Boolean).join("\n");
}

function renderCart() {
  const cart = getCart();
  const layout = document.getElementById("cartLayout");
  const empty = document.getElementById("emptyCart");
  const listEl = document.getElementById("cartItemsList");

  const totalQty = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalAmount = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);

  document.getElementById("cartCount").textContent = totalQty;
  document.getElementById("cartTotal").textContent = formatRupiah(totalAmount);
  document.getElementById("summaryQty").textContent = `${totalQty} item`;
  document.getElementById("summaryTotal").textContent = formatRupiah(totalAmount);

  if (!cart.length) {
    layout.hidden = true;
    empty.hidden = false;
    return;
  }

  layout.hidden = false;
  empty.hidden = true;

  listEl.innerHTML = cart.map((item, index) => {
    const subtotal = Number(item.price) * Number(item.qty);
    const thumb = item.image
      ? `<img src="${item.image}" alt="${item.name}">`
      : `<span aria-hidden="true">🧱</span>`;
    const stockWarn = item.inStock === false
      ? `<span class="item-stock-warn">Stok Tidak Ada — harap hapus</span>`
      : "";

    return `
      <article class="cart-item">
        <div class="item-thumb">${thumb}</div>
        <div class="item-info">
          <h2>${item.name}</h2>
          <div class="item-meta">${item.category || "Material"} &bull; Satuan: ${item.unit || "pcs"}</div>
          <div class="item-price">${formatRupiah(item.price)} / ${item.unit || "pcs"}</div>
          ${stockWarn}
        </div>
        <div class="item-controls">
          <div class="qty-box">
            <button type="button" data-dec="${index}" aria-label="Kurangi jumlah">-</button>
            <input type="number" min="1" value="${item.qty}" data-qty="${index}" aria-label="Jumlah ${item.name}">
            <button type="button" data-inc="${index}" aria-label="Tambah jumlah">+</button>
          </div>
          <div class="item-subtotal">${formatRupiah(subtotal)}</div>
          <button class="remove-btn" type="button" data-remove="${index}">Hapus</button>
        </div>
      </article>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const listEl = document.getElementById("cartItemsList");
  const dialog = document.getElementById("confirmDialog");

  listEl?.addEventListener("click", event => {
    const dec = event.target.closest("[data-dec]");
    const inc = event.target.closest("[data-inc]");
    const rem = event.target.closest("[data-remove]");
    const cart = getCart();

    if (dec) {
      const idx = Number(dec.dataset.dec);
      updateQty(idx, Number(cart[idx]?.qty || 1) - 1);
    } else if (inc) {
      const idx = Number(inc.dataset.inc);
      updateQty(idx, Number(cart[idx]?.qty || 1) + 1);
    } else if (rem) {
      removeItem(Number(rem.dataset.remove));
    }
  });

  listEl?.addEventListener("change", event => {
    const input = event.target.closest("[data-qty]");
    if (input) updateQty(Number(input.dataset.qty), input.value);
  });

  document.getElementById("checkoutForm")?.addEventListener("submit", event => {
    event.preventDefault();
    const cart = getCart();
    if (!cart.length) {
      showToast("Keranjang masih kosong, silakan pilih produk terlebih dahulu");
      return;
    }
    const outItem = cart.find(item => item.inStock === false);
    if (outItem) {
      showToast(`Produk "${outItem.name}" stoknya habis, harap hapus dari keranjang`);
      return;
    }
    document.getElementById("recapPreview").textContent = buildRecapMessage();
    dialog.showModal();
  });

  document.getElementById("confirmNo")?.addEventListener("click", () => dialog.close());

  document.getElementById("confirmYes")?.addEventListener("click", () => {
    const text = encodeURIComponent(buildRecapMessage());
    dialog.close();
    window.open(`https://wa.me/${WA_NUMBER}?text=${text}`, "_blank", "noopener,noreferrer");
  });

  document.getElementById("menuButton")?.addEventListener("click", () => {
    const nav = document.getElementById("primaryNav");
    const open = nav.classList.toggle("open");
    document.getElementById("menuButton").setAttribute("aria-expanded", String(open));
  });

  renderCart();
});
