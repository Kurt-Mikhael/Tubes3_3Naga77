# Judol Detector

Chromium Browser Extension untuk mendeteksi konten judi online pada halaman web menggunakan algoritma pattern matching.

## Deskripsi Singkat

**Judol Detector** adalah browser extension yang dikembangkan dengan **TypeScript** untuk mendeteksi informasi yang mengandung unsur judi online (judol) pada halaman web. Extension ini mengimplementasikan berbagai algoritma pattern matching:

- **Knuth-Morris-Pratt (KMP)** - Algoritma pencarian string dengan preprocessing prefix function
- **Boyer-Moore (BM)** - Algoritma pencarian string dengan bad character heuristic
- **Regular Expression (RegEx)** - Untuk mendeteksi pola `<kata><angka>` (contoh: MAXWIN234, SLOT99)
- **Weighted Levenshtein Distance** - Untuk fuzzy matching pada karakter yang dimanipulasi secara visual

## Algoritma

### Knuth-Morris-Pratt (KMP)

Algoritma KMP melakukan pencarian pattern dalam text dengan menghindari perbandingan ulang karakter yang sudah diketahui cocok. Algoritma ini menggunakan **Longest Prefix Suffix (LPS) array** (border function) untuk menentukan seberapa banyak pattern dapat digeser ketika terjadi mismatch.

**Kompleksitas:**

- Preprocessing: O(m) dimana m adalah panjang pattern
- Pencarian: O(n) dimana n adalah panjang text
- Total: O(m + n)

### Boyer-Moore (BM)

Algoritma Boyer-Moore adalah algoritma pencarian string yang efisien dengan melakukan perbandingan dari kanan ke kiri. Algoritma ini menggunakan **Last Occurrence Table** (bad character heuristic) untuk menentukan seberapa jauh pattern dapat digeser ketika terjadi mismatch.

**Kompleksitas:**

- Preprocessing: O(m + Σ) dimana Σ adalah ukuran alphabet
- Best Case: O(n/m)
- Worst Case: O(nm)

### Aho-Corasick (Bonus)
Aho-Corasick adalah algoritma yang sangat efisien untuk mencari banyak keyword sekaligus (multiple pattern matching). Seluruh keyword diproses ke dalam satu struktur **Trie** (Pohon) yang dilengkapi dengan *failure links* dan *output links*. Alih-alih melakukan iterasi berulang, teks hanya perlu dipindai **satu kali** untuk mendeteksi semua keyword secara simultan.
- **Kompleksitas:** O(n + m + z) di mana n adalah panjang teks, m adalah total panjang seluruh keyword, dan z adalah jumlah temuan.

### Rabin-Karp (Bonus)
Berbeda dengan algoritma lain yang mencocokkan karakter secara individual, Rabin-Karp mengonversi string menjadi nilai numerik menggunakan fungsi matematika **Rolling Hash**. Teks dipindai menggunakan *sliding window*, dan pencocokan karakter secara manual hanya dilakukan jika nilai hash window teks sama persis dengan nilai hash keyword untuk mencegah *hash collision* (Spurious Hit).
- **Kompleksitas:**
  - Rata-rata: O(n + m)
  - Worst Case: O(n * m) (jika terjadi banyak hash collision)

### Regular Expression (RegEx)
Digunakan sebagai lapisan pertahanan untuk mendeteksi modifikasi teks yang menambahkan variasi numerik di akhir kata kunci utama. Algoritma ini dikonfigurasi untuk menangkap pola `<kata><angka>` (contoh: `maxwin88`, `slot99`, `gacor123`) yang sering digunakan oleh situs judi untuk menghindari blokir dari exact matching biasa.

### Weighted Levenshtein Distance (Fuzzy Matching)
Berfungsi untuk menangkap kata kunci yang disamarkan dengan *typo* disengaja atau substitusi karakter (*leetspeak/homoglyph*). Algoritma ini memodifikasi jarak Levenshtein tradisional dengan memberikan **bobot (weight)** yang lebih kecil pada penggantian karakter yang secara visual atau struktural mirip (misalnya huruf 'a' diganti angka '4', huruf 'o' diganti angka '0', atau huruf 'i' diganti '1'). Jika jarak modifikasi masih berada di bawah *threshold* yang ditentukan, sistem akan menandainya sebagai deteksi positif.

## Requirement Program dan Instalasi

### Prerequisites

- **Node.js** versi 18 atau lebih baru
- **npm** atau **yarn**
- Browser berbasis Chromium (Google Chrome, Microsoft Edge, Brave, dll.)

### Langkah Instalasi

1. Clone repository ini:

```bash
git clone <repository-url>
cd Tubes3_3Naga77
```

2. Install dependencies:

```bash
npm install
```

## Build dan Load Extension

### Build Extension

```bash
npm run build
```

Hasil build akan tersimpan pada folder `dist/`.

### Development Mode (Watch)

```bash
npm run watch
```

Mode ini akan memantau perubahan file dan melakukan rebuild secara otomatis.

### Cara Load Extension di Chrome

1. Buka browser Google Chrome
2. Masuk ke halaman `chrome://extensions/`
3. Aktifkan opsi **Developer mode** (toggle di pojok kanan atas)
4. Tekan tombol **Load unpacked**
5. Pilih folder `dist/` hasil build
6. Extension akan muncul di toolbar browser

### Menggunakan Extension

1. Buka halaman web mana saja
2. Extension akan secara otomatis melakukan scanning pada halaman
3. Klik icon extension di toolbar untuk melihat statistik
4. Elemen yang terdeteksi akan di-highlight dengan warna kuning
5. Hover pada elemen yang ter-highlight untuk melihat tooltip informasi
6. Tekan tombol **Scan Ulang** pada popup untuk melakukan scanning ulang

## Struktur Proyek

```
Tubes3_3Naga77/
├── dist/                          # Hasil build ekstensi siap pakai
│   ├── images/
│   │   └── README.md
│   ├── styles/
│   │   └── content.css
│   ├── tesseract/
│   │   └── worker.min.js
│   ├── background.js
│   ├── content.js
│   ├── keywords.txt
│   ├── manifest.json
│   ├── popup.css
│   ├── popup.html
│   └── popup.js
├── docs/                          # Dokumen laporan tugas besar
│   └── 3Naga77.pdf
├── keywords/                      # Daftar kata kunci pencarian
│   └── keywords.txt
├── node_modules/                  # Dependensi proyek
├── public/                        # Aset statis yang akan disalin saat build
│   ├── images/
│   │   └── README.md
│   ├── tesseract/
│   │   └── worker.min.js
│   └── manifest.json              # Konfigurasi Chrome Extension
├── src/                           # Kode sumber utama ekstensi
│   ├── algorithms/                # Implementasi algoritma pencarian & unit test
│   │   ├── aho-corasick.test.ts
│   │   ├── aho-corasick.ts
│   │   ├── boyer-moore.test.ts
│   │   ├── boyer-moore.ts
│   │   ├── kmp.test.ts
│   │   ├── kmp.ts
│   │   ├── rabin-karp.test.ts
│   │   ├── rabin-karp.ts
│   │   ├── regex.test.ts
│   │   ├── regex.ts
│   │   ├── weighted-levenshtein.test.ts
│   │   └── weighted-levenshtein.ts
│   ├── content/                   # Content script untuk integrasi ke DOM halaman
│   │   ├── content.css
│   │   └── content.ts
│   ├── core/                      # Alur logika utama
│   │   ├── pipeline.test.ts
│   │   └── pipeline.ts
│   ├── popup/                     # Antarmuka panel ekstensi
│   │   ├── popup.css
│   │   ├── popup.html
│   │   └── popup.ts
│   ├── types/                     # Definisi tipe data TypeScript
│   │   └── type.ts
│   ├── utils/                     # Fungsi pembantu (helpers)
│   │   ├── dom-utils.ts
│   │   ├── keyword-loader.ts
│   │   └── text-utils.ts
│   └── background.ts              # Background service worker
├── .gitignore
├── package-lock.json
├── package.json                   # Konfigurasi dependensi dan scripts npm
├── README.md                      # Dokumentasi proyek
├── tsconfig.json                  # Konfigurasi kompilator TypeScript
└── vite.config.ts                 # Konfigurasi Vite bundler
```

## Fitur

### Fitur Wajib

* Pattern matching dengan KMP (from scratch)
* Pattern matching dengan Boyer-Moore (from scratch)
* Regex matching untuk pola `<kata><angka>`
* Exact matching dan fuzzy matching dengan Weighted Levenshtein Distance
* Highlight elemen DOM yang terdeteksi
* Tooltip saat hover dengan informasi detail
* Statistik realtime pada popup extension
* Auto-scan saat halaman dimuat

### Fitur Bonus (Opsional)

- Algoritma Aho-Corasick dan Rabin Karp
- Fitur Blur/Censorship dengan toggle
- Optical Character Recognition (OCR) pada gambar

## Checklist Spesifikasi

| No | Poin                                                                                                                         | Ya | Tidak |
| -- | ---------------------------------------------------------------------------------------------------------------------------- | -- | ----- |
| 1  | Extension berhasil di-build dan di-load tanpa kesalahan pada chromium browser dan dikembangkan dengan TypeScript             | ✓  |       |
| 2  | KMP dan Boyer-Moore diimplementasikan from scratch                                                                           | ✓  |       |
| 3  | Regex menghandle format `<kata><angka>` dan berbagai edge case                                                             | ✓  |       |
| 4  | Pencarian KMP & BM membaca keyword.txt secara iteratif dan tidak menggunakan built-in search function atau library eksternal | ✓  |       |
| 5  | Exact matching dan fuzzy matching berjalan benar                                                                             | ✓  |       |
| 6  | Elemen DOM terdeteksi diberi highlight dan terhapus saat rescanning                                                          | ✓  |       |
| 7  | Tooltip muncul saat hover dengan informasi keyword, algoritma, kemunculan, dan waktu eksekusi                                | ✓  |       |
| 8  | Popup menampilkan statistik realtime (total keyword, perbandingan, waktu eksekusi, jumlah match)                             | ✓  |       |
| 9  | [Bonus] Membuat Video                                                                                                        | ✓  |       |
| 10 | [Bonus] Implementasi Algoritma Aho-Corasick dan Rabin Karp                                                                   | ✓  |       |
| 11 | [Bonus] Implementasi Censorship / Blur Teks                                                                                  | ✓  |       |
| 12 | [Bonus] Implementasi Optical Character Recognition pada Gambar                                                               | ✓  |       |

## Author

Kelompok: **3Naga77**

- **Anggota 1** - 13524065 - Kurt Mikhael Purba
- **Anggota 2** - 13524079 - Angelina Andra Alanna
- **Anggota 3** - 13524096 - Moreno Syawali Ganda Sugita
