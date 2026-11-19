# cipta-jaya-web-catalog
WEB katalog Cipta Jaya.
Assalamualaikum WR. WB.
Manut Nunung
1234567890

## Backend detail produk (S2-6)

Backend detail produk tersedia di folder `Backend` dan memakai Node.js tanpa
framework atau dependency tambahan. Jalankan `npm start` dari folder tersebut
untuk membuka API pada port 3000, atau atur port melalui variabel `PORT`.

Endpoint `GET /api/products/:id` mengembalikan gambar, nama, kategori,
deskripsi, harga, jumlah stok, dan status stok untuk produk berstatus
`published`. Produk published tetap dapat dilihat saat stoknya habis; produk
`draft`, `archived`, dan ID yang tidak ditemukan mengembalikan HTTP 404.

Data katalog disimpan di `Backend/data/products.json`. Setiap item menggunakan
`id`, `name`, `category`, `description`, `image`, `price`, `stock`, dan
`status` (`published`, `draft`, atau `archived`). Jalankan `npm test` dari
folder `Backend` untuk tes endpoint.
