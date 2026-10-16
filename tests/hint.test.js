'use strict';
// ヒント(押し引き・牌効率・鳴き判断)の妥当性
const { loadGame } = require('./lib/harness');

exports.name = 'ヒントの妥当性';
exports.run = t => {
  const g = loadGame(); const { G } = g;
  g.setRules(); g.setLevel(1);
  const setup = (hand, extra = {}) => {
    const S = g.fresh(1);
    S.hands[0] = hand.slice(); S.turn = 0; S.drawn = hand[hand.length - 1]; S.drawnIdx = hand.length - 1;
    S.doraInd = ['s1']; S.ura = ['s2']; S.wall = S.wall.slice(0, extra.wall || 60);
    return S;
  };

  // 1) 序盤: 孤立牌を切る(面子・塔子は崩さない)
  setup(['m1', 'm2', 'm3', 'p4', 'p5', 'p6', 's7', 's8', 's9', 'm5', 'm6', 'z1', 'z7', 'p9']);
  let H = G.buildDiscardHint();
  t.ok('孤立牌(東/中/9筒)を切る', ['z1', 'z7', 'p9'].includes(H.best.b));
  t.eq('脅威なしなら牌効率モード', H.mode, 'eff');

  // 2) テンパイを取れる打牌が選ばれる
  setup(['m2', 'm3', 'm4', 'p2', 'p3', 'p4', 's2', 's3', 's4', 'm6', 'm7', 'z1', 'z1', 's9']);
  H = G.buildDiscardHint();
  t.ok('テンパイになる9索を切る', H.best.b === 's9' && H.best.s === 0);
  t.ok('待ち(5萬・8萬)を8枚と数える', H.best.uke === 8);
  t.ok('リーチ/ダマの助言が付く', typeof H.riichiAdv === 'string' && H.riichiAdv.length > 0);

  // 3) 他家リーチ + 自分が遠い → 現物でオリる
  let S = setup(['m1', 'm4', 'm8', 'p2', 'p5', 'p9', 's3', 's6', 's8', 'z2', 'z3', 'z6', 'p5', 'm9'], { wall: 40 });
  S.riichi[1] = true; S.rivers[1] = ['m9', 'z5', 's1', 'p1', 'z7', 'm2'];
  S.dlog = [{ p: 1, t: 'm2' }]; S.riichiAt[1] = 1; S.rivers[2] = ['s9']; S.dlog.push({ p: 2, t: 's9' }, { p: 3, t: 'z2' }); S.rivers[3] = ['z2'];
  H = G.buildDiscardHint();
  t.eq('オリ: 現物(南)を切る', H.best.b, 'z2');
  t.eq('オリ: モードはfold', H.mode, 'fold');
  t.ok('オリ: 放銃率が0', H.best.dealIn === 0);

  // 4) 他家リーチでも自分がテンパイ・高打点なら押す
  S = setup(['m2', 'm3', 'm4', 'p2', 'p3', 'p4', 's2', 's3', 's4', 'm6', 'm7', 'p5', 'p5', 'p6'], { wall: 40 });
  S.riichi[1] = true; S.rivers[1] = ['z5', 's1', 'p1', 'z7', 'm9']; S.riichiAt[1] = 0;
  H = G.buildDiscardHint();
  t.ok('押し: テンパイを取る打牌', H.best.s === 0 && (H.mode === 'push' || H.mode === 'pushsafe'));

  // 5) 和了できるときは和了を最優先
  S = setup(['m1', 'm2', 'm3', 'p2', 'p3', 'p4', 's2', 's3', 's4', 'p6', 'p7', 'p8', 'z2', 'z2']); S.riichi[0] = true;
  H = G.buildDiscardHint();
  t.ok('リーチ中はツモ切りの案内', H.kind === 'info');
  S.riichi[0] = false;
  H = G.buildDiscardHint();
  t.eq('和了形ならツモ和了の案内', H.kind, 'win');

  // 6) 鳴き判断
  S = setup(['m2', 'm3', 'm4', 'p2', 'p3', 'p5', 's2', 's3', 's6', 'z5', 'z5', 'm7', 'm8']); S.hands[0].length = 13; S.waiting = true;
  H = G.buildCallHint({ from: 3, tile: 'z5', ron: false, pon: true, chi: [], minkan: false, aiWin: [] });
  t.eq('役牌ポンを推奨', H.rec, 'pon');
  S = setup(['m2', 'm3', 'm4', 'p2', 'p3', 'p5', 's2', 's3', 's6', 'z1', 'z2', 'm7', 'm9']); S.hands[0].length = 13; S.waiting = true;
  H = G.buildCallHint({ from: 3, tile: 'p4', ron: false, pon: false, chi: [['p2', 'p3'], ['p3', 'p5']], minkan: false, aiWin: [] });
  t.eq('役の見込めないチーは見送り', H.rec, 'pass');
  H = G.buildCallHint({ from: 3, tile: 'p4', ron: true, pon: false, chi: [], minkan: false, aiWin: [] });
  t.eq('ロンできるときはロン', H.rec, 'ron');

  // 7) 乱数の手牌でも例外なく、推奨の添字が有効
  let ok = true;
  for (let i = 0; i < 40; i++) {
    S = g.fresh(Math.floor(Math.random() * 4)); S.turn = 0; S.drawn = S.hands[0][S.hands[0].length - 1]; S.drawnIdx = S.hands[0].length - 1;
    if (S.hands[0].length !== 14) S.hands[0].push(S.wall.pop());
    try { const h = G.buildDiscardHint(); if (h.best && !(h.best.i >= 0 && h.best.i < S.hands[0].length)) ok = false; } catch (e) { ok = false; }
  }
  t.ok('乱数の手牌40通りで例外なし・推奨の添字が有効', ok);
};
