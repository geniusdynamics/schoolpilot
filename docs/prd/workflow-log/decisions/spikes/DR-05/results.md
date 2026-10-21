# DR-05 spike results — report card and statement printing

**Date:** 2026-10-21 · **Task:** P2-D01 · **Machine:** Intel Core i7-8550U (4C/8T), 23.9 GiB RAM, Windows 11 Pro 10.0.22631 x64
**Runtime:** Node v24.21.0 · Chromium 140.0.7339.16 (Playwright 1.54) · Python 3.11.9
**Artefacts:** [`report-spike.html`](./report-spike.html) (the spike), [`results.json`](./results.json) (the numbers below in machine-readable form)

The spike renders the pack-defined blocks of spec 03 §8.1 from one HTML source:

- a **term report card** for 30 learners, in en and ar, A4 portrait, A5 portrait and A4 landscape;
- a **fee statement** with 40 ledger rows over two pages, repeated table headers and a totals/signature block.

Both use the print-CSS baseline proposed in [DR-05](../DR-05.md). Query parameters select the variant:
`?doc=cards|statement&size=A4|A5&orientation=portrait|landscape&cols=full|min&lang=en|ar&n=<count>`
(plus `furniture=fixed` and `marginbox=1`, which reproduce the two rejected page-furniture variants).

No repository dependency was added. Chromium is the Playwright browser already installed for `test:e2e`.
The PDF inspection tools (pypdf, pypdfium2, zxing-cpp, segno, fonttools) ran from a throwaway virtualenv under
`%TEMP%`; they are measurement instruments, not product dependencies, and nothing from them is committed.

## Commands

The driver was run inline with `node -` (no script is committed, per the task rule). This is the exact driver body;
`VARIANTS` is the list in the next section.

```js
const { chromium } = require('@playwright/test');
const fs = require('fs'); const path = require('path');
const FILE = 'file:///…/spikes/DR-05/report-spike.html';
const OUT = path.join(process.env.TEMP, 'dr05');
(async () => {
  const browser = await chromium.launch();
  for (const { id, q } of VARIANTS) {
    const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
    const t0 = Date.now();
    await page.goto(FILE + q);
    await page.evaluate(() => window.__ready);          // fonts loaded + two rAFs
    const readyMs = Date.now() - t0;
    const stats = await page.evaluate(() => window.__stats());
    const runs = [];
    for (let i = 0; i < 3; i++) {
      const t = Date.now();
      const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
      runs.push({ ms: Date.now() - t, bytes: pdf.length });
      if (i === 0) fs.writeFileSync(path.join(OUT, id + '.pdf'), pdf);
    }
    console.log(id, readyMs, stats, runs);
    await page.close();
  }
  await browser.close();
})();
```

| # | Command | Purpose |
| --- | --- | --- |
| 1 | `node -` with the driver above | render, time and save 9 PDFs |
| 2 | `pnpm exec vite` not used | the page is `file://`; no dev server, no app state |
| 3 | `python -c` with pypdf | page count, page boxes, fonts, text extraction, statement rows |
| 4 | `python -c` with pypdfium2 + zxing-cpp | rasterise PDF pages at 150 DPI and decode the QR |
| 5 | `python -m fontTools.varLib.instancer inter-latin-wght-normal.woff2 wght=400 -o inter-400.ttf` | static cut for the font test |
| 6 | `esbuild.buildSync(stdin, {minify:true})` + `zlib.gzipSync` | QR encoder and CSS byte cost |
| 7 | Bundlephobia `GET /api/size?package=<name>` (2026-10-21) | rejected library bundle sizes |

## 1. Print pipeline cost — 30 learners, one card per page

`ready` is navigation + font load + DOM render. `render`/`layout` are `performance.now()` inside the page around the
`innerHTML` assignment and the first forced layout. `pdf` is three consecutive `page.pdf()` calls; the first is cold.

| Variant | Pages | ready ms | render ms | layout ms | `page.pdf()` ms (3 runs) | PDF bytes |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| A4 portrait, 30 cards | 30 | 1082 | 305.6 | 401.9 | 2945 / 1091 / 1156 | 1,152,192 |
| A4 portrait, 1 card | 1 | 348 | 24.0 | 194.1 | 1871 / 134 / 128 | 312,435 |
| A4 portrait, 30 cards, ar (RTL) | 30 | 1309 | 346.8 | 593.6 | 3512 / 1370 / 1662 | 1,212,235 |
| A4 landscape, 30 cards | **60** | 1168 | 348.1 | 433.6 | 3652 / 1296 / 1330 | 1,029,985 |
| A5 portrait, 30 cards | **60** | 1092 | 300.1 | 396.4 | 3580 / 1438 / 1317 | 986,398 |
| A5 portrait, 30 cards, reduced columns | **60** | 1007 | 319.5 | 413.4 | 3397 / 1132 / 1184 | 938,988 |
| A4 statement, 40 rows | 2 | 377 | 61.0 | 182.5 | 1559 / 219 / 145 | 258,004 |
| A4 statement, fixed footer variant | 2 | 514 | 65.8 | 256.9 | 1711 / 279 / 135 | 255,811 |
| A4 statement, extra `@bottom-center` | 2 | 457 | 68.1 | 189.7 | 1864 / 147 / 435 | 270,852 |

Readings:

- **Warm print cost is ~36 ms/page** (1.09–1.16 s for 30 pages, 128–134 ms for one page on this 2017 ultrabook).
  The cold call (2.9 s) is Chrome's print-pipeline start-up, paid once per print job, not per page.
- **The preview is fast**: 0.31 s DOM + 0.40 s layout for 30 cards, 1.08 s including navigation and webfont load.
  P0-F05 measured 970 ms for 40 cards; this is consistent.
- **Page boxes come from CSS**: A4 = 209.9 × 297.0 mm, A5 = 148.2 × 209.9 mm, landscape swaps them.
  The 0.1 mm difference from the nominal size is Chromium's point conversion (595.2 pt vs 595.28 pt), not a layout error.
- **`preferCSSPageSize: true` is required in headless**, otherwise Playwright's default Letter page wins. In a browser
  print dialog the CSS size is used by default.
- A5 and A4 landscape both produce **two pages per learner** for the full block set. This is a content-fit problem, not
  a print-pipeline problem (section 3).

## 2. Fidelity: fonts, text, QR, images

| Variant | Font objects in PDF | Embedded font programmes | Text | `/Image` XObjects | QR decoded at 150 DPI |
| --- | --- | --- | ---: | ---: | --- |
| A4 cards, app font (Inter **Variable** woff2) | **1080 Type3** (36/page) | none (`/Type3` glyph procedures) | 1,923 chars p1 | 0 | p1–p3 decode |
| A4 cards, **static** Inter 400 cut | **60 Type0** (2/page) | `/AAAAAA+Inter-Regular` `/FontFile2` | 1,923 chars p1 | 0 | — |
| A4 cards, ar | 810 Type3 + 180 Type0 | `/BAAAAA+Tahoma`, `/GAAAAA+SegoeUI-Bold`, `/IAAAAA+SegoeUI`, `/TAAAAA+SegoeUI-Semibold` (`/FontFile2`) | 1,822 chars p1, 208 Arabic chars | 0 | p1–p3 decode |
| A5 cards | 1320 Type3 | none | 1,327 chars p1 | 0 | p2 (card 1 continued) decodes |
| A4 statement | 35 Type3 + 2 Type0 | `/AAAAAA+ArialMT` (margin-box `sans-serif`) | 2,335 chars p1 | 0 | p2 decodes |

- **Selectable/searchable text works**: pypdf extracts 1,923 characters from a card page including names, headings and
  every mark; the statement extracts all 40 row references. Text is real text, not a bitmap.
- **Images stay vector**: the logo is inline SVG and the QR is an inline SVG path, so pages contain **no image XObjects**
  and stay sharp at any printer resolution. A school that uploads a raster PNG logo is the only raster source.
- **Variable fonts become Type3.** Chromium emits `/Type3` glyph procedures (36 font objects per card) for the
  `@fontsource-variable/inter` cut the app imports today; a static 400 cut of the same font emits **2 Type0 fonts per
  page and one embedded subset**. The 30-card PDF falls from **1,152,192 to 829,773 bytes (−28.0%)**. A minimal
  control (395 characters) shows the same effect in isolation: Inter Variable 19,772 B / 2 Type3 vs Segoe UI static
  13,359 B / 1 Type0 vs Arial static 22,033 B / 1 Type0; all three extract 395 characters.
- **Arabic shapes correctly visually.** The RTL card mirrors the grid, connects the letters and embeds the system Arabic
  fallback (Tahoma + Segoe UI) as subsets. Extraction yields Arabic codepoints (208 of them) but the sequence matches
  neither the logical nor the simple visual order, so **Arabic copy/paste and search in a PDF reader is unreliable**.
- **Bidi needs isolation.** In the RTL card the date block prints "Oct 2026 31" and "Jan 2027 4" — the Latin/digit run
  is reordered by the RTL paragraph. Wrapping every date, number and URL in `dir="ltr"` (or U+2066…U+2069) is a D02
  requirement, not a nicety.
- **QR at print resolution.** The 16 mm QR is version 5 (37×37, EC M, 4-module quiet zone) for a 68-character signed
  URL; zxing-cpp decodes it from the rasterised PDF at **150 DPI** on page 1, 2 and 3 of the A4 cards, on the A5 card
  (page 2, after the spill) and on statement page 2. Module size at 16 mm is ≈0.36 mm.

## 3. Page fitting — the constraint D02 must enforce

Measured as `max(card height) − page content height` with print media emulation at the exact content width.

| Layout | Body size | Content box | Max card height | Overflow |
| --- | ---: | --- | ---: | ---: |
| A4 portrait, full columns | 8.5 pt | 186 × 267 mm | 267.0 mm | **0** (fits) |
| A4 portrait, full columns | 9.0 pt | 186 × 267 mm | 275.5 mm | +8.5 mm → 2 pages/card |
| A4 portrait, 500-char comment | 8.5 pt | 186 × 267 mm | 275.1 mm | +8.1 mm → 2 pages/card |
| A4 landscape, full columns | 8.2 pt | 269 × 184 mm | 244.5 mm | +58.5 mm → 2 pages/card |
| A5 portrait, full columns | 7.6 pt | 130 × 188 mm | 260.5 mm | +72.5 mm → 2 pages/card |
| A5 portrait, reduced columns | 7.6 pt | 130 × 188 mm | 238.5 mm | +50.5 mm → 2 pages/card |

A5 font-size sweep (same full block set, `--base` scaled only):

| Body size | 8.0 pt | 7.5 pt | 7.0 pt | 6.5 pt | 6.0 pt | 5.5 pt | 5.0 pt |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Overflow | +80.3 | +70.5 | +58.3 | +46.2 | +34.2 | +23.1 | +9.2 mm |

**A5 cannot hold the 11-block primary-term template at any legible size** (it still overflows at 5 pt). A5 needs a
different block list, not a smaller font. Likewise A4 landscape needs a two-column block layout for a full card; a
landscape page is a good fit for wide tables (broadsheets, statements), not for the tall single-column card.

`comment_max_length: 500` in the pack is an authoring limit, not a layout guarantee: at the A4 baseline a 500-character
comment overflows the sheet by 8.1 mm. The renderer must measure the rendered card and act (compact density, fewer
blocks, or an explicit second page) instead of trusting the template field.

## 4. What the current app pattern does

`ReportCardsPage` hides the app with `body * { visibility: hidden }`, makes the cards visible, absolutely positions
them at the top of the page, and prints. Reproduced with synthetic cards (A4, 12 mm margins, 273 mm content box):

| Reproduction | Cards | Result |
| --- | ---: | --- |
| `visibility: hidden` + absolute layer, card 1000 px (< 1032 px content box) | 30 | 30 pages, all with text |
| `visibility: hidden` + absolute layer, card 1050 px (> content box) | 30 | **60 pages, 30 blank** |
| `visibility: hidden` + absolute layer, 9000 px app shell | 3 | **9 pages, 6 blank** (the hidden shell still paginates) |
| `#root { display: none }`, card 1050 px | 30 | 60 pages (the height overrun remains) |
| `#root { display: none }`, card 1050 px | 3 | 6 pages (the shell no longer paginates) |

`visibility: hidden` keeps the shell's layout box, so a long page contributes blank pages; and a card even 18 px taller
than the content box doubles the job. The baseline therefore hides the shell with `display: none` (or uses a dedicated
print route) and treats "one card = one sheet" as an invariant the renderer checks, not something CSS guesses.

## 5. Page furniture: three mechanisms, measured

| Mechanism | Page numbers | Overlap | Evidence |
| --- | --- | --- | --- |
| `@page { @bottom-left/@bottom-right { content: … counter(page) " of " counter(pages) } }` | **correct** ("Page 1 of 2", "Page 2 of 2") | none — the margin box is inside the page margin | statement, 2 pages |
| `position: fixed` footer + `::after { content: counter(page) }` | **"Page 0 of 0"** (page counters are not available in normal content) | **overprints the last two ledger rows** | `?doc=statement&furniture=fixed`, rendered page 1 |
| No margin box | none | none | cards (no page numbering, by design) |

Chromium 140 supports `@page` margin boxes, including `counter(page)`/`counter(pages)` with the true document page
count. This is the baseline; `position: fixed` is rejected for furniture.

## 6. Table pagination

The 40-row statement splits 38 + 2 rows over two pages:

- `thead { display: table-header-group }` repeats the column header on page 2 (verified by text extraction).
- `tr { break-inside: avoid }` keeps every row whole; all 40 `RCP-…` references appear exactly once across the two pages.
- The totals/signature/QR block is a normal block after the table (`break-inside: avoid`) and lands intact on page 2.
- **`tfoot` repeats on every page.** With the total row in `<tfoot>`, "Total for the period" appeared on page 1 *and*
  page 2. Moving it to a block after the table fixed it. Rule: no `tfoot` for a final total.
- **`break-inside: avoid` on a block that contains a multi-page table pushes the whole table to the next page** and
  leaves page 1 blank (first statement render: 3 pages, page 1 header-only, page 2 table). Scoping the rule to
  `break-inside: auto` for table blocks fixed it (2 pages, 38 + 2 rows).
- A flex-column sheet fragments the table unpredictably; a multi-page document uses normal flow (`.sheet.flow`).

## 7. QR encoder (in-repo proposal)

A byte-mode, EC level M, versions 1–10 encoder (242 lines, 219 non-comment) was written into the spike page and used for
every QR above.

- **Correctness:** 14 payloads from 1 to 200 bytes (versions 1–10, single- and multi-block, masks 0–6) all decode to
  their exact input with zxing-cpp. Matrices are byte-identical to segno 1.6.6 for the capacity-exact case; for other
  payloads segno appends one extra `0x00` codeword when the bit stream is already byte-aligned (a reference-implementation
  quirk decoders ignore) — the spike's output decodes, which is the property that matters.
- **Payload:** the 68-character signed URL `https://verify.schoolpilot.app/v1/RC-2026-000123?sig=6Kq2x0Yb8m3TfWc`
  selects version 5 (37×37). The same URL decodes from the 150 DPI PDF raster.
- **Cost:** 4,644 bytes minified, **2,311 bytes gzip** when bundled alone with esbuild.
- **Output:** inline SVG (`shape-rendering="crispEdges"`, 4-module quiet zone, black on white), 16 mm square.
  No rasterisation, no canvas, no network.

## 8. Bundle cost of the rejected client libraries

From Bundlephobia on 2026-10-21 (none is installed; `require.resolve` fails for all of them):

| Package | Version | Minified | Gzip | Share of the 500 kB gzip initial-JS budget |
| --- | --- | ---: | ---: | ---: |
| `jspdf` | 4.2.1 | 403,814 B | 129,768 B (126.7 KiB) | 25.9% |
| `pdf-lib` | 1.17.1 | 429,058 B | 177,487 B (173.3 KiB) | 35.5% |
| `@react-pdf/renderer` | 4.9.0 | 1,200,522 B | 442,267 B (431.9 KiB) | 88.5% |
| `qrcode` (for reference) | 1.5.4 | 23,456 B | 8,750 B (8.5 KiB) | 1.8% |

The spike's whole print stylesheet is 7,319 B raw / **2,233 B gzip**; the `@media print` block alone is 620 B raw /
**316 B gzip**. The baseline therefore costs about 2 KiB gzip of CSS and 2.3 KiB gzip of QR encoder — 0.9% of the
initial-JS budget — against 127–432 KiB for a client PDF library.

## 9. Server / Electron print path

- There is no Electron dependency and no server print code. `src/server/LANServer.ts` is an Express/WebSocket skeleton
  with no document pipeline.
- `puppeteer@^24.16.2` is a **production** dependency but is imported nowhere under `src/`; spec 06 §7 already lists it
  for removal from the client bundle. Its package is 76,938 B; its browser cache under `%USERPROFILE%\.cache\puppeteer`
  is 1.2 GB across three Chrome versions.
- A headless print worker needs the browser binary: the installed Playwright **headless shell is 290.9 MB** (full
  Chromium 457.6 MB), plus fonts. That is a server/hub distribution cost, not a client one.
- A server path reproduces the same output (same Chromium print pipeline, same CSS) but cannot serve topology A
  (single device, offline) and needs the Arabic fonts installed on the host — the client has Tahoma/Segoe UI, a Linux
  container does not.

## 10. Not proven

- The interactive print dialog itself (modal timing, user scale/margin settings, "Background graphics" on/off).
  `page.pdf()` uses the same print pipeline but bypasses the dialog's settings.
- Firefox and Safari print rendering; only Chromium 140 was measured. `@page` margin boxes are the newest feature used.
- Real school logos (raster PNG at unknown resolution) and real 500-character teacher comments in a live pack.
- Server-side rendering on Linux (font fallback for Arabic, headless Chromium in the hub image).
- PDF/A conformance; Type3 fonts are legal PDF but not accepted by every archival profile.
