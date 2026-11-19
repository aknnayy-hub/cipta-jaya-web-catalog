/*
 * Integrasi API: set window.CIPTA_API_BASE sebelum file ini, contoh:
 * window.CIPTA_API_BASE = "https://api.tokoanda.id";
 * GET /api/admin/products?search=&status=&page=1
 * POST /api/admin/products, PUT /api/admin/products/:id,
 * PATCH /api/admin/products/:id (featured, inStock, archived).
 * Sertakan kredensial cookie agar otorisasi admin dapat ditangani backend.
 */
const API_BASE = window.CIPTA_API_BASE || "";
const ENDPOINT = `${API_BASE}/api/admin/products`;
const sampleProducts = [
  {id:"p-1",name:"Semen Merah Putih Watershield 50kg",sku:"SMP-WS-50KG",category:"Semen & Perekat",price:58500,featured:true,inStock:true,published:true,image:"",unit:"Sak"},
  {id:"p-2",name:"Semen Merah Putih PCC 40kg",sku:"SMP-PCC-40KG",category:"Semen & Perekat",price:52000,featured:true,inStock:true,published:true,image:"",unit:"Sak"},
  {id:"p-3",name:"Semen Putih Acian Instant 40kg",sku:"SMP-ACI-40KG",category:"Semen & Perekat",price:68000,featured:false,inStock:false,published:false,image:"",unit:"Sak"},
  {id:"p-4",name:"Bata Ringan AAC 10cm Prima",sku:"AAC-10-PRM",category:"Bata & Mortar",price:580000,featured:true,inStock:true,published:true,image:"",unit:"m³ (Kubik)"},
  {id:"p-5",name:"Cat Pelapis Waterproofing 4kg",sku:"CT-WPRF-04",category:"Cat Tembok",price:165000,featured:true,inStock:true,published:true,image:"",unit:"Galon"}
];
let products = [...sampleProducts];
let currentFilter = "all";
let usingFallback = true;
let currentPage = 1;
const rows = document.querySelector("#productRows");
const emptyState = document.querySelector("#emptyState");
const dialog = document.querySelector("#productDialog");
const form = document.querySelector("#productForm");
const money = new Intl.NumberFormat("id-ID");

async function api(path = "", options = {}) {
  const response = await fetch(`${ENDPOINT}${path}`, {credentials:"include", ...options, headers:{"Content-Type":"application/json", ...(options.headers || {})}});
  if (!response.ok) throw new Error(`API ${response.status}`);
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
  document.querySelector("#resultSummary").textContent = `Menampilkan ${list.length} dari ${usingFallback ? "48" : products.length} total produk aktif`;
  if (usingFallback) {
    document.querySelector("#totalCount").textContent = "48";
    document.querySelector("#featuredCount").textContent = "6";
    document.querySelector("#readyCount").textContent = "43";
    document.querySelector("#outCount").textContent = "5";
    document.querySelector("#allTabCount").textContent = "(48)";
  } else {
    document.querySelector("#totalCount").textContent = products.length;
    document.querySelector("#featuredCount").textContent = products.filter(p => p.featured).length;
    document.querySelector("#readyCount").textContent = products.filter(p => p.inStock).length;
    document.querySelector("#outCount").textContent = products.filter(p => !p.inStock).length;
    document.querySelector("#allTabCount").textContent = `(${products.length})`;
  }
}
function toast(message) { const node = document.querySelector("#toast"); node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 2600); }
async function persistProduct(id, changes) {
  const product = products.find(p => String(p.id) === String(id));
  if (!product) return;
  const next = {...product, ...changes};
  if (!usingFallback) {
    try { await api(`/${encodeURIComponent(id)}`, {method:"PATCH", body:JSON.stringify(changes)}); }
    catch (error) { toast("Perubahan gagal disimpan ke server."); return; }
  }
  Object.assign(product, next); render();
}
rows.addEventListener("click", event => {
  const button = event.target.closest("button[data-action]"); if (!button) return;
  const product = products.find(p => String(p.id) === button.dataset.id); if (!product) return;
  if (button.dataset.action === "edit") openDialog(product);
  if (button.dataset.action === "featured") persistProduct(product.id, {featured:!product.featured});
  if (button.dataset.action === "stock") persistProduct(product.id, {inStock:!product.inStock});
  if (button.dataset.action === "archive") persistProduct(product.id, {archived:!product.archived});
});
function openDialog(product) {
  form.reset(); form.elements.id.value = product?.id || "";
  document.querySelector("#dialogTitle").textContent = product ? "Ubah Produk" : "Tambah Produk Baru";
  if (product) { for (const key of ["name","sku","category","price","image"]) form.elements[key].value = product[key] ?? ""; form.elements.inStock.value = String(product.inStock); form.elements.featured.checked = Boolean(product.featured); form.elements.published.checked = Boolean(product.published); }
  dialog.showModal();
}
document.querySelector("#addProduct").addEventListener("click", () => openDialog());
document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
document.querySelector("#cancelDialog").addEventListener("click", () => dialog.close());
form.addEventListener("submit", async event => {
  event.preventDefault(); const data = new FormData(form); const id = data.get("id");
  const product = {name:data.get("name").trim(),sku:data.get("sku").trim(),category:data.get("category").trim(),price:Number(data.get("price")),image:data.get("image").trim(),inStock:data.get("inStock") === "true",featured:data.has("featured"),published:data.has("published"),unit:""};
  try {
    if (!usingFallback) {
      const result = id ? await api(`/${encodeURIComponent(id)}`, {method:"PUT",body:JSON.stringify(product)}) : await api("", {method:"POST",body:JSON.stringify(product)});
      if (id) products = products.map(p => String(p.id) === id ? {...p,...(result || product)} : p); else products.unshift(result || {...product,id:crypto.randomUUID()});
    } else if (id) products = products.map(p => String(p.id) === id ? {...p,...product} : p);
    else products.unshift({...product,id:`local-${Date.now()}`});
    dialog.close(); render(); toast("Produk berhasil disimpan.");
  } catch (error) { toast("Produk gagal disimpan. Periksa koneksi API."); }
});
document.querySelectorAll(".filter-tab").forEach(button => button.addEventListener("click", () => { document.querySelector(".filter-tab.selected")?.classList.remove("selected"); button.classList.add("selected"); currentFilter = button.dataset.filter; render(); }));
document.querySelector(".pagination").addEventListener("click", event => {
  const button = event.target.closest("button"); if (!button) return;
  if (button.textContent.trim() === "Selanjutnya") currentPage++;
  else if (button.textContent.trim() === "Sebelumnya") currentPage = Math.max(1, currentPage - 1);
  else if (/^\d+$/.test(button.textContent.trim())) currentPage = Number(button.textContent.trim());
  document.querySelectorAll(".pagination button").forEach(item => item.classList.toggle("current", item.textContent.trim() === String(currentPage)));
  document.querySelector(".pagination button").disabled = currentPage === 1;
  loadProducts();
});
for (const id of ["globalSearch","tableSearch"]) document.querySelector(`#${id}`).addEventListener("input", render);
const sidebar = document.querySelector("#sidebar"), scrim = document.querySelector("#scrim"), menuButton = document.querySelector("#menuButton");
function toggleMenu(open) { sidebar.classList.toggle("open",open); scrim.classList.toggle("show",open); menuButton.setAttribute("aria-expanded",String(open)); }
menuButton.addEventListener("click", () => toggleMenu(!sidebar.classList.contains("open"))); scrim.addEventListener("click", () => toggleMenu(false));
async function loadProducts() {
  if (!API_BASE) { render(); return; }
  try {
    const payload = await api(`?page=${currentPage}&status=${encodeURIComponent(currentFilter)}`);
    products = Array.isArray(payload) ? payload : (payload.data || payload.items || []);
    usingFallback = false;
  } catch (error) { usingFallback = true; toast("API belum tersedia. Menampilkan data contoh."); }
  render();
}
loadProducts();
