'use strict';
// ランダムなルール・CPUの強さ・操作で全局を回し、毎手、不変条件を検査する
//  - 牌の総数(各種4枚) - 手牌+副露の枚数(13/14) - 点数の保存(供託込み) - 例外・停止がない
const { loadGame, RULE_KEYS } = require('./lib/harness');

exports.name = 'ランダム総当たり(不変条件)';
exports.run = t => {
  const GAMES = +process.env.FUZZ_GAMES || 8;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const g = loadGame(); const { G, els } = g;
  const T2I = G.T2I, TYPES = G.TYPES;
  const viol = new Map();
  const note = (k, ctx) => { if (!viol.has(k)) viol.set(k, ctx); };

  const check = (S, where) => {
    if (!S || !S.hands || !S.wall) return;
    const c = new Array(34).fill(0);
    const add = x => c[T2I[x]]++;
    S.hands.forEach(h => h.forEach(add)); S.rivers.forEach(r => r.forEach(add));
    S.melds.forEach(ms => ms.forEach(m => m.tiles.forEach(add))); S.wall.forEach(add);
    const drawnRin = 4 - S.rinTiles.length;
    S.dead.forEach((x, i) => { if (i >= drawnRin || i >= 4) add(x); }); // 嶺上で引いた牌は手牌側で数える
    for (let i = 0; i < 34; i++) if (c[i] !== 4) { note('牌数不一致 ' + TYPES[i] + '=' + c[i], where); break; }
    S.hands.forEach((h, p) => { const base = h.length + 3 * S.melds[p].length; if (base !== 13 && base !== 14) note('手牌+副露の枚数異常 ' + base, where); });
    if (!S.over && S.scores.reduce((a, b) => a + b, 0) + S.kyotaku * 1000 !== 100000) note('点数保存違反', where);
    if (S.wall.length < 0 || S.rinTiles.length < 0) note('山の枚数が負', where);
  };

  // 画面の文言(状況表示・ボタン・ログ)に、内部コードや未定義値が漏れていないこと
  const BAD = /undefined|NaN|\[object|(^|[^A-Za-z0-9_])[mpsz][0-9](?![A-Za-z0-9_])/;
  const textBad = new Map();
  let logSeen = 0;
  const scanText = where => {
    const cands = [['状況表示', els.turnInfo && els.turnInfo.textContent]];
    g.buttons().forEach(b => cands.push(['ボタン', b.textContent]));
    const lg = els.log ? els.log.children : [];
    for (; logSeen < lg.length; logSeen++) cands.push(['ログ', lg[logSeen].textContent]);
    cands.forEach(([k, v]) => { if (typeof v === 'string' && BAD.test(v) && !textBad.has(v)) textBad.set(v, k + ' @' + where); });
  };

  const rules = () => {
    const r = {};
    G.RULE_DEFS.forEach(d => { r[d.k] = pick(d.o)[0]; });
    g.setRules(r);
    return r;
  };

  let ends = 0, stalls = 0;
  const errs = [];
  for (let n = 0; n < GAMES; n++) {
    const r = rules(); g.setLevel(pick([0, 1, 1, 2]));
    g.timers.length = 0; if (els.log) els.log.children.length = 0; logSeen = 0; G.newGame(Math.floor(Math.random() * 4));
    let steps = 0, done = false;
    const guard = (label, fn) => { try { fn(); } catch (e) { errs.push(label + ': ' + e.message); done = true; } };
    while (!done && steps++ < 60000) {
      const S = G.S;
      if (g.timers.length) { guard('timer', () => g.timers.shift()()); check(G.S, JSON.stringify(r)); scanText('timer'); continue; }
      if (S.ended) { ends++; done = true; break; }
      if (S.over) { guard('next', () => els.nextBtn.onclick()); continue; }
      if (S.waiting) { const b = pick(g.buttons()); if (b) { guard('call', () => b.onclick()); check(G.S, 'call'); continue; } }
      if (S.turn === 0) {
        const bs = g.buttons();
        if (bs.length && Math.random() < 0.5) { guard('button', () => pick(bs).onclick()); check(G.S, 'button'); continue; }
        guard('discard', () => { const h = S.hands[0]; G.onPlayerDiscard(Math.random() < 0.5 && S.drawnIdx >= 0 ? S.drawnIdx : Math.floor(Math.random() * h.length)); if (Math.random() < 0.05) G.showHint(); });
        check(G.S, 'discard'); continue;
      }
      stalls++; done = true;
    }
  }
  t.ok(`${GAMES}局すべて最後まで終了`, ends === GAMES);
  t.ok('停止(進行不能)がない', stalls === 0);
  t.ok('例外がない' + (errs.length ? ' → ' + errs.slice(0, 3).join(' | ') : ''), errs.length === 0);
  t.ok('画面の文言に内部コード・undefined・NaNがない' + (textBad.size ? ' → ' + [...textBad.entries()].slice(0, 3).map(([v, k]) => JSON.stringify(v) + ' (' + k + ')').join(' | ') : ''), textBad.size === 0);
  t.ok('不変条件の違反がない' + (viol.size ? ' → ' + [...viol.keys()].slice(0, 3).join(' | ') : ''), viol.size === 0);

  // スモーク: 各レベルのCPUで東風戦・半荘を通して遊べる
  for (const lv of [0, 1, 2]) for (const len of ['tonpu', 'hanchan']) {
    g.setRules({ len }); g.setLevel(lv); g.timers.length = 0; G.newGame(Math.floor(Math.random() * 4));
    let ok = false, st = 0;
    try {
      while (st++ < 80000) {
        const S = G.S;
        if (g.timers.length) { g.timers.shift()(); continue; }
        if (S.ended) { ok = true; break; }
        if (S.over) { els.nextBtn.onclick(); continue; }
        if (S.waiting) { const b = g.findButton(/パス/); if (b) { b.onclick(); continue; } }
        if (S.turn === 0) { const w = g.findButton(/^(ツモ|ロン)/); if (w) { w.onclick(); continue; } const k = g.findButton(/^九種/); if (k) { k.onclick(); continue; } G.onPlayerDiscard(S.drawnIdx >= 0 ? S.drawnIdx : S.hands[0].length - 1); continue; }
        break;
      }
    } catch (e) { errs.push('smoke: ' + e.message); }
    t.ok(`CPUレベル${lv}・${len === 'tonpu' ? '東風戦' : '半荘'}を完走`, ok);
  }
};
