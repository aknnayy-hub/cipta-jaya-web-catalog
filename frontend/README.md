# Frontend

Halaman statis di folder ini disajikan oleh backend dari root URL aplikasi.
Untuk menjalankan UI yang terhubung ke MySQL, ikuti setup pada `../README.md`;
server mengirim konfigurasi API dan nomor WhatsApp melalui `/config.js`.

Tanpa server, halaman dapat dibuka langsung sebagai preview mockup dengan data
contoh bawaan. Pada mode server, produk dan status stok selalu berasal dari API;
data contoh tidak digunakan sebagai fallback jika API gagal.

Halaman publik yang tersedia: `halaman.awal/index.html`, `halaman.2/index.html`,
`halaman.3/index.html`, dan `halaman.4/index.html`. Dashboard berada di
`dashboard/dashboard.html` dan memerlukan sesi admin.
