# RupiahWatch — Dashboard Analisis Kekuatan Rupiah vs Mata Uang US & Asia

> Visualisasi interaktif pergerakan dan volatilitas Rupiah (IDR) terhadap US Dollar dan 6 mata uang Asia utama menggunakan data historis harian dari Frankfurter API (European Central Bank).

Demo: https://rupiah-watch.vercel.app/ ← 

## Isi Dashboard

- **KPI Cards** — Nilai kurs terkini tiap mata uang + animasi count-up + perubahan % 7 hari
- Chart 1: **Line Chart** — Tren pergerakan kurs 30 hari terakhir (dengan toggle per mata uang)
- Chart 2: **Bar Chart** — Perbandingan perubahan % mingguan tiap mata uang vs IDR
- Chart 3: **Scatter Plot** — Analisis volatilitas 30 hari vs nilai rata-rata (analisis risiko)
- **Insight Otomatis** — Ringkasan teks siapa yang menguat/melemah paling signifikan

- Fitur interaktif: Tooltip hover (semua chart) + Toggle dataset (Line Chart)
- Animasi: Entrance animation Chart.js + CSS fade-up KPI cards + Count-up angka KPI

## Sumber Data

- Nama dataset: Frankfurter Exchange Rates API
- URL sumber: https://www.frankfurter.app
- Penyedia asli: European Central Bank (ECB)
- Update: Setiap hari kerja (Senin–Jumat)

## Mata Uang yang Dianalisis

| Kode | Mata Uang           | Negara         |
|------|---------------------|----------------|
| USD  | Dolar Amerika       | Amerika Serikat |
| JPY  | Yen Jepang          | Jepang         |
| SGD  | Dolar Singapura     | Singapura      |
| MYR  | Ringgit Malaysia    | Malaysia       |
| THB  | Baht Thailand       | Thailand       |
| KRW  | Won Korea Selatan   | Korea Selatan  |

## Cara Jalankan di Lokal

```bash
# Jalur A (static) — paling mudah:
# Buka index.html langsung di browser (atau pakai Live Server di VS Code)

# Jalur B (dengan Live Server di VS Code):
# 1. Install ekstensi "Live Server" di VS Code
# 2. Klik kanan index.html → Open with Live Server
# 3. Buka http://127.0.0.1:5500
```

> Buka via Live Server atau server lokal, bukan double-click file (beberapa browser blokir fetch API untuk file://)


## Struktur File

```
rupiah-watch/
├── index.html   ← halaman utama dashboard
├── style.css    ← styling (dark terminal theme)
├── app.js       ← logika fetch data + rendering chart
└── README.md    ← dokumentasi ini
```

## Teknologi

- [Chart.js](https://www.chartjs.org/) — visualisasi data interaktif
- HTML5 + CSS3 + JavaScript (Vanilla)
- [Frankfurter API](https://www.frankfurter.app) — data kurs harian ECB
- [Vercel](https://vercel.com) — deployment (free tier)
- Font: Space Grotesk + JetBrains Mono (Google Fonts)

## Anggota Kelompok

- Nama Mochammad Rizki Firmansah (1203222083)
- Nama Ajax Amsterdamartama Januriel (1203230091)
- Nama Nicholas Aditya Ramadhani (1203230080)
- Nama Danendra Urdha Bhatu (1203230110)
