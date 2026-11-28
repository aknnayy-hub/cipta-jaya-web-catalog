const SAMPLE_ORDERS = [
  {
    id: "PSN-2026-001",
    customerName: "Bpk. Hendra Wijaya",
    address: "Perum Menganti Permai Blok C-12, Gresik",
    sentAt: "26 Nov 2026, 09:15",
    status: "Menunggu",
    items: [
      { name: "Semen Merah Putih PCC 50 Kg", qty: 40, unit: "sak", price: 65000 },
      { name: "Besi Beton Ulir 10mm SNI (12m)", qty: 20, unit: "batang", price: 82500 }
    ]
  },
  {
    id: "PSN-2026-002",
    customerName: "Ibu Maya Pratiwi",
    address: "Ds. Setro RT 03/RW 02, Menganti, Gresik",
    sentAt: "26 Nov 2026, 11:40",
    status: "Diproses",
    items: [
      { name: "Cat Tembok Interior Anti-Noda 5 Kg", qty: 4, unit: "galon", price: 145000 },
      { name: "Pipa PVC 3 Inch Tipe AW (4m)", qty: 6, unit: "batang", price: 95000 }
    ]
  },
  {
    id: "PSN-2026-003",
    customerName: "CV Karya Mandiri",
    address: "Jl. Raya Bringkang No. 45, Menganti",
    sentAt: "25 Nov 2026, 15:20",
    status: "Selesai",
    items: [
      { name: "Bata Ringan Hebel AAC 10cm", qty: 12, unit: "m³", price: 615000 }
    ]
  }
];

let activeStatus = "all";

function formatRupiah(amount) {
  return "Rp " + Number(amount || 0).toLocaleString("id-ID");
}

function calcOrderTotal(order) {
  return order.items.reduce((sum, item) => sum + item.qty * item.price, 0);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function updateStats() {
  document.getElementById("totalOrders").textContent = SAMPLE_ORDERS.length;
  document.getElementById("pendingOrders").textContent = SAMPLE_ORDERS.filter(o => o.status === "Menunggu").length;
  document.getElementById("doneOrders").textContent = SAMPLE_ORDERS.filter(o => o.status === "Selesai").length;
}

function renderOrders() {
  const query = (document.getElementById("orderSearch")?.value || "").trim().toLowerCase();
  const tbody = document.getElementById("orderRows");
  const emptyState = document.getElementById("emptyState");

  const filtered = SAMPLE_ORDERS.filter(order => {
    const matchStatus = activeStatus === "all" || order.status === activeStatus;
    const matchQuery = !query ||
      order.id.toLowerCase().includes(query) ||
      order.customerName.toLowerCase().includes(query) ||
      order.address.toLowerCase().includes(query);
    return matchStatus && matchQuery;
  });

  if (!filtered.length) {
    tbody.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  tbody.innerHTML = filtered.map(order => {
    const total = calcOrderTotal(order);
    const summary = order.items.map(i => `${i.name} (${i.qty} ${i.unit})`).join(", ");
    const statusClass = order.status === "Selesai" ? "done" : order.status === "Menunggu" ? "pending" : "";

    return `
      <tr>
        <td><span class="order-id">${order.id}</span></td>
        <td>
          <span class="customer-name">${order.customerName}</span>
          <span class="customer-addr">${order.address}</span>
        </td>
        <td>${order.sentAt}</td>
        <td>${summary}</td>
        <td><span class="order-price">${formatRupiah(total)}</span></td>
        <td>
          <select class="status-select ${statusClass}" data-status-id="${order.id}" aria-label="Status pesanan ${order.id}">
            <option value="Menunggu" ${order.status === "Menunggu" ? "selected" : ""}>Menunggu</option>
            <option value="Diproses" ${order.status === "Diproses" ? "selected" : ""}>Diproses</option>
            <option value="Selesai" ${order.status === "Selesai" ? "selected" : ""}>Selesai</option>
          </select>
        </td>
        <td><button class="detail-btn" type="button" data-detail="${order.id}">Lihat Rekap</button></td>
      </tr>
    `;
  }).join("");
}

document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const scrim = document.getElementById("scrim");
  const menuBtn = document.getElementById("menuButton");

  menuBtn?.addEventListener("click", () => {
    const open = sidebar.classList.toggle("open");
    scrim.classList.toggle("show", open);
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  scrim?.addEventListener("click", () => {
    sidebar.classList.remove("open");
    scrim.classList.remove("show");
  });

  document.querySelectorAll(".filter-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      activeStatus = tab.dataset.status;
      document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("selected"));
      tab.classList.add("selected");
      renderOrders();
    });
  });

  document.getElementById("orderSearch")?.addEventListener("input", renderOrders);

  document.getElementById("orderRows")?.addEventListener("change", event => {
    const select = event.target.closest("[data-status-id]");
    if (!select) return;
    const order = SAMPLE_ORDERS.find(o => o.id === select.dataset.statusId);
    if (order) {
      order.status = select.value;
      updateStats();
      renderOrders();
      showToast(`Status ${order.id} diperbarui menjadi ${order.status}`);
    }
  });

  const dialog = document.getElementById("orderDialog");
  document.getElementById("orderRows")?.addEventListener("click", event => {
    const btn = event.target.closest("[data-detail]");
    if (!btn) return;
    const order = SAMPLE_ORDERS.find(o => o.id === btn.dataset.detail);
    if (!order) return;

    document.getElementById("dialogOrderId").textContent = `Rekap ${order.id}`;
    document.getElementById("dialogCustomer").textContent = `${order.customerName} — ${order.address}`;
    document.getElementById("dialogItems").innerHTML = order.items.map(i => `
      <div class="dialog-item-row">
        <span>${i.name} (${i.qty} ${i.unit})</span>
        <strong>${formatRupiah(i.qty * i.price)}</strong>
      </div>
    `).join("");
    document.getElementById("dialogTotal").textContent = formatRupiah(calcOrderTotal(order));
    dialog.showModal();
  });

  document.getElementById("closeDialog")?.addEventListener("click", () => dialog.close());

  updateStats();
  renderOrders();
});
