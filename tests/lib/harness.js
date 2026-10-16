'use strict';
// index.html の <script> を、画面(DOM)なしで読み込んで操作するためのテスト用ハーネス。
// 各 loadGame() は独立した vm コンテキストで動くので、テスト同士が干渉しない。
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function makeEl(id) {
  return {
    id, style: {}, value: '1', children: [], _h: '', textContent: '', firstChild: {}, scrollTop: 0,
    classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    appendChild(c) { this.children.push(c); },
    querySelector() { return null; }, querySelectorAll() { return []; },
    set innerHTML(v) { this._h = v; this.children = []; },
    get innerHTML() { return this._h; },
  };
}

const RULE_KEYS = ['len', 'ron', 'renhou', 'allLast', 'extend', 'dbl', 'kiriage', 'pao', 'tobi', 'aka', 'kuikae', 'nagashi', 'abortive'];

function loadGame(htmlPath, opts = {}) {
  const file = htmlPath || process.env.MAHJONG_HTML || path.join(__dirname, '..', '..', 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const code = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const els = {};
  const timers = [];
  const store = opts.store || new Map();
  const document = {
    getElementById: id => els[id] || (els[id] = makeEl(id)),
    createElement: () => makeEl('x'),
    addEventListener() {},
    querySelectorAll: () => [],
    querySelector: () => null,
  };
  let alertText = '';
  const sandbox = {
    document, location: { search: '' }, console, Math,
    localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } },
    alert: m => { alertText = String(m); }, confirm: () => true,
    setTimeout: f => { timers.push(f); return 0; }, setInterval: () => 0, clearInterval() {},
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'index.html' });
  // トップレベルの関数はglobalのプロパティ、let/constはコンテキスト内の式として取り出す
  const G = new Proxy({}, {
    get(_, name) {
      if (typeof name !== 'string') return undefined;
      if (name === 'S') return vm.runInContext('S', sandbox);
      if (name in sandbox) return sandbox[name];
      try { return vm.runInContext(name, sandbox); } catch (e) { return undefined; }
    },
    set(_, name, v) {
      if (name === 'S') { sandbox.__v = v; vm.runInContext('S=__v', sandbox); return true; }
      return false;
    },
  });

  const g = {
    G, els, timers, store,
    get alertText() { return alertText; },
    flush(max = 200000) { while (timers.length && max-- > 0) timers.shift()(); },
    // ルール設定(対局開始時に読み取られる)を上書き。指定しないキーは既定値
    setRules(obj = {}) {
      RULE_KEYS.forEach(k => { delete els['rule_' + k]; });
      Object.entries(obj).forEach(([k, v]) => { els['rule_' + k] = makeEl('rule_' + k); els['rule_' + k].value = v; });
    },
    setLevel(l) { els.cpuLevel = makeEl('cpuLevel'); els.cpuLevel.value = String(l); },
    setHintMode(m) { els.hintMode = makeEl('hintMode'); els.hintMode.value = m; },
    buttons() { return (els.controls ? els.controls.children : []).filter(b => !b.disabled); },
    findButton(re) { return g.buttons().find(b => re.test(b.textContent || '')); },
    // 何もない状態の局を用意(手牌は配牌のまま。テスト側で上書きする)
    fresh(oya = 0) {
      timers.length = 0;
      G.newGame(oya);
      timers.length = 0;
      const S = G.S;
      S.melds = [[], [], [], []]; S.rivers = [[], [], [], []];
      S.over = false; S.waiting = false; S.ended = false;
      S.riichi = [false, false, false, false]; S.riichiAt = [-1, -1, -1, -1]; S.dblRiichi = [false, false, false, false];
      S.ippatsu = [false, false, false, false]; S.furitenTemp = [false, false, false, false]; S.furitenPerm = [false, false, false, false];
      S.called = [false, false, false, false]; S.pao = [null, null, null, null]; S.dlog = [];
      S.kuikae = null; S.chankan = false; S.kyotaku = 0; S.honba = 0;
      S.scores = [25000, 25000, 25000, 25000]; S.scoresAtStart = S.scores.slice();
      S.doraInd = ['s7']; S.ura = ['s8'];
      return S;
    },
  };
  return g;
}

// 簡易アサーション
function makeT(name) {
  const t = { name, passed: 0, failed: 0, fails: [] };
  t.ok = (label, cond) => { if (cond) t.passed++; else { t.failed++; t.fails.push(label); } };
  t.eq = (label, actual, expected) => {
    const same = JSON.stringify(actual) === JSON.stringify(expected);
    if (same) t.passed++; else { t.failed++; t.fails.push(`${label}: 期待 ${JSON.stringify(expected)} / 実際 ${JSON.stringify(actual)}`); }
  };
  return t;
}

module.exports = { loadGame, makeT, RULE_KEYS };
