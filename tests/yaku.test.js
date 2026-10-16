'use strict';
// 役の判定と点数表
const { loadGame } = require('./lib/harness');

exports.name = '役の判定・点数表';
exports.run = t => {
  const g = loadGame(); const G = g.G;
  const Y = (h, m, o) => G.yakus(h, m || [], Object.assign({ riichi: false, ippatsu: false, tsumo: false, rinshan: false, haitei: false, houtei: false, seat: 1, bakaze: 'z1', dora: 0, aka: 0, ura: 0, winTile: null }, o || {}));
  const names = r => (r.y || []).map(x => x[0]);
  const H = s => s.split(' ');

  // --- 基本の役
  let r = Y(H('m2 m3 m4 p3 p4 p5 s6 s7 s8 s2 s3 p7 p7 s4'), [], { winTile: 's4', seat: 2 });
  t.ok('平和+断幺九(ロン)', names(r).includes('平和') && names(r).includes('断幺九') && r.han === 2);
  r = Y(H('m2 m3 m4 p3 p4 p5 s6 s7 s8 s2 s4 p7 p7 s3'), [], { winTile: 's3', seat: 2 });
  t.ok('嵌張待ちは平和にならない', !names(r).includes('平和'));
  r = Y(H('m2 m3 m4 p2 p3 p4 s2 s3 s4 m7 m7 p9 p9 p9'), [], { winTile: 'p9' });
  t.ok('三色同順(門前2翻)', names(r).includes('三色同順'));
  r = Y(H('m1 m2 m3 m4 m5 m6 m7 m8 m9 p2 p3 p4 s5 s5'), [], { winTile: 'p4' });
  t.ok('一気通貫(門前2翻)', names(r).includes('一気通貫'));
  r = Y(H('m1 m1 m2 m2 p3 p3 s4 s4 z1 z1 z5 z5 m9 m9'), [], { tsumo: true, winTile: 'm9' });
  t.ok('七対子+門前清自摸和', names(r).includes('七対子') && names(r).includes('門前清自摸和'));
  r = Y(H('m1 m2 m3 p7 p8 p9 s1 s2 s3 z1 z1 z1 m9 m9'), [], { winTile: 'm9' });
  t.ok('チャンタ', names(r).includes('チャンタ'));
  r = Y(H('m2 m3 m4 p5 p6 p7 s2 s3 s4 z5 z5'), [{ type: 'chi', tiles: ['m5', 'm6', 'm7'], closed: false }], { dora: 2, winTile: 's4' });
  t.eq('役がなければドラだけでは和了不可(0翻)', r.han, 0);
  r = Y(H('m3 m3 m3 p3 p3 p3 s3 s3 s3 m7 m8 m9 z2 z2'), [], { winTile: 'm9' });
  t.ok('三色同刻', names(r).includes('三色同刻'));
  r = Y(H('m2 m3 m4 p2 p3 p4 s2 s3 s4 p6 p7 p8 z2 z2'), [], { riichi: true, dblRiichi: true, seat: 2 });
  t.ok('ダブルリーチ(2翻)', names(r).includes('ダブルリーチ') && !names(r).includes('リーチ'));
  r = Y(H('m2 m3 m4 p2 p3 p4 s2 s3 s4 p6 p7 p8 z2 z2'), [], { chankan: true, seat: 2 });
  t.ok('槍槓', names(r).includes('槍槓'));

  // --- 役満とダブル役満
  const kok = H('m1 m9 p1 p9 s1 s9 z1 z2 z3 z4 z5 z6 z7 z7');
  t.eq('国士無双十三面待ち=26翻', Y(kok, [], { winTile: 'z7' }).han, 26);
  t.eq('国士無双=13翻', Y(H('m1 m1 m9 p1 p9 s1 s9 z1 z2 z3 z4 z5 z6 z7'), [], { winTile: 'z7' }).han, 13);
  t.eq('純正九蓮宝燈=26翻', Y(H('m1 m1 m1 m2 m3 m4 m5 m5 m6 m7 m8 m9 m9 m9'), [], { winTile: 'm5', tsumo: true }).han, 26);
  t.eq('九蓮宝燈=13翻', Y(H('m1 m1 m1 m2 m3 m4 m5 m5 m6 m7 m8 m9 m9 m9'), [], { winTile: 'm1', tsumo: true }).han, 13);
  const suu = H('m1 m1 m1 p2 p2 p2 s3 s3 s3 z5 z5 z5 m9 m9');
  t.eq('四暗刻単騎(ロン)=26翻', Y(suu, [], { winTile: 'm9' }).han, 26);
  t.eq('四暗刻(ツモ)=13翻', Y(suu, [], { winTile: 'z5', tsumo: true }).han, 13);
  t.eq('四槓子', Y(H('m5 m5'), [{ type: 'kan', tiles: ['p1', 'p1', 'p1', 'p1'] }, { type: 'kan', tiles: ['p9', 'p9', 'p9', 'p9'] }, { type: 'ankan', tiles: ['s1', 's1', 's1', 's1'], closed: true }, { type: 'kan', tiles: ['z1', 'z1', 'z1', 'z1'] }]).han, 13);
  t.ok('役満には通常の役を足さない', Y(suu, [], { winTile: 'z5', tsumo: true, riichi: true, dora: 3 }).y.length === 1);

  // --- 点数表(子/親・ロン/ツモ)
  const S = G.scoreByHanFu;
  t.eq('子30符1翻ロン=1000', S(1, 30, false, false).ron, 1000);
  t.eq('子30符2翻ロン=2000', S(2, 30, false, false).ron, 2000);
  t.eq('子30符3翻ロン=3900', S(3, 30, false, false).ron, 3900);
  t.eq('子30符4翻ロン=7700', S(4, 30, false, false).ron, 7700);
  t.eq('子40符3翻ロン=5200', S(3, 40, false, false).ron, 5200);
  t.eq('子満貫=8000', S(5, 30, false, false).ron, 8000);
  t.eq('子跳満=12000', S(6, 30, false, false).ron, 12000);
  t.eq('子倍満=16000', S(8, 30, false, false).ron, 16000);
  t.eq('子三倍満=24000', S(11, 30, false, false).ron, 24000);
  t.eq('子役満=32000', S(13, 30, false, false).ron, 32000);
  t.eq('親30符2翻ロン=2900', S(2, 30, true, false).ron, 2900);
  t.eq('親30符4翻ロン=11600', S(4, 30, true, false).ron, 11600);
  t.eq('親満貫=12000', S(5, 30, true, false).ron, 12000);
  t.eq('親倍満=24000', S(8, 30, true, false).ron, 24000);
  t.eq('親役満=48000', S(13, 30, true, false).ron, 48000);
  t.eq('子2翻30符ツモ=500/1000', [S(2, 30, false, true).child, S(2, 30, false, true).dealer], [500, 1000]);
  t.eq('親3翻30符ツモ=2000オール', S(3, 30, true, true).all, 2000);
  t.eq('子満貫ツモ=2000/4000', [S(5, 30, false, true).child, S(5, 30, false, true).dealer], [2000, 4000]);
  t.eq('七対子2翻25符ロン=1600', S(2, 25, false, false).ron, 1600);
  t.eq('ダブル役満(26翻)=64000', S(26, 20, false, false).ron, 64000);
  t.eq('切り上げなし: 30符4翻=7700', S(4, 30, false, false).ron, 7700);
};
