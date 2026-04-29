/**
 * Sri Murugan Trading — Shared Inventory Loader
 * Supports both Excel (.xlsx) and CSV files.
 */

// ─── CONFIGURE THIS ───────────────────────────────────────────────────────────
const SMT_CSV_URL = './inventory.xlsx';  // ← your Excel file name
const SMT_STORE   = 'Sri Murugan Trading';
const SMT_PREFIX  = '$';
const SMT_CURRENCY= 'AUD';
// ─────────────────────────────────────────────────────────────────────────────

// Location definitions
const SMT_LOCATIONS = {
  pc: { name: 'PC Total',  col: null, icon: '🏪' },
  cn: { name: 'CN Total',  col: null, icon: '🏬' },
  cd: { name: 'CD Total',  col: null, icon: '🏢' },
  ep: { name: 'EP Total',  col: null, icon: '🏭' },
};

let SMT_COLS = {
  name: '', sku: '',
  barcode: '', barcode2: '', barcode3: '', barcode4: '',
  pc: '', cn: '', cd: '', ep: '',
};

let SMT_PRODUCTS = [];
let SMT_LOADED   = false;

// ── Column auto-detector ──────────────────────────────────────────────────────
function smtDetectCols(hdrs) {
  const lc = hdrs.map(h => String(h).toLowerCase());
  const find = (...kws) => {
    for (const kw of kws) {
      const i = lc.findIndex(c => c.includes(kw));
      if (i >= 0) return hdrs[i];
    }
    return '';
  };
  SMT_COLS = {
    name:     find('product name', 'name', 'product', 'item', 'description'),
    sku:      find('sku', 'item code', 'product code', 'code'),
    barcode:  find('barcode 1', 'barcode1', 'barcode', 'ean', 'upc'),
    barcode2: find('barcode 2', 'barcode2', 'ean2'),
    barcode3: find('barcode 3', 'barcode3', 'ean3'),
    barcode4: find('barcode 4', 'barcode4', 'ean4'),
    pc:       find('pc total', 'pc price', 'price tier 1', 'sell price', 'retail price', 'price'),
    cn:       find('cn total', 'cn price', 'price tier 2'),
    cd:       find('cd total', 'cd price', 'price tier 3'),
    ep:       find('ep total', 'ep price', 'price tier 4'),
  };
  ['pc','cn','cd','ep'].forEach(k => { SMT_LOCATIONS[k].col = SMT_COLS[k]; });
}

// ── CSV Parser ────────────────────────────────────────────────────────────────
function smtParseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const parseRow = line => {
    const r = []; let c = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { q = !q; }
      else if (ch === ',' && !q) { r.push(c.trim()); c = ''; }
      else { c += ch; }
    }
    r.push(c.trim()); return r;
  };
  const hdrs = parseRow(lines[0]);
  smtDetectCols(hdrs);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseRow(line), obj = {};
    hdrs.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '').trim(); });
    return obj;
  });
}

// ── Excel Parser (uses SheetJS from CDN) ─────────────────────────────────────
async function smtParseExcel(arrayBuffer) {
  // Load SheetJS if not already loaded
  if (typeof XLSX === 'undefined') {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const wb   = XLSX.read(arrayBuffer, { type: 'array' });
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  if (!rows.length) return [];
  const hdrs = Object.keys(rows[0]);
  smtDetectCols(hdrs);
  return rows;
}

// ── Load inventory (auto-detects Excel or CSV) ────────────────────────────────
async function smtLoadInventory(statusEl) {
  const url = SMT_CSV_URL + '?_=' + Date.now();
  if (statusEl) { statusEl.textContent = '⏳ Loading inventory…'; statusEl.style.color = '#60a5fa'; }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const isExcel = /\.(xlsx|xls|xlsm)$/i.test(SMT_CSV_URL);

    if (isExcel) {
      const buf = await res.arrayBuffer();
      SMT_PRODUCTS = await smtParseExcel(buf);
    } else {
      const text = await res.text();
      if (!text.trim()) throw new Error('File is empty');
      SMT_PRODUCTS = smtParseCSV(text);
    }

    SMT_LOADED = true;
    if (statusEl) { statusEl.textContent = '✓ ' + SMT_PRODUCTS.length + ' products loaded'; statusEl.style.color = '#22c55e'; }
    return true;
  } catch(e) {
    SMT_LOADED = false;
    if (statusEl) { statusEl.textContent = '✗ ' + e.message; statusEl.style.color = '#ef4444'; }
    console.error('SMT inventory load error:', e);
    return false;
  }
}

// ── Find product by barcode / SKU ─────────────────────────────────────────────
function smtFind(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return null;
  return SMT_PRODUCTS.find(r => (
    String(r[SMT_COLS.sku]      || '').toLowerCase() === q ||
    String(r[SMT_COLS.barcode]  || '').toLowerCase() === q ||
    String(r[SMT_COLS.barcode2] || '').toLowerCase() === q ||
    String(r[SMT_COLS.barcode3] || '').toLowerCase() === q ||
    String(r[SMT_COLS.barcode4] || '').toLowerCase() === q
  )) || null;
}

// ── Search (partial match on name / SKU / barcode) ────────────────────────────
function smtSearch(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return SMT_PRODUCTS.filter(r => {
    const nm  = String(r[SMT_COLS.name]     || '').toLowerCase();
    const sku = String(r[SMT_COLS.sku]      || '').toLowerCase();
    const bc1 = String(r[SMT_COLS.barcode]  || '').toLowerCase();
    const bc2 = String(r[SMT_COLS.barcode2] || '').toLowerCase();
    const bc3 = String(r[SMT_COLS.barcode3] || '').toLowerCase();
    const bc4 = String(r[SMT_COLS.barcode4] || '').toLowerCase();
    return nm.includes(q) || sku.includes(q) || bc1.includes(q) || bc2.includes(q) || bc3.includes(q) || bc4.includes(q);
  });
}

// ── Format price ──────────────────────────────────────────────────────────────
function smtPrice(product, locKey) {
  const col = SMT_COLS[locKey];
  if (!col) return '—';
  const n = parseFloat(String(product[col] || '0').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? '—' : n.toFixed(2);
}


// Location definitions
const SMT_LOCATIONS = {
  pc: { name: 'PC Total',  col: null, icon: '🏪' },
  cn: { name: 'CN Total',  col: null, icon: '🏬' },
  cd: { name: 'CD Total',  col: null, icon: '🏢' },
  ep: { name: 'EP Total',  col: null, icon: '🏭' },
};

// Detected column map (filled after CSV is parsed)
let SMT_COLS = {
  name: '', sku: '',
  barcode: '', barcode2: '', barcode3: '', barcode4: '',
  pc: '', cn: '', cd: '', ep: '',
};

let SMT_PRODUCTS = [];
let SMT_LOADED   = false;

// ── CSV Parser ────────────────────────────────────────────────────────────────
function smtParseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const parseRow = line => {
    const r = []; let c = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { q = !q; }
      else if (ch === ',' && !q) { r.push(c.trim()); c = ''; }
      else { c += ch; }
    }
    r.push(c.trim());
    return r;
  };

  const hdrs = parseRow(lines[0]);
  const lc   = hdrs.map(h => h.toLowerCase());

  const find = (...kws) => {
    for (const kw of kws) {
      const i = lc.findIndex(c => c.includes(kw));
      if (i >= 0) return hdrs[i];
    }
    return '';
  };

  SMT_COLS = {
    name:     find('product name', 'name', 'product', 'item', 'description'),
    sku:      find('sku', 'item code', 'product code', 'code'),
    barcode:  find('barcode 1', 'barcode1', 'barcode', 'ean', 'upc'),
    barcode2: find('barcode 2', 'barcode2', 'ean2'),
    barcode3: find('barcode 3', 'barcode3', 'ean3'),
    barcode4: find('barcode 4', 'barcode4', 'ean4'),
    pc:       find('pc total', 'pc price', 'price tier 1', 'sell price', 'retail price', 'price'),
    cn:       find('cn total', 'cn price', 'price tier 2'),
    cd:       find('cd total', 'cd price', 'price tier 3'),
    ep:       find('ep total', 'ep price', 'price tier 4'),
  };

  // Map location cols
  ['pc','cn','cd','ep'].forEach(k => {
    SMT_LOCATIONS[k].col = SMT_COLS[k];
  });

  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseRow(line);
    const obj  = {};
    hdrs.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '').trim(); });
    return obj;
  });
}

// ── Load inventory ────────────────────────────────────────────────────────────
async function smtLoadInventory(statusEl) {
  const url = SMT_CSV_URL + '?_=' + Date.now();
  if (statusEl) { statusEl.textContent = '⏳ Loading inventory…'; statusEl.style.color = '#60a5fa'; }
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    if (!text.trim()) throw new Error('File is empty');
    SMT_PRODUCTS = smtParseCSV(text);
    SMT_LOADED   = true;
    if (statusEl) { statusEl.textContent = '✓ ' + SMT_PRODUCTS.length + ' products loaded'; statusEl.style.color = '#22c55e'; }
    return true;
  } catch(e) {
    SMT_LOADED = false;
    if (statusEl) { statusEl.textContent = '✗ ' + e.message; statusEl.style.color = '#ef4444'; }
    console.error('SMT inventory load error:', e);
    return false;
  }
}

// ── Find product by barcode / SKU ─────────────────────────────────────────────
function smtFind(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return null;
  return SMT_PRODUCTS.find(r => {
    return (
      String(r[SMT_COLS.sku]      || '').toLowerCase() === q ||
      String(r[SMT_COLS.barcode]  || '').toLowerCase() === q ||
      String(r[SMT_COLS.barcode2] || '').toLowerCase() === q ||
      String(r[SMT_COLS.barcode3] || '').toLowerCase() === q ||
      String(r[SMT_COLS.barcode4] || '').toLowerCase() === q
    );
  }) || null;
}

// ── Search products (name / SKU / barcode partial) ────────────────────────────
function smtSearch(query, locKey) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return [];
  return SMT_PRODUCTS.filter(r => {
    const nm  = String(r[SMT_COLS.name]     || '').toLowerCase();
    const sku = String(r[SMT_COLS.sku]      || '').toLowerCase();
    const bc1 = String(r[SMT_COLS.barcode]  || '').toLowerCase();
    const bc2 = String(r[SMT_COLS.barcode2] || '').toLowerCase();
    const bc3 = String(r[SMT_COLS.barcode3] || '').toLowerCase();
    const bc4 = String(r[SMT_COLS.barcode4] || '').toLowerCase();
    return nm.includes(q) || sku.includes(q) || bc1.includes(q) || bc2.includes(q) || bc3.includes(q) || bc4.includes(q);
  });
}

// ── Format price ──────────────────────────────────────────────────────────────
function smtPrice(product, locKey) {
  const col = SMT_COLS[locKey];
  if (!col) return '—';
  const n = parseFloat(String(product[col] || '0').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? '—' : n.toFixed(2);
}
