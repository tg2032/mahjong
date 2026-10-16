'use strict';
// PWA用のアイコン(icon-192.png / icon-512.png)を生成する。外部ライブラリ不要。 使い方: node tools/make-icons.js
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x / size, y / size); // 0..1 の座標
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// 背景=緑の卓、中央に象牙色の牌、牌の中に「一筒」(青い輪+赤い点)
const FELT = [15, 107, 77], IVORY = [250, 246, 230], EDGE = [196, 188, 160], BLUE = [27, 95, 184], RED = [210, 52, 52], WHITE = [255, 253, 246];
function sample(u, v) {
  // 牌: 幅0.46 高さ0.62 の角丸長方形(中央)。マスカブル対応で中心の約60%に収める
  const cx = 0.5, cy = 0.5, hw = 0.23, hh = 0.31, rad = 0.06;
  const dx = Math.abs(u - cx) - (hw - rad), dy = Math.abs(v - cy) - (hh - rad);
  const dist = Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) + Math.min(Math.max(dx, dy), 0) - rad;
  if (dist > 0) return FELT;
  if (dist > -0.012) return EDGE;
  const d = Math.hypot(u - cx, v - cy);
  if (d < 0.045) return RED;
  if (d < 0.075) return WHITE;
  if (d < 0.118) return BLUE;
  if (d < 0.140) return WHITE;
  if (d < 0.168) return BLUE;
  return IVORY;
}
function render(size) {
  return png(size, (u, v) => {
    const SS = 3; let r = 0, g = 0, b = 0; // 3x3スーパーサンプリングで輪郭を滑らかに
    for (let i = 0; i < SS; i++) for (let j = 0; j < SS; j++) {
      const c = sample(u + (i + 0.5) / SS / size - 0.5 / size, v + (j + 0.5) / SS / size - 0.5 / size);
      r += c[0]; g += c[1]; b += c[2];
    }
    const n = SS * SS; return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });
}
const out = path.join(__dirname, '..');
for (const s of [192, 512]) fs.writeFileSync(path.join(out, `icon-${s}.png`), render(s));
console.log('icon-192.png / icon-512.png を生成しました');
