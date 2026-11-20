'use strict';
// 裏技(透視・裏ドラ見・ツモ直し)
const { loadGame } = require('./lib/harness');

exports.name = '裏技';
exports.run = t => {
  const g = loadGame(); const { G } = g;
  const total = S => {
    const c = new Array(34).fill(0), add = x => c[G.T2I[x]]++;
    S.hands.forEach(h => h.forEach(add)); S.rivers.forEach(r => r.forEach(add));
    S.melds.forEach(ms => ms.forEach(m => m.tiles.forEach(add))); S.wall.forEach(add);
    const dr = 4 - S.rinTiles.length; S.dead.forEach((x, i) => { if (i >= dr || i >= 4) add(x); });
    return c.every(n => n === 4);
  };
  const myTurn = () => { const S = g.fresh(0); S.turn = 0; S.drawnIdx = S.hands[0].length - 1; S.drawn = S.hands[0][S.drawnIdx]; return S; };
  const labels = () => g.buttons().map(b => b.textContent);

  // ルール要約
  g.setRules({ trick: 'on' }); t.ok('裏技: ルール要約に「裏技:あり」', /裏技:あり/.test(G.ruleSummaryText(G.readRules())));
  g.setRules({ trick: 'off' }); t.ok('裏技: ルール要約に「裏技:なし」', /裏技:なし/.test(G.ruleSummaryText(G.readRules())));

  // ボタンの出現
  g.setRules({ trick: 'on' }); let S = myTurn(); G.refreshPlayerButtons();
  t.ok('裏技: 自分の手番に3つのボタンが出る', ['透視', '裏ドラ', 'ツモ直し'].every(k => labels().some(l => l.includes(k))));
  g.setRules({ trick: 'off' }); S = g.fresh(0); S.turn = 0; S.drawnIdx = 13; S.drawn = S.hands[0][13]; G.refreshPlayerButtons();
  t.ok('裏技: ルールで「なし」にするとボタンが出ない', !labels().some(l => /透視|裏ドラ|ツモ直し/.test(l)));
  g.setRules({ trick: 'on' });

  // 透視
  S = myTurn(); G.refreshPlayerButtons(); g.findButton(/透視/).onclick();
  t.ok('透視: 回数が減り、他家の手牌が表示される', S.tricks.peek === 1 && S.peek === true && /sm/.test(g.els.seat1.innerHTML) && g.els.seat1.innerHTML.length > 0);
  t.ok('透視: 使用中は透視ボタンが消える', !labels().some(l => l.includes('透視')));
  G.onPlayerDiscard(0);
  t.ok('透視: 打牌すると表示が終わる', S.peek === false);

  // 裏ドラ見
  S = myTurn(); G.refreshPlayerButtons(); g.findButton(/裏ドラ/).onclick();
  t.ok('裏ドラ見: 回数が減り、同じ局では再使用できない', S.tricks.ura === 1 && S.uraPeeked === true && !labels().some(l => l.includes('裏ドラ')));
  t.ok('裏ドラ見: ログに表示牌が出て、内部コードが漏れない', /裏ドラ表示牌/.test(g.els.log.children[g.els.log.children.length - 1].textContent) && !/[mpsz][0-9]/.test(g.els.log.children[g.els.log.children.length - 1].textContent));

  // ツモ直し: 成功時(乱数を固定)
  const rnd = Math.random;
  try {
    S = myTurn(); const before = S.hands[0][S.drawnIdx], top = S.wall[S.wall.length - 1], wl = S.wall.length;
    Math.random = () => 0.9; G.refreshPlayerButtons(); g.findButton(/ツモ直し/).onclick();
    t.ok('ツモ直し(成功): ツモ牌が山の次の牌に替わる', S.hands[0][S.drawnIdx] === top && S.drawn === top && S.wall.length === wl && S.tricks.swap === 1);
    t.ok('ツモ直し(成功): 元のツモ牌は山に戻り、牌の総数が保たれる', S.wall.includes(before) && total(S) && !S.over);
    // 発覚時
    S = myTurn(); Math.random = () => 0.1; G.refreshPlayerButtons(); g.findButton(/ツモ直し/).onclick();
    t.ok('ツモ直し(発覚): 罰符で-3000/+1000ずつ、点数の総和は保存', S.over && S.scores[0] === 22000 && S.scores.slice(1).every(x => x === 26000) && S.scores.reduce((a, b) => a + b, 0) === 100000);
    t.ok('ツモ直し(発覚): 回数は減る', S.tricks.swap === 1);
  } finally { Math.random = rnd; }

  // 回数が0なら使えない
  S = myTurn(); S.tricks = { peek: 0, ura: 0, swap: 0 }; G.refreshPlayerButtons();
  t.ok('裏技: 残り0回ならボタンが出ない', !labels().some(l => /透視|裏ドラ|ツモ直し/.test(l)));

  // 保存・復元
  S = myTurn(); S.tricks = { peek: 1, ura: 0, swap: 2 }; G.saveProgress();
  const sv = G.loadSave(); t.eq('保存: 残り回数が保存される', sv.tricks, { peek: 1, ura: 0, swap: 2 });
  t.eq('復元: 不正な値は既定値(2)に戻る', G.sanitizeTricks({ peek: -1, ura: 'x', swap: 100 }), { peek: 2, ura: 2, swap: 2 });
  t.eq('復元: 古い保存データ(tricksなし)は既定値', G.sanitizeTricks(undefined), { peek: 2, ura: 2, swap: 2 });
};
