/**
 * Minimal dependency-free QR Code encoder (byte mode, error-correction level M, versions 1-10).
 * Enough for UPI payment links (up to ~213 bytes). Returns a square boolean matrix (true = dark).
 * Algorithm follows the QR Code Model 2 spec (ISO/IEC 18004).
 */
const ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
const NUM_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

const bit = (x: number, i: number) => ((x >>> i) & 1) !== 0;

function rawModules(ver: number) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}

function gfMul(x: number, y: number) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function rsRemainder(data: number[], degree: number) {
  const gen: number[] = new Array(degree).fill(0);
  gen[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) {
      gen[j] = gfMul(gen[j]!, root);
      if (j + 1 < degree) gen[j]! ^= gen[j + 1]!;
    }
    root = gfMul(root, 2);
  }
  const res: number[] = new Array(degree).fill(0);
  for (const b of data) {
    const f = b ^ res.shift()!;
    res.push(0);
    gen.forEach((c, i) => { res[i]! ^= gfMul(c, f); });
  }
  return res;
}

function alignPositions(ver: number, size: number) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2;
  const step = Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2;
  const r = [6];
  for (let pos = size - 7; r.length < n; pos -= step) r.splice(1, 0, pos);
  return r;
}

export function makeQr(text: string): boolean[][] {
  const bytes = Array.from(new TextEncoder().encode(text));
  let ver = 1;
  for (; ver <= 10; ver++) {
    const cap = Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver]! * NUM_BLOCKS[ver]!;
    if (4 + (ver <= 9 ? 8 : 16) + bytes.length * 8 <= cap * 8) break;
  }
  if (ver > 10) throw new Error('QR data too long');
  const size = ver * 4 + 17;

  // 1. Bit stream
  const bits: number[] = [];
  const push = (v: number, n: number) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  push(0b0100, 4);
  push(bytes.length, ver <= 9 ? 8 : 16);
  bytes.forEach((b) => push(b, 8));
  const dataCap = (Math.floor(rawModules(ver) / 8) - ECC_PER_BLOCK[ver]! * NUM_BLOCKS[ver]!) * 8;
  push(0, Math.min(4, dataCap - bits.length));
  push(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < dataCap; pad ^= 0xec ^ 0x11) push(pad, 8);
  const data: number[] = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));

  // 2. Reed-Solomon + interleave
  const nb = NUM_BLOCKS[ver]!, eccLen = ECC_PER_BLOCK[ver]!;
  const raw = Math.floor(rawModules(ver) / 8);
  const shortBlocks = nb - (raw % nb), shortLen = Math.floor(raw / nb);
  const blocks: number[][] = [];
  for (let i = 0, k = 0; i < nb; i++) {
    const len = shortLen - eccLen + (i < shortBlocks ? 0 : 1);
    const dat = data.slice(k, k + len); k += len;
    const ecc = rsRemainder(dat, eccLen);
    if (i < shortBlocks) dat.push(0);
    blocks.push(dat.concat(ecc));
  }
  const all: number[] = [];
  for (let i = 0; i < blocks[0]!.length; i++)
    blocks.forEach((b, j) => { if (i !== shortLen - eccLen || j >= shortBlocks) all.push(b[i]!); });

  // 3. Matrix
  const m: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const fn: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (x: number, y: number, dark: boolean) => { m[y]![x] = dark; fn[y]![x] = true; };
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]] as const)
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const d = Math.max(Math.abs(dx), Math.abs(dy)), x = cx + dx, y = cy + dy;
      if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
    }
  const ap = alignPositions(ver, size);
  ap.forEach((px, i) => ap.forEach((py, j) => {
    if ((i === 0 && j === 0) || (i === 0 && j === ap.length - 1) || (i === ap.length - 1 && j === 0)) return;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }));
  const drawFormat = (mask: number) => {
    const d = (0 << 3) | mask; // ECC level M = 0b00
    let rem = d;
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    const f = ((d << 10) | rem) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, bit(f, i));
    set(8, 7, bit(f, 6)); set(8, 8, bit(f, 7)); set(7, 8, bit(f, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(f, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(f, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(f, i));
    set(8, size - 8, true);
  };
  drawFormat(0);
  if (ver >= 7) {
    let rem = ver;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const v = (ver << 12) | rem;
    for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3), b = Math.floor(i / 3); set(a, b, bit(v, i)); set(b, a, bit(v, i)); }
  }
  // 4. Place data
  let idx = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
      if (!fn[y]![x] && idx < all.length * 8) { m[y]![x] = bit(all[idx >>> 3]!, 7 - (idx & 7)); idx++; }
    }
  }
  // 5. Best mask
  const maskFn = [
    (x: number, y: number) => (x + y) % 2 === 0, (_x: number, y: number) => y % 2 === 0, (x: number) => x % 3 === 0,
    (x: number, y: number) => (x + y) % 3 === 0, (x: number, y: number) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3) === 0, (x: number, y: number) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x: number, y: number) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ];
  const applyMask = (k: number) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y]![x] && maskFn[k]!(x, y)) m[y]![x] = !m[y]![x]; };
  const penalty = () => {
    let p = 0;
    for (let a = 0; a < size; a++) for (const row of [true, false]) {
      let run = 1;
      for (let b = 1; b < size; b++) {
        const cur = row ? m[a]![b] : m[b]![a], prev = row ? m[a]![b - 1] : m[b - 1]![a];
        if (cur === prev) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
      }
    }
    for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) { const c = m[y]![x]; if (c === m[y]![x + 1] && c === m[y + 1]![x] && c === m[y + 1]![x + 1]) p += 3; }
    const dark = m.flat().filter(Boolean).length;
    p += Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    return p;
  };
  let best = 0, bestP = Infinity;
  for (let k = 0; k < 8; k++) { applyMask(k); drawFormat(k); const p = penalty(); if (p < bestP) { best = k; bestP = p; } applyMask(k); }
  applyMask(best); drawFormat(best);
  return m;
}
