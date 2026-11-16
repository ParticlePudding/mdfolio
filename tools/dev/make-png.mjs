// 開発用: 模様入りの PNG を作る（外部ライブラリなし）
//   node tools/dev/make-png.mjs <出力パス> [幅] [高さ]
import fs from 'node:fs';
import zlib from 'node:zlib';

const [out, w = '320', h = '120'] = process.argv.slice(2);
const width = Number(w);
const height = Number(h);

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

// 藍色の濃淡の市松＋斜めの帯
const raw = Buffer.alloc((width * 3 + 1) * height);
for (let y = 0; y < height; y++) {
  const row = y * (width * 3 + 1);
  raw[row] = 0;
  for (let x = 0; x < width; x++) {
    const cell = ((x >> 4) + (y >> 4)) % 2;
    const band = ((x + y) % 64) < 8;
    const [r, g, b] = band ? [0xFF, 0xE2, 0x7A] : cell ? [0x1D, 0x4F, 0x91] : [0xE3, 0xEC, 0xF8];
    raw[row + 1 + x * 3] = r;
    raw[row + 2 + x * 3] = g;
    raw[row + 3 + x * 3] = b;
  }
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0))
]);
fs.writeFileSync(out, png);
console.log(`${out}: ${width}x${height}, ${png.length} bytes`);
