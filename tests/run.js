'use strict';
// 使い方: node tests/run.js [名前の一部] [--full]   例: node tests/run.js rules
//   --full: ランダム総当たりを60局に増やす(既定は8局)
const fs = require('fs');
const path = require('path');
const { makeT } = require('./lib/harness');

if (process.argv.includes('--full')) process.env.FUZZ_GAMES = process.env.FUZZ_GAMES || '60';
const only = process.argv.slice(2).find(a => !a.startsWith('--'));
const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js') && (!only || f.includes(only))).sort();
let passed = 0, failed = 0;
(async () => {
for (const f of files) {
  const mod = require(path.join(__dirname, f));
  const t = makeT(mod.name || f);
  const t0 = Date.now();
  try { await mod.run(t); } catch (e) { t.failed++; t.fails.push('例外: ' + (e && e.stack || e)); }
  console.log(`${t.failed ? '✗' : '✓'} ${t.name}  (成功 ${t.passed}${t.failed ? ` / 失敗 ${t.failed}` : ''}, ${Date.now() - t0}ms)`);
  t.fails.forEach(x => console.log('    - ' + x));
  passed += t.passed; failed += t.failed;
}
console.log(`\n合計: 成功 ${passed} / 失敗 ${failed}`);
process.exit(failed ? 1 : 0);
})();
