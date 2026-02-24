const THRESHOLD_SCORE = 86;

// Validated Section Item Codes
const SECTION_ITEMS = {
    'A': { codes: [759166, 759167, 759168, 759169, 759170, 759171], exclude: [] },
    'B': { codes: [759174, 759175, 759176, 759177, 759178, 759179], exclude: [] },
    'C': { codes: [759181, 759182, 759183, 759184, 759185, 759186, 759187, 759188, 759189, 759190, 759191, 759192], exclude: [] },
    'D': { codes: [759194, 759195, 759196, 759197, 759198, 759199, 759200, 759201], exclude: [] },
    'E': { codes: [759204, 759206, 759207, 759208, 759209, 759210, 759212, 759213, 759214, 759215], exclude: [] },
    'F': { codes: [759220, 759221, 759222, 759223, 759224, 759225, 759226, 759227, 759228], exclude: [759221] },
    'G': { codes: [759231, 759233, 759211, 759569, 759235, 759236, 759237, 759243, 759239], exclude: [759211] },
    'H': { codes: [759247, 759248, 759249, 759250, 759251, 759252, 759253, 759254, 759255, 759256, 759257, 759258, 759259, 759260, 759261, 759267, 759262, 759263, 759265, 759266], exclude: [] },
    'I': { codes: [759270, 759271, 759272, 759273, 759274, 759275, 759276, 759277], exclude: [] },
    'J': { codes: [759280, 759281, 759282, 759283, 759284], exclude: [759282, 759283] },
    'K': { codes: [759287, 759288, 759289], exclude: [] }
};

const TARGET_SECTIONS = [
    'A. Tampilan Tampak Depan Outlet', 'B. Sambutan Hangat Ketika Masuk ke Dalam Outlet',
    'C. Suasana & Kenyamanan Outlet', 'D. Penampilan Retail Assistant',
    'E. Pelayanan Penjualan & Pengetahuan Produk', 'F. Pengalaman Mencoba Produk',
    'G. Rekomendasi untuk Membeli Produk', 'H. Pembelian Produk & Pembayaran di Kasir',
    'I. Penampilan Kasir', 'J. Toilet (Khusus Store yang memiliki toilet )',
    'K. Salam Perpisahan oleh Retail Asisstant'
];

module.exports = {
    THRESHOLD_SCORE,
    SECTION_ITEMS,
    TARGET_SECTIONS
};
