const CART_KEY = "cj_cart_items";

function formatRupiah(amount) {
  return "Rp " + Number(amount || 0).toLocaleString("id-ID");
}

function updateCartBadge() {
  let cart = [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    cart = raw ? JSON.parse(raw) : [];
  } catch {
    cart = [];
  }
  const totalQty = cart.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalAmount = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0), 0);
  const countEl = document.getElementById("cartCount");
  const totalEl = document.getElementById("cartTotal");
  if (countEl) countEl.textContent = totalQty;
  if (totalEl) totalEl.textContent = formatRupiah(totalAmount);
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("menuButton")?.addEventListener("click", () => {
    const nav = document.getElementById("primaryNav");
    const open = nav.classList.toggle("open");
    document.getElementById("menuButton").setAttribute("aria-expanded", String(open));
  });
  updateCartBadge();
});
