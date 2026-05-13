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
│
├── public/
│   ├── manifest.json          # Konfigurasi Chrome Extension (Manifest V3)
│   └── images/                # Icon extension
│
├── src/
│   ├── algorithms/
│   │   ├── kmp.ts             # Implementasi algoritma KMP
│   │   ├── boyer-moore.ts     # Implementasi algoritma Boyer-Moore
│   │   ├── regex.ts           # Implementasi Regex matching
│   │   └── weighted-levenshtein.ts  # Implementasi fuzzy matching
│   ├── content/
│   │   ├── content.ts         # Content script untuk scanning DOM
│   │   └── content.css        # Styles untuk highlight dan tooltip
│   ├── popup/
│   │   ├── popup.html         # HTML popup extension
│   │   ├── popup.css          # Styles popup
│   │   └── popup.ts           # Script popup
│   ├── utils/
│   │   ├── dom-utils.ts       # Helper manipulasi DOM
│   │   └── keyword-loader.ts  # Loader untuk keywords.txt
│   └── background.ts          # Background service worker
│
├── keywords/
│   └── keywords.txt           # Daftar kata kunci judol
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
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
| 1  | Extension berhasil di-build dan di-load tanpa kesalahan pada chromium browser dan dikembangkan dengan TypeScript             |    |       |
| 2  | KMP dan Boyer-Moore diimplementasikan from scratch                                                                           |    |       |
| 3  | Regex menghandle format `<kata><angka>` dan berbagai edge case                                                             |    |       |
| 4  | Pencarian KMP & BM membaca keyword.txt secara iteratif dan tidak menggunakan built-in search function atau library eksternal |    |       |
| 5  | Exact matching dan fuzzy matching berjalan benar                                                                             |    |       |
| 6  | Elemen DOM terdeteksi diberi highlight dan terhapus saat rescanning                                                          |    |       |
| 7  | Tooltip muncul saat hover dengan informasi keyword, algoritma, kemunculan, dan waktu eksekusi                                |    |       |
| 8  | Popup menampilkan statistik realtime (total keyword, perbandingan, waktu eksekusi, jumlah match)                             |    |       |
| 9  | [Bonus] Membuat Video                                                                                                        |    |       |
| 10 | [Bonus] Implementasi Algoritma Aho-Corasick dan Rabin Karp                                                                   |    |       |
| 11 | [Bonus] Implementasi Censorship / Blur Teks                                                                                  |    |       |
| 12 | [Bonus] Implementasi Optical Character Recognition pada Gambar                                                               |    |       |

## Author

Kelompok: **3Naga77**

- **Anggota 1** - NIM - Nama
- **Anggota 2** - NIM - Nama
- **Anggota 3** - NIM - Nama
