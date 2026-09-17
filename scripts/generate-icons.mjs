import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public");

const C = {
  bg: [47, 107, 69],
  soil: [37, 84, 54],
  soilLine: [30, 69, 45],
  stalk: [247, 243, 232],
};

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let k = 0; k < 8; k++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

function inRoundedRect(x, y, size, r) {
  const ex = Math.min(Math.max(x, r), size - r);
  const ey = Math.min(Math.max(y, r), size - r);
  const dx = x - ex;
  const dy = y - ey;
  return dx * dx + dy * dy <= r * r;
}

function makeIcon(size, opts = {}) {
  const { maskable = false } = opts;
  const r = size * 0.19;
  const px = Buffer.alloc(size * size * 4);

  const cx = size / 2;
  const stalkW = Math.round(size * 0.078);
  const gap = Math.round(size * 0.035);
  const total = stalkW * 3 + gap * 2;
  const startX = Math.round(cx - total / 2 + stalkW / 2);
  const centers = [startX, startX + stalkW + gap, startX + (stalkW + gap) * 2];
  const tops = [Math.round(size * 0.2), Math.round(size * 0.16), Math.round(size * 0.23)];
  const bottoms = [Math.round(size * 0.76), Math.round(size * 0.8), Math.round(size * 0.74)];
  const soilTop = Math.round(size * 0.78);

  const idx = (x, y) => (y * size + x) * 4;

  const halfW = Math.floor(stalkW / 2);
  const capR = halfW;

  function inStalk(x, y, xc, top, bottom) {
    const dx = x - clamp(x, xc - halfW, xc + halfW);
    const dy = y - clamp(y, top, bottom);
    return dx * dx + dy * dy <= capR * capR;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let inside = true;
      if (!maskable) {
        inside = inRoundedRect(x, y, size, r);
      }
      if (!inside) continue;

      let col = C.bg;

      if (y >= soilTop) {
        col = (y - soilTop) % Math.max(2, Math.round(size * 0.011)) === 0 ? C.soilLine : C.soil;
      }

      for (let s = 0; s < centers.length; s++) {
        const xc = centers[s];
        let inStalkNow = inStalk(x, y, xc, tops[s], bottoms[s]);
        if (inStalkNow && y < soilTop && y > tops[s] - capR && y < bottoms[s] + capR) {
          col = C.stalk;
          break;
        }
      }

      px[idx(x, y)] = col[0];
      px[idx(x, y) + 1] = col[1];
      px[idx(x, y) + 2] = col[2];
      px[idx(x, y) + 3] = 255;
    }
  }

  return encodePng(size, size, px);
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "icon-512.png"), makeIcon(512));
writeFileSync(join(OUT, "icon-192.png"), makeIcon(192));
writeFileSync(join(OUT, "icon-maskable-512.png"), makeIcon(512, { maskable: true }));
writeFileSync(join(OUT, "apple-touch-icon.png"), makeIcon(180));
console.log("Ícones gerados em public/.");