#!/usr/bin/env node
/**
 * sync-catalog.mjs
 * --------------------------------------------------------------------------
 * Fuente canónica del catálogo de features:  prep-platform/features.html
 * (el array `MODS`). Este script regenera el bloque `CATALOG` embebido en
 * index.html (entre los marcadores <<CATALOG>> ... <</CATALOG>>), para que
 * el landing nunca quede desincronizado con el catálogo real.
 *
 * Uso:   node scripts/sync-catalog.mjs      (o:  npm run sync-catalog)
 * --------------------------------------------------------------------------
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const SRC = resolve(root, '../prep-platform/features.html'); // hermano de prep-landing
const DEST = resolve(root, 'index.html');

// 1) Extraer el array MODS de la fuente canónica
const src = readFileSync(SRC, 'utf8');
const match = src.match(/const\s+MODS\s*=\s*(\[[\s\S]*?\]);\s*\n/);
if (!match) {
  console.error('✗ No se encontró el array MODS en', SRC);
  process.exit(1);
}
const MODS = eval(match[1]); // archivo propio y confiable

// 2) Transformar MODS -> CATALOG (sólo nombre + features: [id, tier, título, desc])
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const body = MODS.map((mod) => {
  const feats = mod.f
    .map((f) => `      ['${f[0]}','${f[1]}','${esc(f[2])}','${esc(f[3])}']`)
    .join(',\n');
  return `    { name:'${esc(mod.n)}', f:[\n${feats}]}`;
}).join(',\n');

const block =
`  // <<CATALOG>> — AUTOGENERADO desde prep-platform/features.html (scripts/sync-catalog.mjs). No editar a mano.
  // Catálogo completo por módulo (índice = data-module-index). [id, tier, título, descripción]
  const CATALOG = [
${body}
  ];
  // <</CATALOG>>`;

// 3) Reemplazar el bloque entre marcadores en index.html
const dest = readFileSync(DEST, 'utf8');
const re = /  \/\/ <<CATALOG>>[\s\S]*?  \/\/ <<\/CATALOG>>/;
if (!re.test(dest)) {
  console.error('✗ No se encontraron los marcadores <<CATALOG>> ... <</CATALOG>> en', DEST);
  process.exit(1);
}
const out = dest.replace(re, () => block);
writeFileSync(DEST, out);

const totalFeats = MODS.reduce((n, m) => n + m.f.length, 0);
console.log(`✓ CATALOG sincronizado: ${MODS.length} módulos · ${totalFeats} features`);
