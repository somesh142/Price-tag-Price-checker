SRI MURUGAN TRADING — WEBSITE SETUP
=====================================

FOLDER STRUCTURE (upload ALL of these to Netlify):
----------------------------------------------------
/
├── data.js              ← Shared inventory loader — EDIT CSV URL HERE
├── inventory.csv        ← Your Cin7 export — replace this daily
├── index.html           ← Staff: Price Tag Printer
├── pc/
│   └── index.html       ← Customer: PC Total price check
├── cn/
│   └── index.html       ← Customer: CN Total price check
├── cd/
│   └── index.html       ← Customer: CD Total price check
└── ep/
    └── index.html       ← Customer: EP Total price check


YOUR URLS (replace "your-site" with your actual Netlify site name):
--------------------------------------------------------------------
Staff printer:    https://your-site.netlify.app/
PC customers:     https://your-site.netlify.app/pc
CN customers:     https://your-site.netlify.app/cn
CD customers:     https://your-site.netlify.app/cd
EP customers:     https://your-site.netlify.app/ep


STEP 1 — FIRST TIME SETUP:
---------------------------
1. Upload ALL files/folders to Netlify (drag the whole folder)
2. Open data.js and check line 8 — the CSV URL should be:
      const SMT_CSV_URL = './inventory.csv';
   This means it reads from the same Netlify site. No changes needed.
3. Open your staff printer URL and confirm it loads


STEP 2 — DAILY UPDATE (30 seconds):
-------------------------------------
1. Export CSV from Cin7 (Inventory → Products → Export → Inventory List)
2. Rename the file to:  inventory.csv
3. Go to Netlify dashboard → your site → Deploys tab
4. Drag and drop the new inventory.csv
5. Done — ALL pages (staff + all 4 customer pages) get fresh data automatically


HOW THE STAFF PRINTER WORKS:
------------------------------
1. Open https://your-site.netlify.app/
2. Inventory loads automatically
3. Click your location (PC Total / CN Total / CD Total / EP Total)
4. Start scanning products → add to queue → print
5. Python server must be running on the PC with the Epson printer


HOW THE CUSTOMER PAGES WORK:
------------------------------
- Each page shows prices for ONE location only
- Customer scans a barcode → product name + price appears instantly
- Auto-resets after 12 seconds
- Works on any device with a browser (tablet, PC, phone)


PRINTER SETUP (for staff page):
---------------------------------
1. Python must be installed on the printing PC
2. Run: python print_server.py  (from the tagprinter_py folder)
3. Keep that window open while printing
4. The web page connects to it automatically at localhost:44444
