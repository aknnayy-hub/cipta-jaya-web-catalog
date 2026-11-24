/*
 * Integrasi API: set window.CIPTA_API_BASE sebelum file ini, contoh:
 * window.CIPTA_API_BASE = "https://api.tokoanda.id";
 * GET /api/admin/products?search=&status=&page=1
 * POST /api/admin/products, PUT /api/admin/products/:id,
 * PATCH /api/admin/products/:id (featured, inStock, archived).
 * Backend wajib melindungi halaman dan endpoint ini; otorisasi tidak dapat
 * ditegakkan hanya dari frontend. Sertakan cookie sesi admin pada request.
 */
const API_BASE = window.CIPTA_API_BASE || "";
const API_ENABLED = window.CIPTA_API_ENABLED ?? (window.location.protocol !== "file:" || Boolean(API_BASE));
const ENDPOINT = `${API_BASE}/api/admin/products`;
const sampleProducts = [
  {id:"p-1",name:"Semen Merah Putih Watershield 50kg",sku:"SMP-WS-50KG",category:"Semen & Perekat",price:58500,featured:true,inStock:true,published:true,image:"dashboard.assets/product-semen-watershield.png",unit:"Sak"},
  {id:"p-2",name:"Semen Merah Putih PCC 40kg",sku:"SMP-PCC-40KG",category:"Semen & Perekat",price:52000,featured:true,inStock:true,published:true,image:"dashboard.assets/product-semen-pcc.png",unit:"Sak"},
  {id:"p-3",name:"Semen Putih Acian Instant 40kg",sku:"SMP-ACI-40KG",category:"Semen & Perekat",price:68000,featured:false,inStock:false,published:false,image:"dashboard.assets/product-semen-putih.png",unit:"Sak"},
  {id:"p-4",name:"Bata Ringan AAC 10cm Prima",sku:"AAC-10-PRM",category:"Bata & Mortar",price:580000,featured:true,inStock:true,published:true,image:"dashboard.assets/product-bata-aac.png",unit:"m³ (Kubik)"},
  {id:"p-5",name:"Cat Pelapis Waterproofing 4kg",sku:"CT-WPRF-04",category:"Cat Tembok",price:165000,featured:true,inStock:true,published:true,image:"dashboard.assets/product-cat-waterproof.png",unit:"Galon"}
];
let products = API_ENABLED ? [] : [...sampleProducts];
let currentFilter = "all";
let usingFallback = !API_ENABLED;
let loadError = false;
let currentPage = 1;
let totalPages = 1;
let serverSummary = null;
const rows = document.querySelector("#productRows");
const emptyState = document.querySelector("#emptyState");
const dialog = document.querySelector("#productDialog");
const form = document.querySelector("#productForm");
const money = new Intl.NumberFormat("id-ID");

async function api(path = "", options = {}) {
  const response = await fetch(`${ENDPOINT}${path}`, {credentials:"include", ...options, headers:{"Content-Type":"application/json", ...(options.headers || {})}});
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.message || `API ${response.status}`);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}
function escapeHtml(value = "") { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function filteredProducts() {
  const query = `${document.querySelector("#globalSearch").value} ${document.querySelector("#tableSearch").value}`.trim().toLocaleLowerCase("id");
  return products.filter(p => {
    const matchFilter = currentFilter === "all" || (currentFilter === "published" && p.published && !p.archived) || (currentFilter === "out" && !p.inStock && !p.archived) || (currentFilter === "archived" && p.archived) || (currentFilter === "draft" && !p.published && !p.archived);
    const matchQuery = !query || `${p.name} ${p.sku} ${p.category}`.toLocaleLowerCase("id").includes(query);
    return matchFilter && matchQuery;
  });
}
function render() {
  const list = filteredProducts();
  rows.innerHTML = list.map(p => `<tr class="${p.inStock ? "" : "out-row"}">
    <td>${p.image ? `<img class="product-photo" src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" loading="lazy">` : `<span class="product-photo placeholder-photo" role="img" aria-label="Foto ${escapeHtml(p.name)}">▧</span>`}</td>
    <td><b class="product-name">${escapeHtml(p.name)}</b><span class="product-sku">SKU: ${escapeHtml(p.sku)} • ${escapeHtml(p.unit || "")}</span></td>
    <td><span class="category">${escapeHtml(p.category)}</span></td><td><span class="price">Rp ${money.format(Number(p.price) || 0)}</span></td>
    <td><button class="featured-toggle ${p.featured ? "on" : ""}" data-action="featured" data-id="${escapeHtml(p.id)}" aria-label="${p.featured ? "Hapus dari" : "Jadikan"} produk unggulan" aria-pressed="${Boolean(p.featured)}">★</button></td>
    <td><button class="stock-toggle ${p.inStock ? "" : "off"}" data-action="stock" data-id="${escapeHtml(p.id)}" aria-label="Ubah status stok" aria-pressed="${Boolean(p.inStock)}"><span class="switch"></span>${p.inStock ? "Ready" : "Tidak Ada"}</button></td>
    <td><span class="status-pill ${p.inStock ? "" : "out"}">${p.archived ? "Diarsipkan" : p.inStock ? (p.published ? "Dipublikasikan" : "Draf") : "Stok Habis"}</span></td>
    <td><div class="row-actions"><button data-action="edit" data-id="${escapeHtml(p.id)}">Ubah</button><button class="archive" data-action="archive" data-id="${escapeHtml(p.id)}">${p.archived ? "Pulihkan" : "Arsip"}</button></div></td>
  </tr>`).join("");
  emptyState.hidden = list.length > 0;
  emptyState.textContent = loadError ? "Data produk gagal dimuat. Periksa koneksi API dan coba lagi." : "Produk tidak ditemukan.";
  document.querySelector("#resultSummary").textContent = loadError
    ? "Gagal memuat data produk dari server"
    : `Menampilkan ${list.length} produk pada halaman ${currentPage} dari ${totalPages}`;
  if (usingFallback) {
    document.querySelector("#totalCount").textContent = "48";
    document.querySelector("#featuredCount").textContent = "6";
    document.querySelector("#readyCount").textContent = "43";
    document.querySelector("#outCount").textContent = "5";
    document.querySelector("#allTabCount").textContent = "(48)";
  } else {
    const summary = serverSummary || {};
    document.querySelector("#totalCount").textContent = summary.total || 0;
    document.querySelector("#featuredCount").textContent = summary.featured || 0;
    document.querySelector("#readyCount").textContent = summary.ready || 0;
    document.querySelector("#outCount").textContent = summary.outOfStock || 0;
    document.querySelector("#allTabCount").textContent = `(${summary.total || 0})`;
    document.querySelector("#publishedTabCount").textContent = `(${summary.published || 0})`;
    document.querySelector("#outTabCount").textContent = `(${summary.outOfStock || 0})`;
    document.querySelector("#archivedTabCount").textContent = `(${summary.archived || 0})`;
    document.querySelector("#draftTabCount").textContent = `(${summary.draft || 0})`;
  }
  renderPagination();
}
function toast(message) { const node = document.querySelector("#toast"); node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 2600); }
async function persistProduct(id, changes) {
  const product = products.find(p => String(p.id) === String(id));
  if (!product) return;
  const next = {...product, ...changes};
  if (!usingFallback) {
    try {
      const result = await api(`/${encodeURIComponent(id)}`, {method:"PATCH", body:JSON.stringify(changes)});
      Object.assign(product, result?.data || result || next);
    }
    catch (error) {
      if (error.status === 401 || error.status === 403) window.location.replace("../login/login.html");
      else toast("Perubahan gagal disimpan ke server.");
      return;
    }
  }
  if (usingFallback) Object.assign(product, next);
  await loadProducts();
}
rows.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]"); if (!button) return;
  const product = products.find(p => String(p.id) === button.dataset.id); if (!product) return;
  if (button.dataset.action === "edit") openDialog(product);
  if (button.dataset.action === "featured") persistProduct(product.id, {featured:!product.featured});
  if (button.dataset.action === "stock") persistProduct(product.id, {stockQty:product.inStock ? 0 : Math.max(1, Number(product.stockQty) || 0)});
  if (button.dataset.action === "archive") persistProduct(product.id, {archived:!product.archived});
});
function openDialog(product) {
  form.reset(); form.elements.id.value = product?.id || "";
  document.querySelector("#dialogTitle").textContent = product ? "Ubah Produk" : "Tambah Produk Baru";
  if (product) {
    for (const key of ["name","sku","category","price","unit","stockQty","wholesalePrice","wholesaleMin","image","description"]) {
      form.elements[key].value = product[key] ?? "";
    }
    form.elements.featured.checked = Boolean(product.featured);
    form.elements.published.checked = Boolean(product.published);
  }
  dialog.showModal();
}
document.querySelector("#addProduct").addEventListener("click", () => openDialog());
document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
document.querySelector("#cancelDialog").addEventListener("click", () => dialog.close());
form.addEventListener("submit", async event => {
  event.preventDefault(); const data = new FormData(form); const id = data.get("id");
  const product = {
    name:data.get("name").trim(),
    sku:data.get("sku").trim(),
    category:data.get("category").trim(),
    description:data.get("description").trim(),
    price:Number(data.get("price")),
    stockQty:Number(data.get("stockQty")),
    image:data.get("image").trim(),
    unit:data.get("unit").trim(),
    wholesalePrice:data.get("wholesalePrice") ? Number(data.get("wholesalePrice")) : null,
    wholesaleMin:data.get("wholesaleMin") ? Number(data.get("wholesaleMin")) : null,
    featured:data.has("featured"),
    published:data.has("published")
  };
  try {
    if (!usingFallback) {
      const result = id ? await api(`/${encodeURIComponent(id)}`, {method:"PUT",body:JSON.stringify(product)}) : await api("", {method:"POST",body:JSON.stringify(product)});
      const saved = result?.data || result;
      if (id) products = products.map(p => String(p.id) === id ? {...p,...saved} : p); else products.unshift(saved);
    } else if (id) products = products.map(p => String(p.id) === id ? {...p,...product} : p);
    else products.unshift({...product,id:`local-${Date.now()}`});
    dialog.close();
    if (API_ENABLED) await loadProducts();
    else render();
    toast("Produk berhasil disimpan.");
  } catch (error) {
    if (error.status === 401 || error.status === 403) window.location.replace("../login/login.html");
    else toast("Produk gagal disimpan. Periksa koneksi API.");
  }
});
document.querySelectorAll(".filter-tab").forEach(button => button.addEventListener("click", () => {
  document.querySelector(".filter-tab.selected")?.classList.remove("selected");
  button.classList.add("selected");
  currentFilter = button.dataset.filter;
  currentPage = 1;
  if (API_ENABLED) loadProducts();
  else render();
}));
let searchTimeout;
for (const id of ["globalSearch","tableSearch"]) document.querySelector(`#${id}`).addEventListener("input", () => {
  currentPage = 1;
  if (API_ENABLED) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(loadProducts, 250);
  } else render();
});
const sidebar = document.querySelector("#sidebar"), scrim = document.querySelector("#scrim"), menuButton = document.querySelector("#menuButton");
function toggleMenu(open) { sidebar.classList.toggle("open",open); scrim.classList.toggle("show",open); menuButton.setAttribute("aria-expanded",String(open)); }
menuButton.addEventListener("click", () => toggleMenu(!sidebar.classList.contains("open"))); scrim.addEventListener("click", () => toggleMenu(false));
async function loadProducts() {
  if (!API_ENABLED) { render(); return; }
  try {
    const query = `${document.querySelector("#globalSearch").value} ${document.querySelector("#tableSearch").value}`.trim();
    const params = new URLSearchParams({page:String(currentPage),status:currentFilter,search:query});
    const payload = await api(`?${params}`);
    products = Array.isArray(payload) ? payload : (payload.data || payload.items || []);
    totalPages = Number(payload.pages) || 1;
    serverSummary = payload.summary || null;
    usingFallback = false;
    loadError = false;
    render();
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      window.location.replace("../login/login.html");
      return;
    }
    products = [];
    usingFallback = false;
    loadError = true;
    render();
    toast("Data produk gagal dimuat dari API.");
    return;
  }
}

function renderPagination() {
  const pagination = document.querySelector(".pagination");
  if (usingFallback) return;
  const maxVisible = 5;
  const first = Math.max(1, Math.min(currentPage - 2, totalPages - maxVisible + 1));
  const last = Math.min(totalPages, first + maxVisible - 1);
  const buttons = [`<button type="button" data-page="${Math.max(1, currentPage - 1)}"${currentPage === 1 ? " disabled" : ""}>Sebelumnya</button>`];
  for (let page = first; page <= last; page++) {
    buttons.push(`<button type="button" data-page="${page}" class="${page === currentPage ? "current" : ""}"${page === currentPage ? ' aria-current="page"' : ""}>${page}</button>`);
  }
  buttons.push(`<button type="button" data-page="${Math.min(totalPages, currentPage + 1)}"${currentPage >= totalPages ? " disabled" : ""}>Selanjutnya</button>`);
  pagination.innerHTML = buttons.join("");
}

document.querySelector(".pagination").addEventListener("click", event => {
  const button = event.target.closest("button[data-page]");
  if (!button || button.disabled) return;
  currentPage = Number(button.dataset.page);
  loadProducts();
});

document.querySelectorAll("[data-logout]").forEach(link => link.addEventListener("click", async event => {
  if (!API_ENABLED) return;
  event.preventDefault();
  try {
    await fetch(`${API_BASE}/api/admin/logout`, {method:"POST", credentials:"same-origin"});
  } finally {
    window.location.assign("../login/login.html");
  }
}));

async function loadAdminProfile() {
  if (!API_ENABLED) return;
  try {
    const response = await fetch(`${API_BASE}/api/admin/me`, {credentials:"same-origin"});
    if (!response.ok) throw Object.assign(new Error("Sesi admin tidak lagi aktif."), {status: response.status});
    const payload = await response.json();
    const name = payload.user?.name || payload.user?.username || "Admin";
    document.querySelector(".staff span b").textContent = name;
    document.querySelector(".top-actions .user span b").textContent = name;
    const initials = name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
    document.querySelector(".avatar-staff").textContent = initials;
    document.querySelector(".top-actions .user .avatar").textContent = initials;
  } catch (error) {
    if (error.status === 401 || error.status === 403) window.location.replace("../login/login.html");
    else toast("Profil admin tidak dapat dimuat.");
  }
}

loadAdminProfile();
loadProducts();
