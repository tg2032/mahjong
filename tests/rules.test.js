'use strict';
// ルール個別のシナリオ(人和・天和・ダブロン・流局・喰い替え・延長戦・パオ・加槓/槍槓 など)
const { loadGame } = require('./lib/harness');

exports.name = 'ルール個別シナリオ';
exports.run = t => {
  const g = loadGame(); const { G, els } = g;
  const sum = S => S.scores.reduce((a, b) => a + b, 0);
  const dud = () => ['m9', 'm9', 'p1', 'p5', 's1', 's9', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'm5'];
  const win13 = () => ['m1', 'm2', 'p2', 'p3', 'p4', 's2', 's3', 's4', 'p6', 'p7', 'p8', 'z2', 'z2']; // m3待ち(役なし)
  const w14 = ['m2', 'm3', 'm4', 'p2', 'p3', 'p4', 's2', 's3', 's4', 'p6', 'p7', 'p8', 'z2', 'z2'];
  const pon = b => ({ type: 'pon', tiles: [b, b, b], closed: false });
  const next = () => els.nextBtn.onclick();
  const title = () => els.resTitle.textContent;
  let S;

  // ===== 配牌・親 =====
  for (const oya of [0, 1, 2, 3]) {
    g.setRules(); S = g.fresh(oya);
    t.ok(`親${oya}: 親だけ14枚`, S.hands.every((h, p) => h.length === (p === oya ? 14 : 13)));
    g.flush(40);
    t.ok(`親${oya}: 最初の巡目後も手牌が13/14枚`, S.hands.every((h, p) => [13, 14].includes(h.length + 3 * S.melds[p].length)));
  }
  t.ok('サイコロ: 合計2〜12から親が0〜3', [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].every(n => { const o = G.oyaFromDice(n); return o >= 0 && o <= 3; }));
  t.eq('サイコロ: 合計1→自分,2→下家,5→自分', [G.oyaFromDice(1), G.oyaFromDice(2), G.oyaFromDice(5)], [0, 1, 0]);

  // ===== 人和・天和・地和 =====
  for (const [rule, han] of [['mangan', 5], ['yakuman', 13], ['off', 0]]) {
    g.setRules({ renhou: rule }); S = g.fresh(0);
    t.eq(`人和(${rule})`, G.scoreInfo(1, win13().concat(['m3']), 'm3', false).han, han);
  }
  g.setRules({ renhou: 'mangan' }); S = g.fresh(0);
  t.eq('親は人和にならない', G.scoreInfo(0, win13().concat(['m3']), 'm3', false).han, 0);
  S.rivers[1] = ['z1'];
  t.eq('自分が捨てた後は人和にならない', G.scoreInfo(1, win13().concat(['m3']), 'm3', false).han, 0);
  S.rivers[1] = []; S.melds[2] = [pon('z5')];
  t.eq('誰かが鳴いた後は人和にならない', G.scoreInfo(1, win13().concat(['m3']), 'm3', false).han, 0);
  S.melds[2] = [];
  const tn = G.scoreInfo(0, w14, 'z2', true);
  t.ok('天和(親の配牌ツモ)', tn.han === 13 && tn.yaku[0][0] === '天和');
  S.rivers[0] = ['m9'];
  t.ok('地和(子の最初のツモ)', (() => { const r = G.scoreInfo(1, w14, 'z2', true); return r.han === 13 && r.yaku[0][0] === '地和'; })());
  S.rivers[1] = ['m1'];
  t.ok('子が一度捨てた後は地和でない', G.scoreInfo(1, w14, 'z2', true).han < 13);

  // ===== ダブロン / 頭ハネ / 三家和 =====
  const setWinners = (S, ws) => { for (let p = 0; p < 4; p++) { S.hands[p] = ws.includes(p) ? win13() : dud(); S.riichi[p] = ws.includes(p); } };
  g.setRules({ ron: 'double' }); S = g.fresh(0); setWinners(S, [1, 3]);
  t.eq('ダブロン: 和了者(近い順)', G.ronWinners(0, 'm3'), [1, 3]);
  G.doRonMulti([1, 3], 0, 'm3');
  t.ok('ダブロン: 放銃者が2人に払い、点数の合計は不変', S.scores[0] < 25000 && S.scores[1] > 25000 && S.scores[3] > 25000 && sum(S) === 100000);
  t.ok('ダブロン: 結果画面は「ダブロン 1/2」', /ダブロン 1\/2/.test(title()));
  g.setRules({ ron: 'atama' }); S = g.fresh(0); setWinners(S, [1, 3]);
  G.doRonMulti([1, 3], 0, 'm3');
  t.ok('頭ハネ: 近い1人だけが和了(もう一人は不変)', S.scores[1] > 25000 && S.scores[3] === 25000 && sum(S) === 100000);
  g.setRules({ ron: 'double' }); S = g.fresh(0); setWinners(S, [1, 2, 3]);
  G.afterDiscard(0, 'm3');
  t.ok('三家和: 流局', S.over && /三家和/.test(title()));
  S = g.fresh(0); S.honba = 1; S.kyotaku = 1; setWinners(S, [1, 3]);
  G.doRonMulti([1, 3], 0, 'm3');
  t.ok('本場・供託は先頭の和了者だけが受け取る', S.scores[1] - 25000 > S.scores[3] - 25000);

  // ===== 途中流局 =====
  g.setRules(); S = g.fresh(1);
  S.hands[0] = ['m1', 'm9', 'p1', 'p9', 's1', 's9', 'z1', 'z2', 'z3', 'm5', 'p5', 's5', 's6'];
  S.turn = 0; S.wall.push('p6'); G.playerDraw(false);
  const kb = g.findButton(/^九種/);
  t.ok('九種九牌: ボタンが出る', !!kb);
  const hb = S.honba, oy = S.oya; kb.onclick(); next();
  t.ok('九種九牌: 流局し、親は連荘(本場+1)', G.S.oya === oy && G.S.honba === hb + 1);
  S = g.fresh(1); S.hands[0] = ['m1', 'm2', 'm3', 'p1', 'p9', 's1', 's9', 'z1', 'z2', 'm5', 'p5', 's5', 's6']; S.turn = 0; S.wall.push('p6'); G.playerDraw(false);
  t.ok('九種九牌: 8種以下ではボタンが出ない', !g.findButton(/^九種/));
  g.setRules(); S = g.fresh(0); S.rivers = [['z1'], ['z1'], ['z1'], ['z1']]; G.afterDiscard(3, 'z1');
  t.ok('四風連打', S.over && /四風連打/.test(title()));
  S = g.fresh(0); S.melds[1] = [pon('z5')]; S.rivers = [['z1'], ['z1'], ['z1'], ['z1']]; G.afterDiscard(3, 'z1');
  t.ok('四風連打: 鳴きがあれば成立しない', !S.over);
  S = g.fresh(2); S.riichi = [true, true, true, true]; S.kyotaku = 4; G.afterDiscard(3, 'p9');
  t.ok('四家立直: 流局', S.over && /四家立直/.test(title()));
  next(); t.ok('四家立直: 親連荘・供託持越し', G.S.kyotaku === 4 && G.S.honba === 1);
  const K = () => ({ type: 'kan', tiles: ['z1', 'z1', 'z1', 'z1'] });
  S = g.fresh(0); S.kanCount = 4; S.melds = [[K()], [K()], [K()], [K()]]; G.afterDiscard(3, 'p9');
  t.ok('四槓散了', S.over && /四槓散了/.test(title()));
  S = g.fresh(0); S.kanCount = 4; S.melds = [[K(), K(), K(), K()], [], [], []]; G.afterDiscard(3, 'p9');
  t.ok('四槓散了: 1人が4槓なら成立しない', !S.over);
  g.setRules({ abortive: 'off' }); S = g.fresh(0); S.rivers = [['z1'], ['z1'], ['z1'], ['z1']];
  t.ok('途中流局なし設定', !G.isSuufuurenda());

  // ===== 流し満貫 =====
  g.setRules(); S = g.fresh(1);
  for (let p = 0; p < 4; p++) S.hands[p] = ['m1', 'm4', 'm7', 'p2', 'p5', 'p8', 's3', 's6', 's9', 'z2', 'z3', 'z4', 'z5'];
  S.wall = []; S.rivers = [['m1', 'z1', 'p9'], ['m5'], ['p3'], ['s4']];
  G.ryukyoku();
  t.ok('流し満貫(子): 親4000+子2000ずつ=+8000', S.scores[0] === 33000 && S.scores[1] === 21000 && S.scores[2] === 23000 && S.scores[3] === 23000);
  S = g.fresh(1);
  for (let p = 0; p < 4; p++) S.hands[p] = ['m1', 'm4', 'm7', 'p2', 'p5', 'p8', 's3', 's6', 's9', 'z2', 'z3', 'z4', 'z5'];
  S.wall = []; S.rivers = [['m5'], ['z1', 'm9'], ['p3'], ['s4']]; G.ryukyoku();
  t.ok('流し満貫(親): 3人から4000ずつ=+12000', S.scores[1] === 37000 && sum(S) === 100000);
  S = g.fresh(1);
  for (let p = 0; p < 4; p++) S.hands[p] = ['m1', 'm4', 'm7', 'p2', 'p5', 'p8', 's3', 's6', 's9', 'z2', 'z3', 'z4', 'z5'];
  S.wall = []; S.rivers = [['m1', 'z1'], ['m5'], ['p3'], ['s4']]; S.called[0] = true; G.ryukyoku();
  t.ok('流し満貫: 鳴かれたら不成立', title() === '流局');

  // ===== 喰い替え禁止 =====
  g.setRules(); S = g.fresh(1);
  const ks = (k, tile, o) => [...G.kuikaeSet(k, tile, o)].sort().join(',');
  t.eq('ポン: 同じ牌のみ', ks('pon', 'm5'), 'm5');
  t.eq('チー3-4+5: 5と2', ks('chi', 'm5', ['m3', 'm4']), 'm2,m5');
  t.eq('チー4-5+3: 3と6', ks('chi', 'm3', ['m4', 'm5']), 'm3,m6');
  t.eq('嵌張3-5+4: 4のみ', ks('chi', 'm4', ['m3', 'm5']), 'm4');
  t.eq('辺張1-2+3: 3のみ', ks('chi', 'm3', ['m1', 'm2']), 'm3');
  S.hands[0] = ['m3', 'm4', 'm2', 'm5', 'p1', 'p9', 's1', 's9', 'z2', 'z3', 'z4', 'z6', 'z7']; S.hands[3] = ['m9']; S.rivers[3] = ['m5']; S.turn = 3;
  G.doChi(0, 3, 'm5', ['m3', 'm4']);
  const n0 = S.hands[0].length; G.onPlayerDiscard(S.hands[0].indexOf('m5'));
  t.ok('喰い替え: 鳴いた牌(5)は切れない', S.hands[0].length === n0);
  G.onPlayerDiscard(S.hands[0].indexOf('m2'));
  t.ok('喰い替え: 反対側の筋(2)も切れない', S.hands[0].length === n0);
  G.onPlayerDiscard(S.hands[0].indexOf('p1'));
  t.ok('喰い替え: 他の牌は切れて解除される', S.hands[0].length === n0 - 1 && S.kuikae === null);
  t.ok('他に切る牌がなければ鳴けない', !G.callLeavesDiscard(['m5', 'm5', 'm5'], ['m5', 'm5'], G.kuikaeSet('pon', 'm5')));
  g.setRules({ kuikae: 'off' }); S = g.fresh(1);
  t.eq('喰い替えなし設定', G.kuikaeSet('pon', 'm5').size, 0);

  // ===== 延長戦・オーラス止め・トビ =====
  const endState = (rules, round, scores, oya) => { g.setRules(rules); const S = g.fresh(0); S.round = round; S.oya = oya; S.scores = scores.slice(); els.resTitle.textContent = ''; return S; };
  const adv = (S, oyaWin = false, ryu = false, exh = false) => { g.timers.length = 0; G.nextKyoku(oyaWin, ryu, exh); const ended = S.ended; g.timers.forEach(f => f()); return ended; };
  S = endState({ len: 'tonpu' }, 3, [28000, 26000, 24000, 22000], 3);
  t.ok('東風戦: 3万点未満なら南入', !adv(S) && S.rounds === 8 && G.roundName() === '南1局' && G.bakazeOf() === 'z2');
  S.scores = [31000, 25000, 22000, 22000];
  t.ok('南入中: 3万点以上が出たら終了', adv(S));
  S = endState({ len: 'hanchan' }, 7, [29000, 26000, 24000, 21000], 3);
  t.ok('東南戦: 3万点未満なら西入', !adv(S) && S.rounds === 12 && G.roundName() === '西1局' && G.bakazeOf() === 'z3');
  S.round = 11; S.oya = 3; S.scores = [29500, 25000, 23000, 22500];
  t.ok('西入を使い切ったら終了', adv(S));
  S = endState({ len: 'tonpu', extend: 'off' }, 3, [28000, 26000, 24000, 22000], 3);
  t.ok('延長なし: 規定局で終了', adv(S));
  S = endState({ len: 'tonpu' }, 3, [20000, 24000, 25000, 31000], 3);
  t.ok('オーラス: 親が3万点以上トップで和了=和了止め', adv(S, true));
  S = endState({ len: 'tonpu' }, 3, [22000, 24000, 26000, 28000], 3);
  t.ok('オーラス: 3万点未満のトップは続行(延長あり)', !adv(S, true) && S.honba === 1);
  S = endState({ len: 'tonpu', extend: 'off' }, 3, [22000, 24000, 26000, 28000], 3);
  t.ok('延長なし: トップなら点数に関係なく和了止め', adv(S, true));
  S = endState({ len: 'tonpu', allLast: 'tenpai' }, 3, [20000, 24000, 25000, 31000], 3);
  t.ok('聴牌止め: 流局で親が聴牌なら終了', adv(S, true, true, true));
  S = endState({ len: 'tonpu', allLast: 'agari' }, 3, [20000, 24000, 25000, 31000], 3);
  t.ok('和了止めでは流局連荘は続行', !adv(S, true, true, true));
  S = endState({ len: 'tonpu', allLast: 'tenpai' }, 3, [20000, 24000, 25000, 31000], 3);
  t.ok('途中流局では聴牌止めにならない', !adv(S, true, true, false));
  S = endState({ tobi: 'on' }, 0, [-500, 26000, 40000, 34500], 0);
  t.ok('トビ終了', adv(S) && /トビ/.test(els.resScore.textContent));
  S = endState({ tobi: 'off' }, 0, [-500, 26000, 40000, 34500], 0);
  t.ok('トビなし設定では続行', !adv(S));

  // ===== 責任払い(パオ) =====
  g.setRules(); S = g.fresh(0);
  S.melds[1] = [pon('z5'), pon('z6'), pon('z7')]; G.setPao(1, 3);
  t.eq('パオ: 3枚目の三元牌を鳴かせた人が責任者', S.pao[1], { q: 3, kind: 'dragon' });
  S.hands[1] = ['m2', 'm3', 'm4', 'p5', 'p5']; S.drawn = 'p5'; S.scoresAtStart = S.scores.slice();
  G.doTsumo(1);
  t.ok('パオ(ツモ): 責任者が全額32000', S.scores[1] === 57000 && S.scores[3] === -7000 && sum(S) === 100000);
  S = g.fresh(0); S.melds[1] = [pon('z5'), pon('z6'), pon('z7')]; G.setPao(1, 3); S.hands[1] = ['m2', 'm3', 'm4', 'p5'];
  G.doRonMulti([1], 2, 'p5');
  t.ok('パオ(ロン): 責任者と放銃者が半額ずつ', S.scores[2] === 9000 && S.scores[3] === 9000 && S.scores[1] === 57000);
  S = g.fresh(0); S.melds[1] = [pon('z5'), pon('z6'), pon('z7')]; G.setPao(1, 3); S.hands[1] = ['m2', 'm3', 'm4', 'p5'];
  G.doRonMulti([1], 3, 'p5');
  t.ok('パオ(ロン): 放銃者=責任者なら全額', S.scores[3] === -7000 && S.scores[2] === 25000);
  S = g.fresh(0); S.melds[1] = [pon('z5'), pon('m3')]; S.melds[1].push(pon('z6')); G.setPao(1, 3);
  t.ok('パオ: 三元牌が2種類だけなら成立しない', S.pao[1] === null);
  S = g.fresh(0); S.melds[1] = [pon('z1'), pon('z2'), pon('z3'), pon('z4')]; G.setPao(1, 2);
  t.eq('パオ: 大四喜', S.pao[1], { q: 2, kind: 'wind' });
  g.setRules({ pao: 'off' }); S = g.fresh(0); S.melds[1] = [pon('z5'), pon('z6'), pon('z7')]; G.setPao(1, 3);
  t.ok('パオなし設定', S.pao[1] === null);

  // ===== 加槓・槍槓・リーチ後の暗槓 =====
  g.setRules(); S = g.fresh(0); S.turn = 0;
  S.melds[0] = [pon('p5')]; S.hands[0] = ['m1', 'm2', 'm3', 's2', 's3', 's4', 'z1', 'z1', 'p5', 'm7']; S.drawn = 'p5'; S.drawnIdx = 8;
  G.refreshPlayerButtons();
  const kk = g.findButton(/^加槓/);
  t.ok('加槓ボタンが出る', !!kk);
  const kc0 = S.kanCount; kk.onclick();
  t.ok('加槓: ポンが槓に変わり嶺上牌を引く', S.melds[0][0].type === 'kan' && S.melds[0][0].tiles.length === 4 && S.kanCount === kc0 + 1 && S.rinshan === true);
  S = g.fresh(0); S.riichi[1] = true; S.hands[1] = win13(); S.hands[0] = dud(); S.hands[3] = dud();
  S.melds[2] = [pon('m3')]; S.hands[2] = ['p1', 'p5', 's1', 's6', 's9', 'z2', 'm3', 'z4', 'z6']; S.turn = 2;
  G.doKakan(2, 0);
  t.ok('槍槓: 待ちの牌での加槓はロンされ、加槓は成立しない', S.over && /ロン/.test(title()) && S.melds[2][0].type === 'pon' && els.resTable.innerHTML.includes('槍槓'));
  const riichiHand = (h13, d) => { const S = g.fresh(0); S.riichi[0] = true; S.riichiAt[0] = 0; S.hands[0] = h13.concat([d]); S.drawn = d; S.drawnIdx = S.hands[0].length - 1; S.turn = 0; return S; };
  S = riichiHand(['m2', 'm3', 'm4', 'p5', 'p5', 'p5', 's2', 's3', 's4', 's6', 's7', 'z1', 'z1'], 'p5');
  t.ok('リーチ後の暗槓: 待ちが変わらなければ可', G.riichiAnkanOK(0, 'p5'));
  S = riichiHand(['m2', 'm3', 'm4', 'p5', 'p5', 'p5', 'p6', 'p7', 's2', 's3', 's4', 'z1', 'z1'], 'p5');
  t.ok('リーチ後の暗槓: 待ちが変わる/和了牌なら不可', !G.riichiAnkanOK(0, 'p5'));

  // ===== ダブル役満・切り上げ満貫の設定 =====
  g.setRules({ dbl: 'off' }); S = g.fresh(0);
  t.eq('ダブル役満なし: 国士十三面は13翻', G.yakus(['m1', 'm9', 'p1', 'p9', 's1', 's9', 'z1', 'z2', 'z3', 'z4', 'z5', 'z6', 'z7', 'z7'], [], { riichi: false, ippatsu: false, tsumo: false, seat: 1, bakaze: 'z1', dora: 0, aka: 0, ura: 0, winTile: 'z7' }).han, 13);
  g.setRules({ kiriage: 'on' }); S = g.fresh(0);
  t.eq('切り上げ満貫: 30符4翻=8000', G.scoreByHanFu(4, 30, false, false).ron, 8000);
  t.eq('切り上げ満貫: 60符3翻=8000', G.scoreByHanFu(3, 60, false, false).ron, 8000);
  g.setRules({ aka: 'off' }); S = g.fresh(0);
  t.eq('赤ドラなし: 赤牌0枚', G.buildWall().filter(x => x[1] === '0').length, 0);
  g.setRules({ aka: 'on' }); S = g.fresh(0);
  t.eq('赤ドラあり: 赤牌3枚', G.buildWall().filter(x => x[1] === '0').length, 3);
};
