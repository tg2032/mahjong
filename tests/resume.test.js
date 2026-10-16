'use strict';
// 対局の中断・再開(各局の開始時に自動保存、「続きから」で再開、終了で保存を消す)
const { loadGame } = require('./lib/harness');

exports.name = '対局の中断・再開';
exports.run = t => {
  const g1 = loadGame(); const { G, els } = g1;
  g1.setRules({ len: 'hanchan', ron: 'atama' }); g1.setLevel(1);
  t.ok('開始前は保存がなく、再開ボタンも出ない', !g1.store.has('mj_save') && els.resumeBtn.style.display === 'none');

  g1.timers.length = 0; G.newGame(2);
  let sv = JSON.parse(g1.store.get('mj_save') || 'null');
  t.ok('対局開始で自動保存される', !!sv && sv.v === 1);
  t.ok('保存内容: 局・親・点数・ルール', sv && sv.round === 0 && sv.oya === 2 && sv.scores.every(x => x === 25000) && sv.rules.len === 'hanchan' && sv.rules.ron === 'atama' && sv.rounds === 8);

  // 1局進めて点数が変わると、次の局の開始時に保存が更新される
  const S = G.S; S.scores = [31000, 22000, 24000, 23000]; S.honba = 2; S.kyotaku = 1; S.oya = 1;
  G.nextKyoku(true); g1.timers.forEach(f => f());
  sv = JSON.parse(g1.store.get('mj_save'));
  t.ok('局が進むと保存が更新される(点数・本場・供託)', sv.scores[0] === 31000 && sv.honba === 3 && sv.kyotaku === 0);

  // 別セッション(ブラウザを開き直した想定)で保存を読む
  const g2 = loadGame(undefined, { store: g1.store });
  t.ok('開き直すと「続きから」が出る', g2.els.resumeBtn.style.display === '' && /続きから/.test(g2.els.resumeBtn.textContent));
  t.ok('ボタンに局と本場が表示される', /東1局/.test(g2.els.resumeBtn.textContent) && /3本場/.test(g2.els.resumeBtn.textContent));
  g2.els.resumeBtn.onclick();
  const S2 = g2.G.S;
  t.ok('再開: 点数・本場・親・ルールが復元される', S2.scores[0] === 31000 && S2.honba === 3 && S2.oya === 1 && S2.rules.len === 'hanchan' && S2.rounds === 8);
  t.ok('再開: 配牌からやり直し(親だけ14枚)', S2.hands.every((h, p) => h.length === (p === S2.oya ? 14 : 13)));
  g2.flush(60);
  t.ok('再開した対局が進行する', S2.rivers.some(r => r.length > 0));

  // 対局終了で保存が消える
  S2.scores = [31000, 22000, 24000, 23000]; g2.G.endGame('テスト');
  t.ok('対局終了で保存が消える', !g2.store.has('mj_save'));
  const g3 = loadGame(undefined, { store: g2.store });
  t.ok('終了後は「続きから」が出ない', g3.els.resumeBtn.style.display === 'none');

  // 壊れた保存データは無視される
  for (const bad of ['{', 'null', '{"v":1}', '{"v":1,"scores":[1,2,3],"round":0,"rounds":4,"oya":0,"honba":0,"kyotaku":0,"rules":{}}', '{"v":1,"scores":[1,2,3,4],"round":9,"rounds":4,"oya":0,"honba":0,"kyotaku":0,"rules":{}}', '{"v":1,"scores":[1,2,3,"x"],"round":0,"rounds":4,"oya":0,"honba":0,"kyotaku":0,"rules":{}}']) {
    const st = new Map([['mj_save', bad]]);
    const g = loadGame(undefined, { store: st });
    t.ok('壊れた保存は無視: ' + bad.slice(0, 24), g.els.resumeBtn.style.display === 'none');
  }
};
