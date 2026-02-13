# Visual Analysis Findings: Morrigan HTML Report

Documenting findings from visual inspection of report screenshots to validate scoring logic against CSV data.

## 📸 visual_evidence_1: Section Summary (Final Grade)
- **Store:** ST EG BANTUL (Matches "Full review report 2.html")
- **Final Grade:** 83.79
- **Structure:**
  - Section scores are listed with `Weight`, `Grade`, and `(Points Earned/Max Points)`.
  - **Crucial Finding:** The fraction `(x/y)` (e.g., `(16/20)` in Section E) represents **Weighted Points**, NOT question counts.
  - Section K is marked "Not filled", reducing Total Weight from 100 to 95.

## 📸 visual_evidence_2: Section A (Tampilan Tampak Depan)
- **Grade:** 100.00 (Weight 4)
- **Displayed Items:** 6 Items.
- **Scoring Details:**
  1. Signage: Yes (1/1)
  2. Fasad: Yes (1/1)
  3. [Stand Alone] Lampu: Yes (1/1)
  4. Window Display: Yes (1/1)
  5. Pintu Masuk: Yes (1/1)
  6. [Stand Alone] Area Parkir: Yes (1/1)
- **Total Scored Items:** 6
- **Calculation:** 6/6 = 100%.
- **Observation:** Even "[Khusus outlet stand alone]" items are scored (1/1), implying they count towards the grade if the store type matches (or are defaulted to Yes).

## 📸 visual_evidence_3: Section B (Sambutan Hangat)
- **Grade:** 60.00 (Weight 9)
- **Points Display:** (5/9) -> Indicates 60% of 9 = 5.4 (Rounded to 5).
- **Displayed Items:** 7 Items.
- **Scoring Breakdown:**
  1. Name & Photo: Text Only (Ignored).
  2. Kontak Mata: Yes (1/1).
  3. Menyapa: No (0/1).
  4. Tersenyum: Yes (1/1).
  5. **Posisi Tangan**: status **N/A** -> **EXCLUDED** from denominator.
  6. Menghampiri: No (0/1).
  7. Memberikan Kesempatan: Yes (1/1).
- **Calculation:** 
  - Total Scored Items: 5 (Exclude Name & N/A).
  - Yes Count: 3.
  - Score: 3/5 = 60.00%.
- **Validation:** Matches Report Grade perfectly. Confirms that `N/A` items are dynamically removed from the denominator.


## 📸 visual_evidence_4: Section C (Suasana & Kenyamanan)
- **Grade:** 100.00 (Weight 8)
- **Displayed Items:** 12 Items.
- **Scoring Breakdown:** All 12 items (Display area, Lemari, Musik, Price tag, Suhu, Apparel, Penerangan, Jalur jalan, Dinding/Langit, TV, Banner kondisi, Banner materi) allow scoring.
- **Result:** 12/12 Yes.
- **Calculation:** 100%. Matches Report.
- ** Insight:** Confirms equal weighting for all ambiance factors, from music volume to banner condition. No hidden weighting detected here.

## 📸 visual_evidence_5: Section D (Penampilan RA)
- **Grade:** 100.00 (Weight 5)
- **Displayed Items:** 8 Items (Seragam, Lanyard, Wajah, Sepatu, Rambut, Jari, Bau, Tato).
- **Result:** 8/8 Yes.
- **Calculation:** 100%. Matches Report `(5/5)`.
- **Insight:** Standard scoring. All grooming attributes are weighted equally. No hidden items.

## 📸 visual_evidence_6: Section E (Pelayanan Penjualan)
- **Grade:** 80.00 (Weight 20)
- **Displayed Rows:** 12.
- **Text Only (Ignored):** 2 items (Question & Answer text).
- **Scored Items:** 10 items.
- **Failures:**
  1. "Jika produk kosong..." -> Result: (0/1) No. Label: **Calculated result**.
  2. "Menjelaskan keunggulan spontan" -> Result: No (0/1).
- **Calculation:** 8 Yes / 10 Total = 80.00%. Matches Report `(16/20)` points.
- **Key Insight:** The "Calculated result" item confirms some scores are aggregates of hidden sub-questions, but in the final report, they appear as a single scored line item.

## 📸 visual_evidence_7: Section F (Pengalaman Mencoba Produk)
- **Grade:** 100.00 (Weight 11)
- **Displayed Items:** 9 Items.
- **Scoring Breakdown:** 
  - Item 1: "Menawarkan mencoba" -> **Yes (1/1)**.
  - Item 2: "Menawarkan bantuan" -> **N/A**.
  - All other items: **Yes (1/1)**.
- **Calculation:** 8 Yes / 8 Scored Items (Excluding Item 2) = 100.00%.
- **MAJOR DISCOVERY:** This confirms the **Conditional Logic**. Since the first item (Offering to try) was YES, the second item (Offering help to try) was automatically marked **N/A** and excluded from the denominator.
- **Validation:** Matches Report Grade precisely. This is the logic we must replicate for accurate item-level reporting.

## 📸 visual_evidence_8: Section G (Rekomendasi untuk Membeli Produk)
- **Grade:** 66.67 (Weight 15)
- **Points Display:** (10/15) -> 66.67% of 15 = 10.
- **Displayed Items:** 9 Items.
- **Scoring Breakdown:**
  - 6 items scored (Yes/No).
  - 3 items marked **N/A** (Items 7, 8, 9 - Member registration details).
- **Calculation:** 4 Yes / 6 Scored = 66.67%.
- **Validation:** Matches Report Grade perfectly.
- **Observation:** Confirms that items related to "If customer NOT a member" are skipped (N/A) if the customer is already a member, adjusting the denominator from 9 down to 6.

## 📸 visual_evidence_9: Section H (Pembelian Produk & Pembayaran di Kasir)
- **Grade:** 80.00 (Weight 14)
- **Points Display:** (11/14) -> 80% of 14 = 11.2 (Rounded to 11).
- **Displayed Rows:** 23.
- **Scoring Analysis:**
  - **Text Only (Excluded):** 3 items (Payment method, Cashier name, Time taken).
  - **N/A Logic (Excluded):** 5 items. Specifically, branching logic works: because payment was "E-Wallet", the "Cash Payment" items are marked N/A.
  - **Total Scored Items:** 15.
  - **Yes Count:** 12.
  - **No Count:** 3 (Greeting, Closing script, Closing gesture).
- **Calculation:** 12 Yes / 15 Scored = 80.00%.
- **Validation:** Matches Report Grade perfectly.
- **Key Discovery:** Data points like "Transaction Time" are collected but **assigned 0 weight** (not counted in denominator), while situational logic (Cash vs Non-cash) successfully adjusts the denominator.

## 📸 visual_evidence_10: Section I (Penampilan Kasir)
- **Grade:** 100.00 (Weight 5)
- **Points Display:** (5/5).
- **Displayed Items:** 8 Items (Identical attributes to Section D).
- **Scoring Analysis:**
  - 7 items marked **Yes (1/1)**.
  - 1 item marked **N/A** (Tato/Tindik).
- **Calculation:** 7 Yes / 7 Scored = 100.00%.
- **Validation:** Matches Report Grade perfectly.
- **Insight:** Consistent behavior with Section D. N/A items are excluded, ensuring the section score remains 100% if all applicable items are passed.

## 📸 visual_evidence_11: Section J (Toilet) - THE GOLDEN DISCOVERY 🏆
- **Grade:** 100.00 (Weight 4)
- **Points Display:** (4/4).
- **Displayed Items:** 5 Items.
- **CRITICAL VISUAL FINDING:**
  - Items 1, 2, 3, 5: Clearly show `100.00` points and `(1/1)` status.
  - **Item 4 (Tisue Toilet):** Only shows the text `"Yes"` without any points or bar graph.
- **Calculation:** 
  - Total Scored Items: **4** (Item 4 is ignored).
  - Yes Count: 4.
  - Score: 4/4 = 100.00%.
- **Final Conclusion for Section J:** The item "Tisue toilet" is **Informational/Text only** and does NOT count towards the grade. This explains all previous calculation mismatches where we used 5 as the denominator.
- **Validation:** Matches Report Grade perfectly.

## 📸 visual_evidence_12: Section K (Salam Perpisahan oleh RA)
- **Status:** **Not filled / N/A**.
- **Observation:** All 3 items are marked N/A because "Retail Assistant was busy serving other customers".
- **Result:** This section is completely omitted from the final score calculation for this store.
- **Validation:** Matches the "Not filled" status on the Summary Page.











---
*Waiting for next sections...*
