'use strict';
// キーボード操作と、牌の読み上げ名(aria-label)
const { loadGame } = require('./lib/harness');

exports.name = 'キーボード操作・読み上げ名';
exports.run = t => {
  const g = loadGame(); const { G, els } = g;
  g.setRules(); g.setLevel(1);
  const key = k => G.onKey({ key: k, preventDefault() {} });
  let S = g.fresh(0); S.turn = 0; S.drawn = S.hands[0][13]; S.drawnIdx = 13; S.sel = null;
  key('ArrowLeft');
  t.eq('←: ツモ牌の左隣を選択', S.sel && S.sel.i, 12);
  key('ArrowLeft'); key('ArrowLeft');
  t.eq('←を重ねて選択が移る', S.sel.i, 10);
  for (let i = 0; i < 30; i++) key('ArrowLeft');
  t.eq('左端で止まる', S.sel.i, 0);
  for (let i = 0; i < 30; i++) key('ArrowRight');
  t.eq('右端で止まる', S.sel.i, 13);
  key('Escape'); t.ok('Escで選択解除', S.sel === null);
  key('ArrowLeft'); key('ArrowLeft');
  const target = S.hands[0][11]; const before = S.hands[0].length;
  key('Enter');
  t.ok('Enter: 選択した牌を切る', S.hands[0].length === before - 1 && S.rivers[0][S.rivers[0].length - 1] === target);
  S = g.fresh(0); S.turn = 0; S.drawn = S.hands[0][13]; S.drawnIdx = 13; S.sel = null; const dr = S.drawn;
  key(' '); t.ok('選択なしのEnter/Space: ツモ切り', S.rivers[0][0] === dr);
  S = g.fresh(0); S.turn = 0; S.drawn = S.hands[0][13]; S.drawnIdx = 13; const n = S.hands[0].length;
  key('t'); t.ok('T: ツモ切り', S.hands[0].length === n - 1);
  S = g.fresh(0); S.turn = 0; S.drawn = S.hands[0][13]; S.drawnIdx = 13; els.hintBox.style.display = 'none';
  key('h'); t.ok('H: ヒントを表示', els.hintBox.style.display === 'block');
  S = g.fresh(0); S.turn = 2; const l0 = S.hands[0].length; key('Enter');
  t.ok('他家の番のEnterは無視', S.hands[0].length === l0);
  S.over = true; S.turn = 0; key('Enter'); t.ok('局終了後は無視', S.hands[0].length === l0);
  // 牌の読み上げ名
  const names = ['m1', 'm0', 'p5', 'p0', 's9', 'z1', 'z5', 'z7'].map(x => /aria-label="([^"]*)"/.exec(G.tileHTML(x))[1]);
  t.eq('aria-label', names, ['1萬', '赤5萬', '5筒', '赤5筒', '9索', '東', '白', '中']);
  t.ok('全牌にaria-labelがある', G.TYPES.every(x => /aria-label="[^"]+"/.test(G.tileHTML(x))));
};
