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
  const menu = () => { G.refreshPlayerButtons(); G.openTricks(); };
  const full = { peek: 2, ura: 2, yama: 2, guard: 1, swap: 2, lucky: 2, dora: 1 };
  const lastLog = () => g.els.log.children[g.els.log.children.length - 1].textContent;

  // ルール要約
  g.setRules({ trick: 'on' }); t.ok('裏技: ルール要約に「裏技:あり」', /裏技:あり/.test(G.ruleSummaryText(G.readRules())));
  g.setRules({ trick: 'off' }); t.ok('裏技: ルール要約に「裏技:なし」', /裏技:なし/.test(G.ruleSummaryText(G.readRules())));

  // ボタンの出現
  g.setRules({ trick: 'on' }); let S = myTurn(); G.refreshPlayerButtons();
  t.ok('裏技: 手番には「裏技」ボタン1つにまとまる', labels().filter(l => l.includes('裏技')).length === 1 && !labels().some(l => l.includes('透視')));
  g.findButton(/裏技/).onclick();
  t.ok('裏技: 開くと各裏技と「戻る」が出る', ['透視', '裏ドラ', '山読み', 'お守り', 'ツモ直し', '引き寄せ', '戻る'].every(k => labels().some(l => l.includes(k))));
  g.findButton(/戻る/).onclick();
  t.ok('裏技: 「戻る」で元のボタンに戻る', labels().some(l => l.includes('裏技')) && !labels().some(l => l.includes('透視')));
  g.setRules({ trick: 'off' }); S = g.fresh(0); S.turn = 0; S.drawnIdx = 13; S.drawn = S.hands[0][13]; G.refreshPlayerButtons();
  t.ok('裏技: ルールで「なし」にするとボタンが出ない', !labels().some(l => /裏技|透視|裏ドラ|ツモ直し/.test(l)));
  g.setRules({ trick: 'on' });

  // 透視
  S = myTurn(); menu(); g.findButton(/透視/).onclick();
  t.ok('透視: 回数が減り、他家の手牌が表示される', S.tricks.peek === 1 && S.peek === true && /sm/.test(g.els.seat1.innerHTML) && g.els.seat1.innerHTML.length > 0);
  G.openTricks(); t.ok('透視: 使用中は透視ボタンが消える', !labels().some(l => l.includes('透視')));
  G.onPlayerDiscard(0);
  t.ok('透視: 打牌すると表示が終わる', S.peek === false);

  // 裏ドラ見
  S = myTurn(); menu(); g.findButton(/裏ドラ/).onclick();
  t.ok('裏ドラ見: 表示欄が開いたままになる', g.els.hintBox.style.display !== 'none' && /裏ドラ表示牌/.test(g.els.hintBox.innerHTML));
  G.openTricks(); t.ok('裏ドラ見: 回数が減り、同じ局では再使用できない', S.tricks.ura === 1 && S.uraPeeked === true && !labels().some(l => l.includes('裏ドラ')));
  t.ok('裏ドラ見: ログに表示牌が出て、内部コードが漏れない', /裏ドラ表示牌/.test(g.els.log.children[g.els.log.children.length - 1].textContent) && !/[mpsz][0-9]/.test(g.els.log.children[g.els.log.children.length - 1].textContent));

  // ツモ直し: 成功時(乱数を固定)
  const rnd = Math.random;
  try {
    S = myTurn(); const before = S.hands[0][S.drawnIdx], top = S.wall[S.wall.length - 1], wl = S.wall.length;
    Math.random = () => 0.9; menu(); g.findButton(/ツモ直し/).onclick();
    t.ok('ツモ直し(成功): ツモ牌が山の次の牌に替わる', S.hands[0][S.drawnIdx] === top && S.drawn === top && S.wall.length === wl && S.tricks.swap === 1);
    t.ok('ツモ直し(成功): 元のツモ牌は山に戻り、牌の総数が保たれる', S.wall.includes(before) && total(S) && !S.over);
    // 嶺上牌を引き直したら嶺上開花は付かない
    S = myTurn(); S.rinshan = true; Math.random = () => 0.9; G.trickSwap();
    t.ok('ツモ直し(嶺上): 引き直すと嶺上開花の扱いが消える', S.rinshan === false);
    // 発覚時
    S = myTurn(); Math.random = () => 0.1; menu(); g.findButton(/ツモ直し/).onclick();
    t.ok('ツモ直し(発覚): 罰符で-3000/+1000ずつ、点数の総和は保存', S.over && S.scores[0] === 22000 && S.scores.slice(1).every(x => x === 26000) && S.scores.reduce((a, b) => a + b, 0) === 100000);
    t.ok('ツモ直し(発覚): 回数は減る', S.tricks.swap === 1);
  } finally { Math.random = rnd; }

  // 回数が0なら使えない
  S = myTurn(); S.tricks = {}; for (const k in full) S.tricks[k] = 0; G.refreshPlayerButtons();
  t.ok('裏技: 残り0回ならボタンが出ない', !labels().some(l => /裏技|透視|裏ドラ|ツモ直し/.test(l)));

  // 保存・復元
  S = myTurn(); S.tricks = Object.assign({}, full, { peek: 1, ura: 0, guard: 0 }); G.saveProgress();
  const sv = G.loadSave(); t.eq('保存: 残り回数が保存される', sv.tricks, Object.assign({}, full, { peek: 1, ura: 0, guard: 0 }));
  t.eq('復元: 不正な値は既定値に戻る', G.sanitizeTricks({ peek: -1, ura: 'x', swap: 100, guard: null }), full);
  t.eq('復元: 古い保存データ(tricksなし)は既定値', G.sanitizeTricks(undefined), full);
  t.eq('復元: 以前の3種類だけの保存データは、新しい裏技を既定値で補う', G.sanitizeTricks({ peek: 0, ura: 1, swap: 0 }), Object.assign({}, full, { peek: 0, ura: 1, swap: 0 }));

  // 山読み
  S = myTurn(); menu(); const nx = S.wall.slice(-4).reverse(); g.findButton(/山読み/).onclick();
  t.ok('山読み: この先の4枚がログに出る(最初は下家)', S.tricks.yama === 1 && lastLog().includes('(下家)=' + G.tName(nx[0])) && lastLog().includes('あなた=' + G.tName(nx[3])) && total(S));
  t.ok('山読み: 表示欄が開いたままになる', g.els.hintBox.style.display !== 'none' && /この先のツモ/.test(g.els.hintBox.innerHTML));
  G.openTricks(); t.ok('山読み: 打牌するまで再使用できない', !labels().some(l => l.includes('山読み')));

  // お守り
  const tenpai = ['m1','m2','m3','p4','p5','p6','s7','s8','s9','z1','z1','z1','z5'];
  const ronSetup = () => { const S = myTurn(); S.hands[1] = tenpai.slice(); S.hands[0][13] = 'z5'; S.drawn = 'z5'; S.rivers = [[], [], [], []]; S.furitenTemp = [false, false, false, false]; S.furitenPerm = [false, false, false, false]; return S; };
  S = ronSetup(); t.ok('お守り(前提): この打牌はロンされる', G.ronWinners(0, 'z5').includes(1));
  menu(); g.findButton(/お守り/).onclick(); const sc = S.scores.slice(); G.onPlayerDiscard(13);
  t.ok('お守り: ロンを防ぎ、点数は動かず、1回で消える', S.tricks.guard === 0 && S.guard === false && !S.over && S.scores.join() === sc.join());

  const rnd2 = Math.random;
  try {
    // 引き寄せ: テンパイの手に和了牌を引き寄せる
    S = myTurn(); S.hands[0] = tenpai.concat(['z6']); S.drawnIdx = 13; S.drawn = 'z6';
    Math.random = () => 0.9; menu(); g.findButton(/引き寄せ/).onclick();
    t.ok('引き寄せ: 回数が減り、仕込み状態になる', S.tricks.lucky === 1 && S.lucky === true);
    S.hands[0] = tenpai.slice(); S.wall = S.wall.filter(x => x !== 'z5'); S.wall.unshift('z5'); const before = S.wall.length; G.playerDraw(false);
    t.ok('引き寄せ: 次のツモが和了牌になる', S.drawn === 'z5' && S.lucky === false && S.wall.length === before - 1);
    S = myTurn(); Math.random = () => 0.1; menu(); g.findButton(/引き寄せ/).onclick();
    t.ok('引き寄せ(発覚): 局が終わり罰符を払う', S.over === true && S.scores[0] === 22000 && !S.lucky);

    // ドラすり替え
    S = myTurn(); Math.random = () => 0.9;
    S.hands[0] = ['m5','m5','m5','p1','p2','p3','s1','s2','s3','z1','z1','z2','z2','z3'];
    S.doraInd = ['z7']; S.dead[4] = 'z7'; S.wall[0] = 'm4';
    menu(); g.findButton(/ドラすり替え/).onclick();
    t.ok('ドラすり替え: 手牌のドラが増える表示牌に替わる', S.doraInd[0] === 'm4' && S.dead[4] === 'm4' && S.wall[0] === 'z7' && S.tricks.dora === 0);
  } finally { Math.random = rnd2; }

  // リーチ宣言の打牌でも、透視の表示と嶺上の扱いが終わる
  S = myTurn(); S.hands[0] = tenpai.concat(['z6']); S.peek = true; S.rinshan = true; G.doRiichiDiscard(13);
  t.ok('リーチ宣言: 透視の表示と嶺上の扱いが終わる', S.riichi[0] === true && S.peek === false && S.rinshan === false);
};
