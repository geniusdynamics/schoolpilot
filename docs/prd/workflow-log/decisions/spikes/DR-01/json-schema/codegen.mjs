// ABOUTME: Minimal JSON Schema to TypeScript generator used as the stand-in codegen step for DR-01.
// ABOUTME: Supports the constructs used by the spike entity; not a general replacement for json-schema-to-typescript.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(fs.readFileSync(path.join(here, 'entity.schema.json'), 'utf8'));

const pascal = (name) => name.charAt(0).toUpperCase() + name.slice(1);

function tsType(prop, indent = '  ') {
  if (!prop || typeof prop !== 'object') return 'unknown';
  if (prop.$ref) return pascal(prop.$ref.split('/').pop());
  if (Array.isArray(prop.enum)) return prop.enum.map((v) => JSON.stringify(v)).join(' | ');
  if (Array.isArray(prop.anyOf)) return prop.anyOf.map((p) => tsType(p, indent)).join(' | ');
  if (Array.isArray(prop.type)) return prop.type.map((t) => tsType({ ...prop, type: t }, indent)).join(' | ');
  switch (prop.type) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'array':
      return `Array<${tsType(prop.items, indent)}>`;
    case 'object':
      return prop.additionalProperties === true || (prop.additionalProperties && Object.keys(prop.additionalProperties).length > 0)
        ? 'Record<string, unknown>'
        : `{ ${Object.entries(prop.properties || {}).map(([k, v]) => `${k}: ${tsType(v, indent)}`).join('; ')} }`;
    default:
      return 'unknown';
  }
}

const out = [
  '// ABOUTME: Generated from entity.schema.json by codegen.mjs; do not edit by hand.',
  '// ABOUTME: Stand-in for a mature JSON Schema codegen tool in the DR-01 spike.',
  '',
];

for (const [name, def] of Object.entries(schema.definitions)) {
  const required = new Set(def.required || []);
  out.push(`export interface ${pascal(name)} {`);
  for (const [field, prop] of Object.entries(def.properties || {})) {
    const optional = required.has(field) ? '' : '?';
    out.push(`  ${field}${optional}: ${tsType(prop)};`);
  }
  out.push('}', '');
}

out.push('export const storage = {');
for (const [name, def] of Object.entries(schema.definitions)) {
  const storage = def['x-storage'] || {};
  out.push(`  ${name}: ${JSON.stringify(storage)},`);
}
out.push('} as const;', '');

fs.writeFileSync(path.join(here, 'entity.generated.ts'), out.join('\n'), 'utf8');
console.log(`generated entity.generated.ts from ${Object.keys(schema.definitions).length} definitions (${out.length} lines)`);
