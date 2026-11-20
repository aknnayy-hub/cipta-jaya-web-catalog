# PPL-kelompok2
WEB katalog Cipta Jaya.
Assalamualaikum WR. WB.
1234567890

## Dashboard admin

Halaman pengelolaan produk ada di `dashboard/dashboard.html`. Untuk memakai backend,
atur `window.CIPTA_API_BASE` sebelum memuat `dashboard/dashboard.java/dashboard.js`.
Jika tidak diatur, halaman menggunakan lima produk contoh untuk preview.

Kontrak API yang dipakai:

- `GET /api/admin/products?page=1&status=all&search=` mengembalikan array produk,
  atau object dengan properti `data`/`items`.
- `POST /api/admin/products` membuat produk; `PUT /api/admin/products/:id`
  memperbarui produk; `PATCH /api/admin/products/:id` memperbarui status unggulan,
  stok, atau arsip.
- Request menyertakan cookie sesi (`credentials: include`). Backend wajib memeriksa
  sesi dan peran admin pada halaman serta setiap endpoint; frontend mengarahkan
  sesi dengan respons `401`/`403` ke halaman login.

## Katalog publik

Buka `halaman.awal/index.html` untuk melihat halaman katalog yang mengikuti mockup
di folder tersebut. Produk, hero, logo, dan thumbnail berada di
`halaman.awal/assets/`. Tanpa konfigurasi API, halaman menggunakan empat produk
contoh untuk preview.

Untuk integrasi backend, tetapkan konfigurasi sebelum `halaman.awal/script.js`
dimuat:

```html
<script>
  window.CIPTA_API_BASE = "https://api.tokoanda.id";
  window.CIPTA_WHATSAPP_NUMBER = "6281234567890";
</script>
```

Katalog menggunakan `GET /api/products?featured=true&published=true&search=&category=`.
Untuk katalog lengkap, parameter `featured` menjadi `false`; endpoint mengembalikan
semua produk yang cocok dengan filter tersebut. Respons berupa array produk atau
object dengan properti `data`/`items`. Setiap produk sebaiknya memuat
`id`, `name`, `category`, `price`, `unit`, `image`, dan `description`. Gambar dapat
berupa URL absolut atau path relatif terhadap halaman. Jika API gagal, halaman
menampilkan pesan error alih-alih mengganti data dengan contoh.

Tombol pemesanan WhatsApp memakai nomor pada `CIPTA_WHATSAPP_NUMBER` dalam format
angka internasional tanpa tanda `+`. Endpoint katalog publik tetap harus hanya
mengirim produk yang boleh dilihat publik; autentikasi dan izin admin harus
ditegakkan backend pada dashboard dan endpoint pengelolaan produk.

### Katalog responsif (`halaman.2`)

Buka `halaman.2/index.html` untuk melihat katalog material berdasarkan mockup
terbaru. Tanpa konfigurasi API, halaman menampilkan enam produk contoh dan
gambar mockup dari `halaman.2/assets/`.

Konfigurasikan backend dan nomor WhatsApp sebelum `halaman.2/script.js` dimuat:

```html
<script>
  window.CIPTA_API_BASE = "https://api.tokoanda.id";
  window.CIPTA_WHATSAPP_NUMBER = "6281234567890";
</script>
```

Katalog memanggil `GET /api/products?search=&category=&status=&sort=` dan
mengharapkan array produk atau object dengan properti `data`/`items`. Untuk
respons object, `total`, `lastUpdated`, dan `categoryCounts` bersifat opsional.
Setiap produk wajib memuat `id`, `name`, dan harga numerik `price`; produk juga
perlu memuat `category`, `unit`,
`image`, `description`, dan `inStock` atau `stockQty`. `stockStatus` dapat
dipakai sebagai pengganti status boolean/jumlah stok; nilai ready yang dikenal
adalah `ready`, `available`, `in_stock`, dan `in-stock`, sedangkan nilai stok
habis yang dikenal mencakup `out`, `out_of_stock`, `out-of-stock`, `sold_out`,
dan `sold-out`. Endpoint harus
mengembalikan produk publik yang sesuai filter, dengan seluruh hasil cocok
karena halaman belum memakai pagination.

Pencarian, kategori, status stok, dan pengurutan diteruskan ke query API.
Respons API yang gagal ditampilkan sebagai error dan tidak diganti data contoh.
Checkout menyusun pesan WhatsApp dari keranjang di browser; frontend tidak
membuat pesanan atau menganggap pemesanan berhasil. Nomor toko harus dikonfigurasi
dalam format angka internasional tanpa tanda `+`.

### Detail produk (`halaman.3`)

Buka `halaman.3/index.html` untuk halaman detail produk sesuai mockup. Halaman
demo menggunakan foto dari folder `halaman.3/assets/`; produk awal bisa dipilih
dengan parameter `?id=...`. `window.CIPTA_PRODUCT_ID` dapat dipakai untuk memberi
ID awal tanpa query string.

Halaman menggunakan `window.CIPTA_API_BASE` dan `window.CIPTA_WHATSAPP_NUMBER`
yang sama seperti katalog. Detail dimuat dari `GET /api/products/:id`, dengan
respons berupa object produk atau object berisi properti `data`, `product`, atau
`item`. Rekomendasi dimuat dari
`GET /api/products?featured=true&published=true&limit=4&exclude=:id`, berupa
array atau object dengan properti `data`, `items`, atau `products`.

Data detail wajib memiliki `id`, `name`, harga numerik `price`, serta `inStock`
atau jumlah `stockQty`/`stock`. `stockStatus` dapat menggantikan informasi stok
dengan nilai seperti `ready` atau `out_of_stock`. `unit`, `category`, `image`,
`gallery`, `description`, `sku`, `rating`, `reviewCount`, `soldCount`,
`wholesalePrice`, `wholesaleMin`, `benefits`, dan `specifications` bersifat
opsional. Entri galeri menerima URL gambar atau object berisi `image`/`url`
serta `thumbnail` opsional. Jika API dikonfigurasi tetapi gagal, detail dan
rekomendasi menampilkan error, bukan data contoh. Tombol WhatsApp hanya
menyusun pesan pesanan di browser; backend tetap perlu memvalidasi harga dan
stok saat pesanan dikonfirmasi.

### Keranjang dan checkout (`halaman.4`)

Buka `halaman.4/index.html` untuk meninjau keranjang dan mengisi data pengiriman.
Keranjang disimpan di `localStorage` dengan key `cipta-jaya-cart` dan dibagi
dengan halaman katalog serta detail produk. Jika belum ada keranjang tersimpan,
halaman preview menampilkan produk contoh dari mockup; bila API dikonfigurasi,
keranjang kosong tidak diisi data contoh.

Gunakan `window.CIPTA_API_BASE` dan `window.CIPTA_WHATSAPP_NUMBER` yang sama
dengan halaman katalog. Checkout mengirim `POST /api/orders/checkout-intent`
dengan cookie sesi dan JSON berikut:

```json
{
  "items": [
    {"productId": "semen-watershield", "quantity": 20}
  ],
  "customer": {
    "name": "Nama pemesan",
    "address": "Alamat proyek",
    "notes": "Catatan pengiriman"
  }
}
```

Backend harus menghitung ulang harga, memeriksa stok, validasi data pemesan,
serta membuat pesanan berstatus menunggu konfirmasi sebelum mengembalikan
respons sukses. Respons boleh berupa object pesanan atau envelope `data`/`order`;
ID `id` atau `orderId` akan dicantumkan pada pesan WhatsApp. Jika endpoint gagal,
halaman menampilkan pesan error dan tidak membuka WhatsApp. Tanpa API, halaman
hanya menyusun pesan WhatsApp dari keranjang browser; pemesanan belum dianggap
berhasil sampai dikonfirmasi admin. Nomor toko harus berupa angka internasional
tanpa tanda `+`.
