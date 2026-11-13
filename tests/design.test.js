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
  // 対局ログのテキスト化(コピー用)
  g.setRules(); g.fresh(1);
  const lt = G.logText();
  t.ok('対局ログ: 対局開始と親が記録される', /対局開始/.test(lt) && /親:/.test(lt));
  t.ok('対局ログ: 1行1出来事で改行区切り', lt.split('\n').length >= 2);
  t.ok('対局ログに内部コードが漏れない', !/(^|[^A-Za-z0-9_])[mpsz][0-9](?![A-Za-z0-9_])/.test(lt));
  // CPUのキャラ設定
  const C = G.CHARA;
  t.ok('キャラ: CPU3人(下家・対面・上家)に名前と説明がある', !C[0] && [1, 2, 3].every(p => C[p].n && C[p].d && C[p].ic));
  t.ok('キャラ: 台詞がすべての場面で定義されている', [1, 2, 3].every(p => ['riichi', 'pon', 'chi', 'kan', 'tsumo', 'ron', 'dbl', 'ryu'].every(k => C[p].l[k] && C[p].l[k].length >= 1)));
  t.ok('キャラ: 台詞に内部コード・undefinedが混ざらない', [1, 2, 3].every(p => Object.values(C[p].l).flat().every(x => !/undefined|NaN/.test(x))));
  t.ok('キャラ: 台詞を出しても例外が出ない', (() => { try { [1, 2, 3].forEach(p => G.sayAs(p, 'riichi', 'リーチ')); G.sayAs(0, 'pon', 'ポン'); return true; } catch (e) { return false; } })());
  t.ok('キャラ: 名札はキャラ名(あなたはそのまま)', G.charaName(1).includes(C[1].n) && G.charaName(0) === 'あなた');
};
