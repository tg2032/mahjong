'use strict';
// PWA(ホーム画面に追加・オフライン)のファイルが整っていること
const fs = require('fs');
const path = require('path');
const vm = require('vm');

exports.name = 'PWA(マニフェスト・アイコン・Service Worker)';
exports.run = async t => {
  const root = path.join(__dirname, '..');
  const read = f => fs.readFileSync(path.join(root, f));
  const html = read('index.html').toString('utf8');

  let man = null;
  try { man = JSON.parse(read('manifest.webmanifest').toString('utf8')); } catch (e) { /* 下で失敗にする */ }
  t.ok('manifest.webmanifest が正しいJSON', !!man);
  if (man) {
    t.ok('名前・開始URL・表示モード', man.name && man.start_url === './' && man.display === 'standalone');
    t.ok('192/512のアイコンが宣言されている', ['192x192', '512x512'].every(sz => man.icons.some(i => i.sizes === sz)));
    t.ok('maskable アイコンがある', man.icons.some(i => i.purpose === 'maskable'));
    man.icons.forEach(i => t.ok('アイコンのファイルが存在: ' + i.src, fs.existsSync(path.join(root, i.src))));
  }
  for (const [f, size] of [['icon-192.png', 192], ['icon-512.png', 512]]) {
    const b = read(f);
    const sig = b.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    t.ok(`${f} は正しいPNGで ${size}x${size}`, sig && b.readUInt32BE(16) === size && b.readUInt32BE(20) === size);
  }
  let swOk = true;
  try { new vm.Script(read('sw.js').toString('utf8'), { filename: 'sw.js' }); } catch (e) { swOk = false; }
  t.ok('sw.js の構文が正しい', swOk);
  const sw = read('sw.js').toString('utf8');
  t.ok('sw.js: ネットワーク優先で、失敗時にキャッシュを返す', /fetch\(r\)/.test(sw) && /caches\.match/.test(sw));
  t.ok('sw.js: キャッシュ対象のファイルがすべて存在', [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(x => x && x !== '').every(f => fs.existsSync(path.join(root, f))));
  t.ok('index.html がマニフェストとアイコンを参照', /rel="manifest" href="manifest\.webmanifest"/.test(html) && /rel="apple-touch-icon"/.test(html) && /name="theme-color"/.test(html));
  t.ok('index.html が Service Worker を登録(http/https のみ)', /serviceWorker\.register\('sw\.js'\)/.test(html) && /\^https\?:\$/.test(html));

  // ---- Service Worker の動作を模擬環境で検証(install / activate / fetch) ----
  const listeners = {};
  const store = new Map(); const deleted = [];
  const mkRes = body => ({ body, clone() { return this; } });
  const sandbox = {
    self: { addEventListener: (n, f) => { listeners[n] = f; }, skipWaiting() {}, clients: { claim() { return Promise.resolve(); } } },
    location: { origin: 'https://example.test' },
    caches: {
      open: async () => ({ addAll: async urls => { urls.forEach(u => store.set(u, mkRes('asset:' + u))); }, put: async (r, res) => { store.set(r.url || r, res); } }),
      keys: async () => ['mahjong-v0', 'mahjong-v1', 'other'],
      delete: async k => { deleted.push(k); return true; },
      match: async r => store.get(r && r.url ? r.url : r),
    },
    URL, Promise, fetch: null,
  };
  vm.createContext(sandbox);
  vm.runInContext(sw, sandbox);
  t.ok('install/activate/fetch のハンドラが登録される', ['install', 'activate', 'fetch'].every(n => typeof listeners[n] === 'function'));
  let wait; listeners.install({ waitUntil: p => { wait = p; } }); await wait;
  t.ok('install: 必要なファイルをキャッシュ', ['./index.html', './manifest.webmanifest', './icon-192.png'].every(u => store.has(u)));
  listeners.activate({ waitUntil: p => { wait = p; } }); await wait;
  t.ok('activate: 古い版のキャッシュだけ削除', deleted.includes('mahjong-v0') && deleted.includes('other') && !deleted.includes('mahjong-v1'));
  const doFetch = async (url, { method = 'GET', online = true } = {}) => {
    sandbox.fetch = online ? async () => mkRes('net:' + url) : async () => { throw new Error('offline'); };
    let p = null; listeners.fetch({ request: { url, method }, respondWith: x => { p = x; } });
    return p ? await p : undefined;
  };
  let res = await doFetch('https://example.test/index.html');
  t.ok('fetch(オンライン): ネットワークの応答を返す', res && res.body === 'net:https://example.test/index.html');
  await new Promise(r => setTimeout(r, 5));
  t.ok('fetch(オンライン): 応答をキャッシュに保存', store.get('https://example.test/index.html') && store.get('https://example.test/index.html').body === 'net:https://example.test/index.html');
  res = await doFetch('https://example.test/index.html', { online: false });
  t.ok('fetch(オフライン): キャッシュで応答', res && res.body === 'net:https://example.test/index.html');
  res = await doFetch('https://example.test/unknown', { online: false });
  t.ok('fetch(オフライン・未キャッシュ): index.html にフォールバック', res && res.body === 'asset:./index.html');
  t.ok('POSTは素通し(respondWithしない)', (await doFetch('https://example.test/x', { method: 'POST' })) === undefined);
  t.ok('他のオリジンは素通し', (await doFetch('https://cdn.other/x.js')) === undefined);
};

