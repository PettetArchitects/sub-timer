#!/usr/bin/env node
// Fast, dependency-free sanity check (no browser) — used by the SessionStart
// hook and as a pre-flight before the full browser smoke. Validates that every
// inline <script> block in index.html parses, and reports the app version.
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = await readFile(join(ROOT, 'index.html'), 'utf8');
const blocks = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
  .map((m) => m[1]).filter((s) => s.trim());

let bad = 0;
blocks.forEach((code, i) => {
  try { new Function(code); }
  catch (e) { bad++; console.error(`✗ <script> #${i + 1}: ${e.message}`); }
});

const ver = (html.match(/APP_VERSION\s*=\s*['"]([^'"]+)['"]/) || [])[1] || '?';
const fns = (html.match(/function\s+[A-Za-z0-9_$]+\s*\(/g) || []).length;

if (bad) { console.error(`\n✗ sanity: ${bad} script block(s) failed to parse`); process.exit(1); }
console.log(`✓ sanity: index.html ${ver} — ${blocks.length} script block(s), ${fns} functions parse clean`);
