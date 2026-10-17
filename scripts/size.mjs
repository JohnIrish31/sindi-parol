import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = 'dist';
const BUDGET = { js: 70 * 1024, css: 8 * 1024 };

const walk = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const kb = (n) => (n / 1024).toFixed(2).padStart(7) + ' KB';
const totals = { js: 0, css: 0, svg: 0, other: 0 };
const rows = walk(DIST).map((p) => {
  const buf = readFileSync(p);
  const gz = gzipSync(buf, { level: 9 }).length;
  const ext = p.split('.').pop();
  totals[ext in totals ? ext : 'other'] += gz;
  return { name: relative(DIST, p).replaceAll('\\', '/'), raw: buf.length, gz };
}).sort((a, b) => b.gz - a.gz);

console.log('\nfile'.padEnd(52) + 'raw'.padStart(10) + 'gzip'.padStart(11));
for (const r of rows) console.log(r.name.padEnd(50) + kb(r.raw) + kb(r.gz));
console.log('\nTotal gzip  JS:' + kb(totals.js) + '  CSS:' + kb(totals.css) + '  SVG:' + kb(totals.svg) + '  other:' + kb(totals.other));

let fail = false;
for (const k of ['js', 'css']) {
  const ok = totals[k] <= BUDGET[k];
  if (!ok) fail = true;
  console.log(`${ok ? 'OK  ' : 'OVER'} ${k.toUpperCase()} budget ${kb(totals[k]).trim()} / ${kb(BUDGET[k]).trim()}`);
}
if (fail) process.exit(1);
