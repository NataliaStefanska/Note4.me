/**
 * Generate PWA PNG icons from the SVG using a minimal PNG encoder.
 * Creates 192x192 and 512x512 icons with the Note.io brand.
 * Run: node scripts/generate-icons.js
 */
import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';

function createPNG(size) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2, cy = size / 2;
  const cornerR = size * 0.1875; // 96/512

  // Rounded rect helper
  function inRoundedRect(x, y, rx, ry, rw, rh, r) {
    if (x < rx || x >= rx + rw || y < ry || y >= ry + rh) return false;
    // Check corners
    const corners = [
      [rx + r, ry + r],
      [rx + rw - r, ry + r],
      [rx + r, ry + rh - r],
      [rx + rw - r, ry + rh - r],
    ];
    for (const [ccx, ccy] of corners) {
      const inCornerBox =
        (x < rx + r && y < ry + r) ||
        (x >= rx + rw - r && y < ry + r) ||
        (x < rx + r && y >= ry + rh - r) ||
        (x >= rx + rw - r && y >= ry + rh - r);
      if (inCornerBox) {
        const dx = x - ccx, dy = y - ccy;
        if (dx * dx + dy * dy > r * r) return false;
      }
    }
    return true;
  }

  function inCircle(x, y, ccx, ccy, r) {
    const dx = x - ccx, dy = y - ccy;
    return dx * dx + dy * dy <= r * r;
  }

  function setPixel(x, y, r, g, b, a = 255) {
    const idx = (y * size + x) * 4;
    // Alpha blend over existing
    const aF = a / 255;
    pixels[idx] = Math.round(r * aF + pixels[idx] * (1 - aF));
    pixels[idx + 1] = Math.round(g * aF + pixels[idx + 1] * (1 - aF));
    pixels[idx + 2] = Math.round(b * aF + pixels[idx + 2] * (1 - aF));
    pixels[idx + 3] = Math.min(255, pixels[idx + 3] + a);
  }

  const s = size / 512; // scale factor

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Background: rounded rect
      if (inRoundedRect(x, y, 0, 0, size, size, cornerR)) {
        setPixel(x, y, 12, 10, 9); // #0C0A09
      }

      // Note pad: rounded rect outline
      const padX = 96 * s, padY = 80 * s, padW = 320 * s, padH = 352 * s, padR = 24 * s;
      const strokeW = 12 * s;
      if (inRoundedRect(x, y, padX - strokeW, padY - strokeW, padW + strokeW * 2, padH + strokeW * 2, padR + strokeW) &&
          !inRoundedRect(x, y, padX + strokeW, padY + strokeW, padW - strokeW * 2, padH - strokeW * 2, padR - strokeW)) {
        setPixel(x, y, 231, 229, 228); // #E7E5E4
      }

      // Lines
      const lineH = 7 * s;
      // Line 1
      if (x >= 152 * s && x <= 360 * s && y >= (176 - 4) * s && y <= (176 + 4) * s) {
        setPixel(x, y, 231, 229, 228);
      }
      // Line 2
      if (x >= 152 * s && x <= 320 * s && y >= (232 - 3.5) * s && y <= (232 + 3.5) * s) {
        setPixel(x, y, 168, 162, 158);
      }
      // Line 3
      if (x >= 152 * s && x <= 340 * s && y >= (284 - 3.5) * s && y <= (284 + 3.5) * s) {
        setPixel(x, y, 168, 162, 158);
      }
      // Line 4
      if (x >= 152 * s && x <= 280 * s && y >= (336 - 3.5) * s && y <= (336 + 3.5) * s) {
        setPixel(x, y, 120, 113, 108);
      }

      // Green circle
      if (inCircle(x, y, 400 * s, 400 * s, 80 * s)) {
        setPixel(x, y, 16, 185, 129); // #10B981
        // Plus sign (white)
        const plusW = 8 * s;
        if ((x >= 370 * s && x <= 430 * s && y >= (400 - plusW / 2) * s && y <= (400 + plusW / 2) * s) ||
            (y >= 370 * s && y <= 430 * s && x >= (400 - plusW / 2) * s && x <= (400 + plusW / 2) * s)) {
          setPixel(x, y, 255, 255, 255);
        }
      }
    }
  }

  // Encode as PNG
  const rawData = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const rowOffset = y * (size * 4 + 1);
    rawData[rowOffset] = 0; // filter: None
    for (let i = 0; i < size * 4; i++) {
      rawData[rowOffset + 1 + i] = pixels[y * size * 4 + i];
    }
  }

  const compressed = deflateSync(rawData);

  function crc32(buf) {
    let c = 0xffffffff;
    const table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let cc = n;
      for (let k = 0; k < 8; k++) cc = (cc & 1) ? (0xedb88320 ^ (cc >>> 1)) : (cc >>> 1);
      table[n] = cc;
    }
    for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeData = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(typeData));
    return Buffer.concat([len, typeData, crc]);
  }

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

writeFileSync('public/icon-192.png', createPNG(192));
writeFileSync('public/icon-512.png', createPNG(512));
console.log('Generated icon-192.png and icon-512.png');
