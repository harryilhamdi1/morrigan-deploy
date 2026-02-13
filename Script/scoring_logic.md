# Scoring Logic Documentation
## ESS Retail In Depth Analysis - Morrigan Report

> Last Updated: 2026-02-13

---

## 1. Data Structure Overview

### Source Files
| File | Purpose |
|---|---|
| `CSV/Wave X YYYY.csv` | Raw assessment data per wave per store |
| `CSV/Scorecard.csv` | Master list of 94 assessment questions (3 columns: No, Section, Journey) |
| `CSV/Section Weight.csv` | Weight per section (11 sections, total = 100) |
| `CSV/Master Site Morrigan.csv` | Store metadata (Region, Branch, Site Name, City) |

### Data Columns in Wave CSV
- **Columns A-E**: Metadata (Review number, Site Code, Site Name, Branch, Regional)
- **Columns F-P**: Section aggregate scores (A through K) — pre-calculated by surveyor system
- **Column Q**: Final Score — pre-calculated by surveyor system
- **Columns R onwards**: Individual question responses (Yes/No/N/A), metadata, and text fields

---

## 2. Scoring Hierarchy

```
Level 1: Item/Question (Yes/No/N/A)
    ↓ aggregated by surveyor system into...
Level 2: Section Score (0-100, Columns F-P)
    ↓ aggregated by our Weighted formula into...
Level 3: Final Store Score (0-100)
```

---

## 3. Level 1: Item Scoring (Done by Surveyor System)

Each question has a binary answer:
- **Yes** = 1 point (displayed as `100.00` or `(1/1) Yes`)
- **No** = 0 points (displayed as `0.00` or `(0/1) No`)
- **N/A** = Excluded from calculation (not counted in numerator OR denominator)

### Section Score Formula (Surveyor System)
```
Section Score = (Count of "Yes" / (Count of "Yes" + Count of "No")) * 100
```
> N/A items are completely ignored — they do not reduce the score.

### Special Cases
- **Multi-choice questions** (e.g., 759569): May have partial scores (not strictly 0/1)
- **Conditional questions** (e.g., "[Jika BELUM member]..."): Evaluated only if condition applies
- **Calculated sub-results**: Some groups of items produce an intermediate grade

### Known Quirks
- Question code `(851718)` in Scorecard = same as `(759179)` in Wave CSV data (text identical, code changed)
- 16 metadata columns exist in Wave CSV that are NOT scored (location, visit period, staff photos, etc.)

---

## 4. Level 2: Section Weights

| Section | Weight |
|---|---|
| A. Tampilan Tampak Depan Outlet | 4 |
| B. Sambutan Hangat Ketika Masuk ke Dalam Outlet | 9 |
| C. Suasana & Kenyamanan Outlet | 8 |
| D. Penampilan Retail Assistant | 5 |
| E. Pelayanan Penjualan & Pengetahuan Produk | 20 |
| F. Pengalaman Mencoba Produk | 11 |
| G. Rekomendasi untuk Membeli Produk | 15 |
| H. Pembelian Produk & Pembayaran di Kasir | 14 |
| I. Penampilan Kasir | 5 |
| J. Toilet (Khusus Store yang memiliki toilet) | 4 |
| K. Salam Perpisahan oleh Retail Assistant | 5 |
| **TOTAL** | **100** |

---

## 5. Level 3: Final Score Calculation (Our Logic)

### Formula
```
Earned Points = Sum of ( (Section Score / 100) * Section Weight )
Max Points    = Sum of ( Section Weight )   ← only for sections that HAVE a value
Final Score   = (Earned Points / Max Points) * 100
```

### N/A Section Handling
If a section has **no value** (empty cell in CSV), it is treated as N/A:
- Its weight is **excluded** from `Max Points`
- This prevents unfair score reduction

### Example
```
Section A: Score 100  (Weight 4)  → Earned = (100/100) * 4 = 4.00
Section B: Score 80   (Weight 9)  → Earned = (80/100)  * 9 = 7.20
Section C: EMPTY      (Weight 8)  → IGNORED
Section D: Score 100  (Weight 5)  → Earned = (100/100) * 5 = 5.00

Total Earned  = 4.00 + 7.20 + 5.00 = 16.20
Total Max     = 4 + 9 + 5          = 18  (Weight 8 excluded)
Final Score   = (16.20 / 18) * 100  = 90.00
```

### Division by Zero Protection
If ALL sections are empty (Max Points = 0), Final Score defaults to `0`.

---

## 6. Sanity Check Results (2026-02-13)

### Final Score Validation (Weighted Calc vs CSV Column Q) — 5/5 ✅
| Store | CSV Final Score | Our Calculation | Diff | Weight Used |
|---|---|---|---|---|
| 2189 - Rangkas Bitung | 83.27 | 83.27 | 0.00 ✅ | 100/100 |
| 2334 - Bkt Darmo Surabaya | 85.60 | 85.60 | 0.00 ✅ | 100/100 |
| 7011 - Indramayu | 84.51 | 84.51 | 0.00 ✅ | 100/100 |
| 2024 - Cak Doko Kupang | 64.78 | 64.78 | 0.00 ✅ | 95/100 |
| 7043 - Ternate | 89.27 | 89.27 | 0.00 ✅ | 90/100 |

### Section Score Validation (Item Yes/No Count vs CSV Section Score)

**Sections that MATCH perfectly (all 5 stores):**
A, B, C, D, H, I, K → Our manual Yes/No item count produces identical scores.

**Sections with MISMATCH:**

| Section | Root Cause | Detail |
|---|---|---|
| **E** (Pelayanan) | Grouped/calculated items | Implied denominator sometimes differs by 1. Likely a grouped sub-item contributes as a "calculated result" (see Sample Scoring `PR` code). Mismatch: ~1-3 points. |
| **F** (Fitting Room) | Grouped items | 9 items in Scorecard, but CSV implies denominator of 8. Two items (759221 + 759222) may be grouped into one "calculated result" by the surveyor. Mismatch: ~1-10 points. |
| **G** (Rekomendasi) | Multi-choice `PT` item | Code `759569` ("menawarkan produk tambahan") is a multi-choice item with `Multiple choice result`. In Wave CSV this appears as text (e.g., `"Tidak menawarkan salah satu di atas (0.00)"`) with embedded score. This extra item contributes to section G score but is NOT a simple Yes/No. Mismatch: ~0-17 points. |
| **J** (Toilet) | Hidden sub-items | 5 items in Scorecard but CSV implied denominator = 9. The surveyor system likely has additional Toilet sub-questions (e.g., kondisi wastafel, cermin, lantai) that are NOT exported as separate columns. Mismatch: ~6-27 points. |

---

## 7. Item-Level Data Strategy

### For Our Deep Analysis Report, we use a DUAL approach:

**Approach 1: Section Score (Authoritative)**
- Use CSV Section Scores (Columns F-P) as the **authoritative** section score
- These are pre-calculated by the surveyor system with full internal logic
- Used for: Final Score calculation, Section-level comparisons, trend charts

**Approach 2: Item Detail (Analytical)**
- Parse individual Yes/No/N/A items from Wave CSV columns
- Used for: Sub-item gap analysis, identifying specific failure points
- **Note**: Our item count may not perfectly reproduce the CSV Section Score due to:
  - Multi-choice items (text answers with embedded scores)
  - Grouped/calculated sub-results
  - Hidden Toilet sub-items

### Multi-Choice Item Handling
Two known multi-choice items with embedded scores in text answers:

| Code | Question | Section | Answer Format |
|---|---|---|---|
| `759569` | "RA menawarkan produk tambahan" | G | `"Menawarkan produk lain... (100.00)"` or `"Tidak menawarkan... (0.00)"` |
| `759209` | "Jika produk kosong, cantumkan hal-hal..." | E | `"N/A karena stok tersedia"` or multi-option text |

**Extraction logic**: Parse score from `(XX.XX)` pattern in answer text.

### Non-Scoring Items (Qualitative Data)
16 metadata columns are excluded from scoring but captured for qualitative analysis:
- `759151` Lokasi Store
- `759173` Nama & Foto RA  
- `759203` Pertanyaan Pelanggan
- `759205` Jawaban RA
- `759565` Manfaat member yang dijelaskan  
- `759245` Metode pembayaran
- `759246` Nama Kasir
- `759264` Lama transaksi
- `759291` Feedback umum (Voice of Customer)
- And others (visit period, schedule, staff count, etc.)

---

## 8. Sample Scoring CSV Structure

File `CSV/Sample Scoring.csv` contains the raw scoring form for one store visit:

| Column | Description |
|---|---|
| Order | Display order in form (1-147) |
| Question code | Sequential number within section (NOT global 759xxx code) |
| Question | Full question text |
| Answer | Yes / No / N/A / (empty for text) |
| Answer value | 100.00 (Yes) / 0.00 (No) / empty (N/A/text) |
| Details | Qualitative notes from assessor |
| Multiple choice result | Score for multi-option questions (e.g., 100) |

### Key insight from Sample Scoring:
- Multi-choice items (PR, PT codes) produce `Multiple choice result` scores
- These are **separate calculated items** that contribute to section scores
- In Wave CSV, they appear as a single text column (not Yes/No)

---

## 9. Data Pipeline

```
[CSV Files] → generate_report_v4.js → [ESS Retail In Depth Analysis.html]
                    │
                    ├── loadSectionWeights()     ← reads Section Weight.csv
                    ├── loadMasterData()         ← reads Master Site Morrigan.csv
                    ├── processWave() x5         ← reads each Wave CSV
                    │       ├── Section Scores   ← from CSV columns F-P (authoritative)
                    │       ├── Item Details      ← parsed from individual question columns
                    │       └── calculateWeightedScore()  ← applies weighted formula
                    └── generateHTML()           ← builds final HTML report
```

