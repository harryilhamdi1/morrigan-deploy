const fs = require('fs');
const { parse } = require('csv-parse/sync');

const raw = fs.readFileSync('CSV/Wave 3 2024.csv', 'utf8');
const records = parse(raw, {
    delimiter: ';', columns: true, skip_empty_lines: true, trim: true, bom: true
});
const headers = Object.keys(records[0]);

const lookup = {
    'A': ['signage outlet', 'fasad tampak depan'],
    'B': ['kontak mata', 'menyapa', 'tersenyum tulus'],
    'C': ['area display produk', 'furniture dan mannequins', 'volume musik'],
    'D': ['memakai seragam', 'lanyard dan id card', 'tampilan wajah'],
    'E': ['mendengarkan dengan baik', 'informasikan ketersediaan', 'menjelaskan keunggulan'],
    'F': ['menawarkan pelanggan untuk mencoba', 'fitting room dalam keadaan bersih'],
    'G': ['menawarkan produk tambahan', 'aktivitas promosi', 'sudah memiliki member'],
    'H': ['metode pembayaran', 'kasir dalam posisi siap', 'mengkonfirmasi barang'],
    'I': ['penampilan kasir'], // Wait, text might be same as D? Usually distinct context
    'J': ['toilet dalam keadaan bersih'],
    'K': ['salam penutup']
};

console.log('=== REAL CODE MAPPING IN WAVE 3 CSV ===');

Object.keys(lookup).forEach(sec => {
    console.log(`\nSection ${sec} Search:`);
    const keywords = lookup[sec];
    const foundCodes = new Set();

    keywords.forEach(kw => {
        const found = headers.filter(h => h.toLowerCase().includes(kw.toLowerCase()));
        found.forEach(h => {
            const match = h.match(/^\((\d+)\)/);
            if (match) {
                foundCodes.add(parseInt(match[1]));
                // console.log(`  Found "${kw}": ${match[1]} -> ${h.substring(0,60)}...`);
            }
        });
    });

    const sorted = [...foundCodes].sort((a, b) => a - b);
    if (sorted.length > 0) {
        console.log(`  Codes Range: ${sorted[0]} - ${sorted[sorted.length - 1]} (Total ${sorted.length})`);
    } else {
        console.log(`  ⚠️ NO CODES FOUND for keywords: ${keywords.join(', ')}`);
    }
});
