# Katalog Web Cipta Jaya

Katalog HTML/JavaScript dan dashboard admin berjalan melalui server Node.js,
dengan data produk, stok, sesi admin, dan checkout intent tersimpan di MySQL.
Halaman utama tersedia di `/`; katalog lain tetap dapat dibuka lewat
`/halaman.2/index.html`, `/halaman.3/index.html`, dan `/halaman.4/index.html`.

## Menyiapkan aplikasi

1. Gunakan Node.js 20+ dan MySQL 8. Buat salinan `.env.example` menjadi `.env`,
   lalu isi kredensial MySQL, nomor WhatsApp internasional, dan secret sesi
   acak minimal 32 karakter. Jangan commit `.env`.
2. Import `database/schema.sql` melalui MySQL Workbench atau klien MySQL.
   Skrip membuat database `cipta_jaya`, tabel admin, produk, pesanan, item
   pesanan, dan sesi. Tidak ada akun/password atau data produk contoh di schema.
3. Jalankan `npm.cmd install` lalu `npm.cmd run setup-admin` untuk membuat akun
   admin pertama secara interaktif. Password minimum 12 karakter disimpan
   sebagai bcrypt hash.
4. Jalankan `npm.cmd start`, kemudian buka `http://127.0.0.1:3000`.

Di produksi, set `NODE_ENV=production` dan `SESSION_COOKIE_SECURE=true` di
belakang HTTPS; jika HTTPS diterminasi reverse proxy, set `TRUST_PROXY=1`.
Gunakan user MySQL khusus aplikasi dengan hak akses minimum. Untuk URL/path
gambar lokal, gunakan path root-relative seperti
`/dashboard/dashboard.assets/product-semen-pcc.png`.

## Konektivitas UI dan data

Server menyajikan seluruh folder `frontend`, mengisi konfigurasi publik saat
runtime melalui `/config.js`, dan mengaktifkan API otomatis. Produk baru tidak
terbit sebelum admin mengisinya dan mencentang status publikasi. Kelola SKU,
kategori, harga, harga grosir, satuan, stok, gambar, dan deskripsi di dashboard.
Galeri, manfaat, dan spesifikasi produk tersedia melalui API/database; input
dashboard saat ini mengelola field katalog dasar. Cart tetap dibagi melalui
`localStorage` (`cipta-jaya-cart`), sedangkan server tidak mempercayai harga
atau stok dari browser saat checkout.

Checkout membuat pesanan berstatus `pending_confirmation`; backend menghitung
ulang harga (termasuk harga grosir), memeriksa stok dan menyimpan snapshot item
sebelum halaman membuka WhatsApp dengan referensi pesanan. Ini bukan pembayaran
atau konfirmasi pesanan otomatis; stok belum dikurangi dan admin tetap
mengonfirmasi ketersediaan serta ongkir melalui WhatsApp.

Untuk preview desain tanpa server, buka berkas HTML langsung. Data contoh yang
sudah tertanam hanya aktif pada mode preview lokal; saat diakses melalui server,
UI selalu mengambil data API dan menampilkan loading, error, atau empty state
yang sesuai.

## API

- `GET /api/health`
- `GET /api/products?featured=true&search=&category=&status=&sort=&limit=`
- `GET /api/products/:id` (produk publik/terbit)
- `POST /api/admin/login`, `GET /api/admin/me`, `POST /api/admin/logout`
- `GET /api/admin/products?page=1&status=all&search=`
- `POST /api/admin/products`, `PUT /api/admin/products/:id`,
  `PATCH /api/admin/products/:id`
- `POST /api/orders/checkout-intent`

Semua endpoint pengelolaan produk memerlukan sesi admin. Cookie sesi `HttpOnly`,
`SameSite=Lax`, tersimpan di MySQL; login dan checkout memiliki rate limit.
Halaman dashboard mengarahkan pengguna yang belum masuk ke halaman login.
