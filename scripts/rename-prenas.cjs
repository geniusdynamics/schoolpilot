// Rename PreNAs Marks -> Entry Marks (user request).
// - moves component into administration/components
// - renames identifiers PreNAsMarks->EntryMarks, preNAsMarks->entryMarks
// - updates routes (+redirect), nav keys, i18n keys & display values in all locales
// - data-layer collection/schema names stay untouched (storage compat)
const fs = require('fs');
const path = require('path');

function read(p) { return fs.readFileSync(p, 'utf8'); }
function write(p, s) { fs.writeFileSync(p, s); }
function exists(p) { return fs.existsSync(p); }

const log = [];

// ── 1. Move component ──────────────────────────────────────────────
const srcComp = 'src/components/PreNAsMarksManagement.tsx';
const dstComp = 'src/modules/administration/components/EntryMarksManagement.tsx';
must(exists(srcComp), 'component missing');
let comp = read(srcComp);

// Fix its relative imports BEFORE moving: '../data/types' style paths that
// resolved from src/components must resolve from modules/administration/components.
comp = comp.replace(/from '\.\.\/data\/types'/g, "from './types'");
comp = comp.replace(/from '\.\.\/\.\.\/data\/types'/g, "from './types'");
// generic imports that used to reach src/components/ui or src/hooks
comp = comp.replace(/from '\.\.\/ui\//g, "from '@/components/ui/");
comp = comp.replace(/from '\.\.\/\.\.\/ui\//g, "from '@/components/ui/");
comp = comp.replace(/from '\.\.\/hooks\//g, "from '@/hooks/");
comp = comp.replace(/from '\.\.\/\.\.\/hooks\//g, "from '@/hooks/");
comp = comp.replace(/from '\.\.\/utils\//g, "from '@/utils/");
comp = comp.replace(/from '\.\.\/\.\.\/utils\//g, "from '@/utils/");
comp = comp.replace(/from '\.\.\/i18n/g, "from '@/i18n");
comp = comp.replace(/from '\.\.\/contexts/g, "from '@/contexts");
comp = comp.replace(/from '\.\.\/services/g, "from '@/services");

// Identifier + string renames inside the component
comp = comp
  .replace(/PreNAsMarksFormData/g, 'EntryMarksFormData')
  .replace(/PreNAsMarks/g, 'EntryMarks')
  .replace(/preNAsMarks/g, 'entryMarks')
  .replace(/PreNAS/g, 'ENTRY MARKS')
  .replace(/Pre-NAS/g, 'Entry Marks')
  .replace(/Pre-NAs/g, 'Entry Marks')
  .replace(/PreNAs/g, 'Entry Marks');

write(dstComp, comp);
fs.unlinkSync(srcComp);
log.push(`moved+renamed component -> ${dstComp}`);

// ── 2. Page file ───────────────────────────────────────────────────
const srcPage = 'src/modules/administration/pages/PreNAsMarksPage.tsx';
const dstPage = 'src/modules/administration/pages/EntryMarksPage.tsx';
must(exists(srcPage), 'page missing');
let page = read(srcPage)
  .replace("import PreNAsMarksManagement from '@/components/PreNAsMarksManagement';",
           "import EntryMarksManagement from '../../components/EntryMarksManagement';")
  .replace(/PreNAsMarksPage/g, 'EntryMarksPage')
  .replace(/PreNAsMarksManagement/g, 'EntryMarksManagement');
write(dstPage, page);
fs.unlinkSync(srcPage);
log.push('moved+renamed page');

// ── 3. administration/components/index.ts re-export ───────────────
const compIdx = 'src/modules/administration/components/index.ts';
if (exists(compIdx)) {
  let ci = read(compIdx)
    .replace(/PreNAsMarksManagement/g, 'EntryMarksManagement');
  // point re-export at local file if it referenced src/components path
  ci = ci.replace(/export \{ default as EntryMarksManagement \} from '@\/components\/PreNAsMarksManagement';/,
                  "export { default as EntryMarksManagement } from './EntryMarksManagement';");
  ci = ci.replace(/from '@\/components\/EntryMarksManagement';/, "from './EntryMarksManagement';");
  write(compIdx, ci);
  log.push('updated components/index.ts');
}

// ── 4. pages/index.ts ──────────────────────────────────────────────
const pageIdx = 'src/modules/administration/pages/index.ts';
if (exists(pageIdx)) {
  let pi = read(pageIdx).replace(/PreNAsMarksPage/g, 'EntryMarksPage');
  write(pageIdx, pi);
  log.push('updated pages/index.ts');
}

// ── 5. moduleDefinition: route + page + nav key ────────────────────
const modDef = 'src/modules/administration/moduleDefinition.tsx';
let md = read(modDef)
  .replace(/navigation:administration\.preNAsMarks/g, 'navigation:administration.entryMarks')
  .replace(/\/administration\/prenas-marks/g, '/administration/entry-marks')
  .replace(/'PreNAsMarksPage'/g, "'EntryMarksPage'");
write(modDef, md);
log.push('updated moduleDefinition');

// ── 6. redirectMap for the old URL ─────────────────────────────────
const rm = 'src/routing/redirectMap.ts';
if (exists(rm)) {
  let r = read(rm);
  if (!r.includes('/administration/prenas-marks')) {
    const anchor = r.indexOf('{');
    r = r.replace(/(\{\s*\n)/, `$1  '/administration/prenas-marks': '/administration/entry-marks',\n`);
    write(rm, r);
    log.push('added redirect for old route');
  }
}

// ── 7. data/types.ts unused interface rename ───────────────────────
const dt = 'src/modules/administration/data/types.ts';
if (exists(dt)) {
  write(dt, read(dt).replace(/AdminPreNAsMarksType/g, 'AdminEntryMarksType'));
  log.push('renamed AdminPreNAsMarksType');
}
// NOTE: collections.ts / schema.ts storage names intentionally unchanged.

// ── 8. i18n JSON key + value renames ───────────────────────────────
const localeFiles = [];
function collect(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collect(p);
    else if (/\.json$/.test(e.name) && /i18n/.test(p)) localeFiles.push(p);
  }
}
collect('src/i18n');
collect('src/modules/administration/i18n');
collect('src/modules/core/i18n');

for (const lf of localeFiles) {
  let j = read(lf);
  if (!/preNAs|Pre-NAS|PreNAs|PRENAS/i.test(j)) continue;
  // Key renames (quoted keys at any depth)
  j = j.replace(/"preNAsMarks"/g, '"entryMarks"');
  // Display values -> Entry Marks (only inside string values)
  j = j.replace(/:\s*"([^"]*Pre-NAS[^"]*)"/gi, (m, v) => `: "${v.replace(/Pre-NAS/gi, 'Entry Marks')}"`);
  j = j.replace(/:\s*"([^"]*PreNAs[^"]*)"/gi, (m, v) => `: "${v.replace(/PreNAs/gi, 'Entry Marks')}"`);
  write(lf, j);
  log.push(`i18n updated: ${lf}`);
}

console.log(log.join('\n'));

function must(c, msg) { if (!c) { console.error('ABORT: ' + msg); process.exit(1); } }
