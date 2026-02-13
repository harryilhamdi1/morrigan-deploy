const fs = require('fs');
const { parse } = require('csv-parse/sync');

const waveRaw = fs.readFileSync('CSV/Wave 3 2024.csv', 'utf8');
const records = parse(waveRaw, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const headers = Object.keys(records[0]);

// Manual Mapping based on HTML Report Analysis & CSV Inspection
// This list is derived from comparing Question Text in HTML vs CSV Headers
const manualMap = {
    'A': [ // 6 items
        'Signage outlet', 'Fasad tampak depan', 'Lampu signage',
        'tampilan window display', 'Area pintu masuk', 'Area parkir'
    ],
    'B': [ // 7 items
        'Nama & Foto Retail Assistant', // Text
        'melakukan kontak mata', 'tersenyum tulus', 'posisi tangan kanan',
        'menghampiri pelanggan', 'memberikan kesempatan'
        // Note: "Sapaan" sometimes merged/split? Let's check CSV
    ],
    'C': [ // 12 items
        'Area display produk', 'Lemari display', 'Volume musik', 'price tag',
        'Temperatur', 'Produk apparel', 'Penerangan dalam toko', 'Jalur jalan Pelanggan',
        'Dinding dan langit', 'TV yang menampilkan', 'Banner / Acrylic promo', 'materi promosi'
    ],
    // Skip D, E (usually fine)
    'F': [ // 9 items in HTML
        'menawarkan Pelanggan untuk mencoba', // Main Q?
        'menawarkan bantuan', // Extra?
        'memberikan tanggapan',
        'Fitting room dalam keadaan bersih',
        'tidak terdapat gantungan', 'Cermin terlihat bersih', 'sampah di lantai',
        'Pintu / Gordyn', 'Penerangan yang memadai'
    ],
    'G': [ // 10 items in HTML
        'menanyakan dengan sopan', 'meminta Pelanggan untuk mengecek',
        'menjelaskan cara perawatan',
        'menawarkan produk tambahan', // The multi-choice one!
        'aktivitas promosi', 'sudah memiliki member',
        'membantu memandu', 'menjelaskan perihal', 'manfaat member',
        'memberikan nomor transaksi'
    ],
    'J': [ // 5 items in CSV, 9 in HTML? No, 5 in HTML, 9 implied denominator
        // Actually HTML shows 5 items + 4 sub-items related to "Cleaning Checklist"?
        'Toilet dalam keadaan bersih', 'Closet, Flush', 'sabun cair',
        'tisue toilet', 'tempat sampah'
    ]
};

// Helper to find cols
const colMap = {};

Object.keys(manualMap).forEach(sec => {
    colMap[sec] = [];
    manualMap[sec].forEach(q => {
        // Find header containing this text
        const match = headers.find(h => h.toLowerCase().includes(q.toLowerCase()));
        if (match) {
            colMap[sec].push(match);
        } else {
            // console.log(`Missing col for: ${q}`);
        }
    });
});

// Sampling Function
const sampleIndices = [0, 4, 8]; // 3 stores

console.log('=== SAMPLING CALCULATION (DYNAMIC MAPPING) ===');

sampleIndices.forEach(idx => {
    const row = records[idx];
    console.log(`\nSTORE: ${row['Site Name']}`);

    // Process Sections
    ['A', 'F', 'G', 'J'].forEach(sec => {
        const cols = colMap[sec];

        let yes = 0;
        let no = 0;
        let total = 0;

        const details = [];

        cols.forEach(col => {
            const val = row[col];
            let score = 0;
            // Scoring Logic: Yes=1, No=0, Text with (1/1)=1, (0/1)=0
            if (!val) return;

            const lower = val.toLowerCase();
            if (lower.startsWith('yes') || val.includes('(1/1)') || val.includes('100.00')) {
                yes++; score = 1; total++;
            } else if (lower.startsWith('no') || val.includes('(0/1)') || val.includes('0.00')) {
                no++; score = 0; total++;
            }
            // Ignore pure text / N/A

            details.push(`${col.substring(0, 20)}...: ${score}`);
        });

        const myScore = total > 0 ? (yes / total) * 100 : 0;

        // Get CSV Score
        const csvCol = headers.find(h => h.includes(`(Section) ${sec}.`));
        const csvScore = parseFloat(row[csvCol] || 0);

        const match = Math.abs(myScore - csvScore) < 0.1;

        console.log(`  [${sec}] My: ${myScore.toFixed(2)}% (${yes}/${total}) vs CSV: ${csvScore.toFixed(2)}% ${match ? '✓' : '❌'}`);
        if (!match) {
            // console.log(`    Details: ${details.join(', ')}`);
        }
    });
});
