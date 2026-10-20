// ABOUTME: Generates the PWA icon PNGs referenced by public/manifest.webmanifest.
// ABOUTME: Produces solid theme-color (#4f46e5) PNGs via zlib — no image deps needed.

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT_DIR = path.join(__dirname, '..', 'public', 'icons');
const COLOR = { r: 0x4f, g: 0x46, b: 0xe5 }; // manifest theme_color #4f46e5

// Minimal valid truecolor PNG writer (solid fill)
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
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function solidPng(size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: truecolor RGB
  // compression/filter/interlace already 0

  // Raw scanlines: filter byte 0 + RGB pixels
  const row = Buffer.alloc(1 + size * 3);
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = COLOR.r;
    row[2 + x * 3] = COLOR.g;
    row[3 + x * 3] = COLOR.b;
  }
  const raw = Buffer.concat(Array(size).fill(row));
  const idat = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = [
  ...[72, 96, 128, 144, 152, 192, 384, 512].map((s) => ({ name: `icon-${s}x${s}.png`, size: s })),
  // Shortcut icons referenced by manifest "shortcuts"
  { name: 'students.png', size: 192 },
  { name: 'attendance.png', size: 192 },
  { name: 'timetable.png', size: 192 }
];

for (const { name, size } of files) {
  const file = path.join(OUT_DIR, name);
  fs.writeFileSync(file, solidPng(size));
  console.log(`wrote ${file} (${size}x${size}, ${fs.statSync(file).size} bytes)`);
}
