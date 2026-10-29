# Portal performance: the budget, and how to measure it

FR-27 asks for a guardian and learner portal that works on the devices the schools actually have.
Spec 07 §8 sets the target: responsive guardian flows (fee balance, pay link, report download,
attendance), touch targets of at least 44 px, Android Chrome on a 2–3 GB RAM device, with SMS as the
fallback for guardians without a smartphone.

This document records what the portal ships, the budget the build must stay inside, the commands
that measure it, and — in plain terms — what was measured on the build machine and what was not.

## What the portal ships

- **A phone-first layout.** Every portal page is a stack of cards and plain semantic tables. There is
  no data grid, no virtualised list, no chart library and no icon font on any portal page. The page
  imports Card, Button, Input, Spinner and the shared icon components, and nothing else from the UI
  kit.
- **No re-implemented finance or reports code.** The balance is the finance module's own
  `useStudentFinancialSummary`; the term reports read canonical `report_card` rows that the reports
  module published. The portal therefore ships neither the finance pages nor their charts.
- **Lazy pages.** `src/routing/pageLoader.ts` resolves each routed page through `import.meta.glob`
  and `React.lazy`, so the portal is fetched when it is first opened, not with the app shell. In this
  build the portal's six pages share one module chunk.
- **App-wide PWA.** `vite-plugin-pwa` is enabled for production builds only (`registerType:
  'prompt'`, a workbox precache of js/css/html/icons and a runtime cache for web fonts). There is no
  portal-specific service worker: the portal is one route of the same installable app.
- **44 px controls.** The child switcher, the consent checkboxes and the pay button all use at least
  `min-h-11` (44 px), and the layout is single-column below `sm`.

## The budget

| What | Budget | Why |
| --- | --- | --- |
| Portal module chunk (all portal pages), gzip | **≤ 60 KB** | A 3G-class connection moves roughly 40–60 KB/s in practice; the portal's own code should arrive in about a second after the shell. |
| Chart libraries on a portal page | **0** | The portal shows numbers and tables; a chart library would add hundreds of KB to a page that does not need one. |
| Data grids on a portal page | **0** | `DataGrid` pulls the table/filter/sort machinery into a route read on a phone. |
| First paint content | Shell and the selected learner from the already-loaded bundle | The page states (loading, not linked, error) render without waiting for the read. |

The app shell (React, routing, the database services and the shared vendor chunk) is **not** in the
portal's budget: it is loaded before any module route and is a platform-level cost, not a portal one.
It is, however, the dominant cost of a first visit — see the numbers below.

## How to measure

Run everything from the repository root.

1. **Portal chunk size** (the measurement recorded below):

   ```powershell
   npx vite build --logLevel warn
   node -e "const fs=require('fs'),z=require('zlib'),p=require('path');const d='dist/assets';for(const f of fs.readdirSync(d).filter(f=>/module-portal/.test(f))){const b=fs.readFileSync(p.join(d,f));console.log(f,(b.length/1024).toFixed(1)+' KB raw',(z.gzipSync(b,{level:9}).length/1024).toFixed(1)+' KB gzip')}"
   ```

   The budget is on the gzip figure. A second build with a different hash name is the same code.

2. **A real route load under a 3G profile, with CPU throttling** (Playwright is a dev dependency, so
   this needs nothing new). With the app served on a private port:

   ```powershell
   npx vite --host 127.0.0.1 --port 5241 --strictPort
   ```

   then, in a Playwright script, on a signed-in page:

   ```ts
   const client = await page.context().newCDPSession(page);
   await client.send('Network.emulateNetworkConditions', {
     offline: false,
     latency: 400,                 // RTT in ms, Slow 3G
     downloadThroughput: (400 * 1024) / 8,
     uploadThroughput: (400 * 1024) / 8,
   });
   await client.send('Emulation.setCPUThrottlingRate', { rate: 4 }); // a 2–3 GB Android-class CPU
   await page.goto(`${base}/?perf=${Date.now()}#/portal`, { waitUntil: 'load' });
   const metrics = await page.evaluate(() => ({
     transferred: performance
       .getEntriesByType('resource')
       .reduce((sum, entry) => sum + ((entry as PerformanceResourceTiming).transferSize || 0), 0),
     navigation: performance.getEntriesByType('navigation')[0]?.toJSON(),
   }));
   ```

   Chase the largest contentful paint with a `PerformanceObserver({ type: 'largest-contentful-paint',
   buffered: true })` installed with `page.addInitScript` before the navigation.

3. **Lighthouse, mobile profile.** Lighthouse is **not** installed in this repository and adding it
   would be a new dependency, so it was not run here. On a machine that has it:

   ```powershell
   npx lighthouse "http://127.0.0.1:5241/#/portal" --preset=desktop --throttling-method=simulate --form-factor=mobile --screenEmulation.mobile --output=json --output-path=portal-lighthouse.json
   ```

   or Chrome DevTools → Lighthouse → *Mobile* → *Simulated throttling*. Record LCP, TBT, CLS, the
   transferred bytes and the main-thread time. Compare against the same page on the previous commit.

4. **The real device.** The claim the ledger makes is about a 2–3 GB Android phone, and no emulator
   or desktop throttle substitutes for one. Install the production build (`npx vite preview` or the
   deployed site), open the portal in Android Chrome, and read the same figures from
   `chrome://inspect` → Performance.

5. **The PWA.** With a production build and `npx vite preview`, DevTools → Application → Manifest and
   Service Workers; then set the network to *Offline* and reload the portal.

## What was measured on this machine (29 October 2026)

Command: `npx vite build --logLevel warn`, then the Node one-liner above. Windows, Node 22, on the
task's build machine.

| Chunk | Raw | Gzip |
| --- | --- | --- |
| **`module-portal-*.js`** (all six portal pages, the shell, the hooks and the data layer) | **48.6 KB** | **12.7 KB** |
| `module-finance-*.js` (for comparison) | 500.8 KB | 119.6 KB |
| `module-administration-*.js` (for comparison) | 675.9 KB | 138.9 KB |
| `module-academics-*.js` (for comparison) | 1,622.7 KB | 372.9 KB |
| `vendor-*.js` (whole app, loaded before any module) | 2,976.9 KB | 1,082.3 KB |
| `react-vendor-*.js` | 581.2 KB | 162.9 KB |
| All JS in `dist/assets` (132 files, every module) | 10,617 KB | 3,044 KB |

The portal is inside its budget with a wide margin: 12.7 KB gzip against a 60 KB budget, and the
figures show why — no grid, no chart library, and no finance or reports page code of its own.

The numbers also show the honest limit of that claim: the vendor chunk alone is 1,082 KB gzip, and
the app shell is loaded before the portal route. On a 3G-class connection the first visit is
dominated by the shell, not by the portal. Making the shell smaller is a platform-level change, out
of this task's scope; the portal does not add to it.

## What was not measured

- **Lighthouse**: not run. The CLI is not a dependency here, and adding one was out of scope for this
  task. The command is above for whoever runs it next.
- **A 3G (or Slow 3G) route load, LCP, TBT, INP, CLS**: not measured in this task. The command in
  step 2 is what to run; the figures above are chunk sizes, not timings.
- **A 2–3 GB Android device, or any real device**: not available on this machine, so the ledger's
  device claim is **not** verified. What is verified is that the portal's own code is small and its
  pages render at a 390 px viewport (the E2E in `tests/e2e/portal-guardian.spec.ts` runs at
  390 × 844).
- **PWA install, offline reload and the service-worker cache**: not exercised.
- **Interaction latency** (switching a child, marking a notice read, saving consent): not measured;
  the reads are in-memory canonical queries and the writes are single-row updates, but that is an
  expectation, not a measurement.
