'use strict';
// 見た目に関する指定の固定(うっかり戻らないようにする)
const { loadGame } = require('./lib/harness');

exports.name = '見た目の指定(白は無地 など)';
exports.run = t => {
  const g = loadGame(); const { G } = g;
  const hakuSvg = /<svg[^>]*>([\s\S]*?)<\/svg>/.exec(G.tileHTML('z5'))[1];
  t.ok('白(z5)は枠も文字もない無地', hakuSvg.trim() === '');
  t.ok('白以外の字牌には図柄がある', ['z1', 'z2', 'z3', 'z4', 'z6', 'z7'].every(x => /<text/.test(G.tileHTML(x))));
  t.ok('数牌にはすべて図柄がある', G.TYPES.slice(0, 27).every(x => /<(text|circle|rect|path|g)/.test(G.tileHTML(x))));
  t.ok('赤ドラ(5萬/5筒/5索)の見た目が通常と異なる', ['m', 'p', 's'].every(k => G.tileHTML(k + '0') !== G.tileHTML(k + '5')));
  t.ok('牌の表示に未定義の値が混ざらない', G.TYPES.concat(['m0', 'p0', 's0']).every(x => !/undefined|NaN/.test(G.tileHTML(x))));
  const html = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  t.ok('動きを減らす設定(prefers-reduced-motion)に配慮', /prefers-reduced-motion:\s*reduce/.test(html));
};
