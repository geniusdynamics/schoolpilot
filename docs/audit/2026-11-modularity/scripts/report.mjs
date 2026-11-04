// ABOUTME: Prints the modularity baselines (M1 module->module, M2 shared->module, M3 domain->data outside the
// ABOUTME: ports), runtime cycles, reachability verdicts and the first static startup path into each module.
// Usage: node report.mjs <edgesJson from graph.mjs>

import fs from 'node:fs';

const { edges } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const top = (a) => a.split('/')[0];
const prod = edges.filter((e) => !e.test && e.kind !== 'mock');
const runtime = prod.filter((e) => !e.typeOnly && e.kind !== 'importType');
const STATIC = new Set(['import', 'reexport', 'require', 'glob-eager']);
// Files whose job is to name modules: module registration and the router.
const COMPOSITION = new Set(['core/moduleRegistration.ts', 'routing/pageLoader.ts', 'routing/routeConfig.ts']);
const PORT = /^data\/(repository|adapters\/sqlite)\//;

function reach(start, allow) {
  const out = new Map();
  for (const e of runtime) { if (!allow(e)) continue; if (!out.has(e.from)) out.set(e.from, []); out.get(e.from).push(e); }
  const prev = new Map([[start, null]]);
  const queue = [start];
  while (queue.length) { const v = queue.shift(); for (const e of out.get(v) || []) if (!prev.has(e.to)) { prev.set(e.to, e); queue.push(e.to); } }
  return prev;
}
const app = reach('index.tsx', () => true);
const server = reach('server/cli.ts', () => true);
const startup = reach('index.tsx', (e) => STATIC.has(e.kind));
const live = (f) => app.has(f) || server.has(f);
const pathTo = (prev, t) => { const p = []; let c = t; while (c && prev.get(c)) { const e = prev.get(c); p.unshift(`${e.from}:${e.line} -[${e.kind}]->`); c = e.from; } return p.concat(t).join(' '); };
const section = (t) => console.log(`\n=== ${t} ===`);

section('Reachability');
console.log(`app (index.tsx): ${app.size} files; static startup graph: ${startup.size}; server (server/cli.ts): ${server.size}`);

section('M1 module -> module (production)');
const m1 = prod.filter((e) => top(e.fromArea) === 'modules' && top(e.toArea) === 'modules' && e.fromArea !== e.toArea);
console.log(`edges ${m1.length} (runtime ${m1.filter((e) => !e.typeOnly).length}) in ${new Set(m1.map((e) => e.from)).size} files; test-only edges ${edges.filter((e) => e.test && top(e.fromArea) === 'modules' && top(e.toArea) === 'modules' && e.fromArea !== e.toArea).length}`);
const pairs = {};
for (const e of m1) pairs[`${e.fromArea} -> ${e.toArea}`] = (pairs[`${e.fromArea} -> ${e.toArea}`] || 0) + 1;
console.log(pairs);

section('M2 shared folder -> module (production, composition files excluded)');
const m2 = prod.filter((e) => !['modules', 'scripts'].includes(top(e.fromArea)) && top(e.toArea) === 'modules' && !COMPOSITION.has(e.from));
const tally = (list) => `${list.length} edges in ${new Set(list.map((e) => e.from)).size} files`;
console.log(`live: ${tally(m2.filter((e) => live(e.from)))}; unreachable: ${tally(m2.filter((e) => !live(e.from)))}`);
const byFile = {};
for (const e of m2) { byFile[e.from] = byFile[e.from] || {}; byFile[e.from][e.kind] = (byFile[e.from][e.kind] || 0) + 1; }
for (const [f, k] of Object.entries(byFile).sort()) console.log(`  ${live(f) ? 'live' : 'DEAD'}  ${f}  ${JSON.stringify(k)}`);

section('M3 domain -> data outside the persistence ports (production)');
const m3 = prod.filter((e) => top(e.fromArea) === 'domain' && e.toArea === 'data' && !PORT.test(e.to));
console.log(`edges ${m3.length} (runtime ${m3.filter((e) => !e.typeOnly).length})`);
for (const e of m3) console.log(`  ${e.from}:${e.line} -> ${e.to}${e.typeOnly ? ' (type)' : ''}`);

section('Runtime cycles (static imports and eager globs)');
const g = new Map();
for (const e of runtime.filter((e) => STATIC.has(e.kind))) { if (!g.has(e.from)) g.set(e.from, []); g.get(e.from).push(e.to); if (!g.has(e.to)) g.set(e.to, []); }
let n = 0; const idx = new Map(), low = new Map(), on = new Set(), st = [], sccs = [];
for (const root of g.keys()) {
  if (idx.has(root)) continue;
  const work = [[root, 0]]; idx.set(root, n); low.set(root, n); n++; st.push(root); on.add(root);
  while (work.length) {
    const fr = work[work.length - 1]; const v = fr[0]; const succ = g.get(v);
    if (fr[1] < succ.length) { const w = succ[fr[1]++]; if (!idx.has(w)) { idx.set(w, n); low.set(w, n); n++; st.push(w); on.add(w); work.push([w, 0]); } else if (on.has(w)) low.set(v, Math.min(low.get(v), idx.get(w))); }
    else { work.pop(); if (work.length) { const p = work[work.length - 1][0]; low.set(p, Math.min(low.get(p), low.get(v))); }
      if (low.get(v) === idx.get(v)) { const c = []; let w; do { w = st.pop(); on.delete(w); c.push(w); } while (w !== v); if (c.length > 1) sccs.push(c); } }
  }
}
console.log(`cycles: ${sccs.length}; touching data/ or domain/: ${sccs.filter((c) => c.some((f) => /^(data|domain)\//.test(f))).length}`);
for (const c of sccs) console.log(`  [${c.length}] ${c.join(', ')}`);

section('Static startup graph: module files and first path into each module');
const mods = [...new Set(edges.map((e) => e.toArea).filter((a) => top(a) === 'modules'))].sort();
for (const m of mods) {
  const hit = [...startup.keys()].filter((f) => f.startsWith(m + '/'));
  if (!hit.length) { console.log(`${m}: 0`); continue; }
  const first = hit.sort((a, b) => pathTo(startup, a).length - pathTo(startup, b).length)[0];
  console.log(`${m}: ${hit.length} files (pages ${hit.filter((f) => f.includes('/pages/')).length}, mockData ${hit.filter((f) => f.includes('mockData')).length})\n   ${pathTo(startup, first)}`);
}

section('Verdicts for module-system files');
const named = ['core/ModularSystem.ts', 'core/ModuleExports.ts', 'core/ModuleBundler.ts', 'core/ModuleMetadataLoader.ts', 'core/index.ts', 'core/ServiceRegistry.ts', 'hooks/useLazyModule.ts', 'hooks/useService.ts', 'hooks/useModule.ts', 'hooks/useModuleLoadingPerformance.ts', 'hooks/data/index.ts', 'hooks/data/useDatabaseData.ts', 'moduleOrder.ts', 'globalProvidersRegistry.ts', 'contexts/appData/moduleCollectionRegistry.ts', 'components/ModuleLoadingProgress.tsx', 'services/module/dynamicModuleLoader.ts', 'services/module/moduleManagementService.ts', 'services/module/moduleConfigService.ts', 'services/module/ModuleDataRegistry.ts', 'services/module/moduleHealthMonitor.ts', 'services/data/DataContextIntegrationService.ts', 'services/ui/pageComponentResolver.ts', 'services/database/demoDataSeed.ts', 'modules/core/moduleDefinition.tsx', 'modules/todos/moduleDefinition.tsx', 'modules/portal/examples/StudentInvoiceComponent.tsx', 'modules/finance/index.ts', 'modules/finance/lifecycle.ts', 'modules/academics/lifecycle.ts', 'modules/administration/lifecycle.ts', 'modules/finance/services/registerServices.ts', 'modules/academics/services/registerServices.ts', 'modules/administration/services/registerServices.ts', 'modules/inventory/services/registerServices.ts', 'modules/reports/services/registerServices.ts'];
for (const f of named) console.log(`${f.padEnd(58)} ${live(f) ? 'reachable' : 'UNREACHABLE'}${startup.has(f) ? ' (startup)' : ''}${app.has(f) && !startup.has(f) ? '   via ' + pathTo(app, f).split(' ').slice(-4).join(' ') : ''}`);
