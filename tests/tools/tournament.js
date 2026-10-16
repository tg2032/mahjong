'use strict';
// CPUの強さの測定: 座席0=ツモ切りだけのダミー、座席1〜3=指定レベルのCPUで全局を回し、平均順位を出す。
// 使い方: node tests/tools/tournament.js 2,1,1 100     (座席1が強い、2・3が普通 / 100局)
const { loadGame } = require('../lib/harness');

const lv = (process.argv[2] || '2,1,1').split(',').map(Number);
const N = +(process.argv[3] || 50);
const g = loadGame(); const { G, els } = g;
g.setRules();
const rankSum = [0, 0, 0, 0], scoreSum = [0, 0, 0, 0];
let ends = 0;
for (let n = 0; n < N; n++) {
  g.timers.length = 0; G.newGame(Math.floor(Math.random() * 4));
  G.S.levels = [1, lv[0], lv[1], lv[2]]; // 席ごとのCPUレベル(測定用の内部指定)
  for (let st = 0; st < 80000; st++) {
    const S = G.S;
    if (g.timers.length) { g.timers.shift()(); continue; }
    if (S.ended) {
      ends++;
      for (let p = 0; p < 4; p++) { rankSum[p] += 1 + S.scores.filter(x => x > S.scores[p]).length; scoreSum[p] += S.scores[p]; }
      break;
    }
    if (S.over) { els.nextBtn.onclick(); continue; }
    if (S.waiting) { const b = g.findButton(/パス/); if (b) { b.onclick(); continue; } }
    if (S.turn === 0) {
      const w = g.findButton(/^(ツモ|ロン)/); if (w) { w.onclick(); continue; }
      const k = g.findButton(/^九種/); if (k) { k.onclick(); continue; }
      G.onPlayerDiscard(S.drawnIdx >= 0 ? S.drawnIdx : S.hands[0].length - 1); continue;
    }
    break;
  }
}
const label = ['ダミー(ツモ切り)', `CPU席1(レベル${lv[0]})`, `CPU席2(レベル${lv[1]})`, `CPU席3(レベル${lv[2]})`];
console.log(`${ends}/${N}局を完走`);
label.forEach((l, p) => console.log(`${l.padEnd(18)} 平均順位 ${(rankSum[p] / ends).toFixed(2)}  平均持ち点 ${Math.round(scoreSum[p] / ends)}`));
console.log('※ 平均順位は小さいほど強い。誤差は 100局で±0.1 程度。');
