// Fails when the main bundle grows past its budget: `npm run size` after
// `npm run build`. The main bundle is dist/intl-datepicker.js plus the local
// chunks it imports (what `import 'intl-datepicker'` loads), gzipped at -9.
// Raise LIMIT deliberately when a feature is worth the bytes.
//
// CI (ubuntu-latest, Node 24) is the reference: zlib output differs by
// platform, and macOS measures about 60 B less.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const LIMIT = 21_573; // v0.4.1 on CI (21,273 B) + 300 B

const files = ['dist/intl-datepicker.js'];
for (let i = 0; i < files.length; i++) {
  for (const [, chunk] of readFileSync(files[i], 'utf8').matchAll(/from\s*["']\.\/([^"']+\.js)["']/g)) {
    if (!files.includes(`dist/${chunk}`)) files.push(`dist/${chunk}`);
  }
}

let total = 0;
for (const file of files) {
  const size = gzipSync(readFileSync(file), { level: 9 }).length;
  total += size;
  console.log(`${file.padEnd(32)} ${String(size).padStart(6)} B`);
}
console.log(`${'total'.padEnd(32)} ${String(total).padStart(6)} B (limit ${LIMIT} B)`);

if (total > LIMIT) {
  console.error(`Main bundle is ${total - LIMIT} B over budget.`);
  process.exit(1);
}
