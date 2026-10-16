'use strict';
// ゲーム内蔵の「自己診断」(和了判定・役・符・喰い替え・流し満貫など)が全てPASSすること
const { loadGame } = require('./lib/harness');

exports.name = '自己診断(ゲーム内蔵テスト)';
exports.run = t => {
  const g = loadGame();
  g.G.selfTest();
  const lines = g.alertText.split('\n').filter(Boolean);
  const pass = lines.filter(l => l.startsWith('PASS')).length;
  t.ok('自己診断が30件以上実行された', lines.length >= 30);
  t.ok('ERROR行がない', !lines.some(l => l.startsWith('ERROR')));
  lines.filter(l => l.startsWith('FAIL')).forEach(l => t.ok(l, false));
  t.passed += pass; // 個々のPASSを件数に加算
};
