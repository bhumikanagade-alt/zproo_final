/**
 * Generates the bike imagery used by the Bike Booking section.
 *
 *   node scripts/generate-bike-art.mjs
 *
 * Output (WebP, same convention as the rest of /public/assets):
 *   public/assets/bikes/<bike-id>-1.webp   studio view
 *   public/assets/bikes/<bike-id>-2.webp   close-up (tank / engine / dashboard area)
 *   public/assets/bikes/<bike-id>-3.webp   city-at-dusk view
 *   public/assets/banners/bike-{1024,1920}.webp   hero banner
 *
 * These are original, shaded vector illustrations rendered with sharp: no third-party artwork
 * and no manufacturer logos. To use licensed photographs instead, drop files named
 * <bike-id>-1.webp … into public/assets/bikes (same names, 960 × 640) and nothing else changes.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '../public/assets');
const OUT = path.join(ROOT, 'bikes');
const BANNERS = path.join(ROOT, 'banners');
mkdirSync(OUT, { recursive: true });
mkdirSync(BANNERS, { recursive: true });

/** id, body type, colour. Keep ids in sync with src/features/bikes/mock/bikes.mock.ts. */
const BIKES = [
  ['honda-activa-6g', 'scooter', '#d9141e'],
  ['tvs-jupiter-125', 'scooter', '#2563eb'],
  ['suzuki-access-125', 'scooter', '#4b5563'],
  ['hero-splendor-plus', 'commuter', '#1f2937'],
  ['honda-shine-125', 'commuter', '#c8141d'],
  ['bajaj-pulsar-150', 'naked', '#1d4ed8'],
  ['yamaha-r15-v4', 'sports', '#1e40af'],
  ['ktm-duke-200', 'naked', '#f97316'],
  ['royal-enfield-classic-350', 'cruiser', '#3f5a45'],
  ['royal-enfield-himalayan', 'adventure', '#cbd5e1'],
  ['ola-s1-pro', 'escooter', '#0d9488'],
  ['ather-450x', 'escooter', '#84cc16'],
];

/* ───────────── colour helpers ───────────── */
const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hex = (r, g, b) => `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
};
const lighten = (c, t) => mix(c, '#ffffff', t);
const darken = (c, t) => mix(c, '#000000', t);

const TYRE = '#16161a';
const POL = (deg, r, cx = 0, cy = 0) => [cx + Math.cos((deg * Math.PI) / 180) * r, cy + Math.sin((deg * Math.PI) / 180) * r];
const f = (n) => Math.round(n * 10) / 10;

/* ───────────── shared parts (design space: ground y = 0, bike faces right) ───────────── */
function defs(uid, c) {
  return `
  <linearGradient id="${uid}body" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${lighten(c, 0.38)}"/><stop offset="0.35" stop-color="${c}"/><stop offset="1" stop-color="${darken(c, 0.38)}"/>
  </linearGradient>
  <linearGradient id="${uid}metal" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#f3f4f6"/><stop offset="0.45" stop-color="#b6bcc6"/><stop offset="1" stop-color="#6b7280"/>
  </linearGradient>
  <linearGradient id="${uid}dark" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4b5563"/><stop offset="1" stop-color="#14171c"/>
  </linearGradient>
  <linearGradient id="${uid}seat" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#3a3f48"/><stop offset="1" stop-color="#0d0f13"/>
  </linearGradient>
  <radialGradient id="${uid}lamp" cx="0.4" cy="0.4" r="0.7">
    <stop offset="0" stop-color="#ffffff"/><stop offset="0.5" stop-color="#fff3b0"/><stop offset="1" stop-color="#d9a400"/>
  </radialGradient>
  <linearGradient id="${uid}glass" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#e0f2fe" stop-opacity="0.9"/><stop offset="1" stop-color="#7dd3fc" stop-opacity="0.35"/>
  </linearGradient>`;
}

/** A wheel resting on the ground. kind: alloy | wire | scooter. */
function wheel(uid, cx, r, kind = 'alloy', disc = true) {
  const cy = -r;
  let spokes = '';
  if (kind === 'wire') {
    for (let i = 0; i < 18; i += 1) {
      const a = i * 20;
      const [x1, y1] = POL(a, r * 0.16, cx, cy);
      const [x2, y2] = POL(a + 24, r * 0.7, cx, cy);
      spokes += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#aab0ba" stroke-width="1.6"/>`;
    }
  } else {
    // Five-spoke alloy: dark windows between the spokes.
    for (let i = 0; i < 5; i += 1) {
      const a1 = i * 72 + 14;
      const a2 = (i + 1) * 72 - 14;
      const r1 = r * 0.22;
      const r2 = r * 0.66;
      const [ax, ay] = POL(a1, r1, cx, cy);
      const [bx, by] = POL(a1, r2, cx, cy);
      const [dx, dy] = POL(a2, r2, cx, cy);
      const [ex, ey] = POL(a2, r1, cx, cy);
      spokes += `<path d="M${f(ax)} ${f(ay)} L${f(bx)} ${f(by)} A${f(r2)} ${f(r2)} 0 0 1 ${f(dx)} ${f(dy)} L${f(ex)} ${f(ey)} A${f(r1)} ${f(r1)} 0 0 0 ${f(ax)} ${f(ay)} Z" fill="#15171b"/>`;
    }
  }
  return `
  <g>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${TYRE}"/>
    <circle cx="${cx}" cy="${cy}" r="${f(r * 0.93)}" fill="none" stroke="#2b2c31" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="${f(r * 0.72)}" fill="url(#${uid}metal)"/>
    ${kind === 'wire' ? `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.66)}" fill="#1b1d22"/>` : ''}
    ${spokes}
    ${disc ? `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.5)}" fill="none" stroke="#c4c9d1" stroke-width="3" opacity="0.75"/>` : ''}
    <circle cx="${cx}" cy="${cy}" r="${f(r * 0.15)}" fill="url(#${uid}metal)" stroke="#4b5563" stroke-width="1.5"/>
    <circle cx="${cx}" cy="${cy}" r="${f(r * 0.06)}" fill="#374151"/>
  </g>`;
}

const stroke = (d, w, color, extra = '') => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;

/* ───────────── body types ───────────── */

function scooter(uid, c, electric) {
  const rx = 120;
  const fx = 560;
  const rr = 60;
  const fr = 54;
  const body = `url(#${uid}body)`;
  const rearBody = `M52 -96 C44 -170 92 -214 170 -214 L318 -208 C322 -190 316 -164 300 -148 C266 -124 246 -104 246 -88 L196 -88 A76 76 0 0 0 52 -96 Z`;
  return {
    minX: 30,
    maxX: 640,
    top: -345,
    svg: `
    ${wheel(uid, rx, rr, 'scooter', false)}
    ${wheel(uid, fx, fr, 'scooter', true)}
    <rect x="150" y="-66" width="112" height="22" rx="11" fill="url(#${uid}metal)" stroke="#6b7280" stroke-width="1.5"/>
    <rect x="236" y="-64" width="30" height="18" rx="9" fill="#2b2f36"/>
    <path d="M232 -108 L440 -108 C452 -108 458 -98 450 -90 L444 -80 L236 -80 C226 -80 220 -90 224 -98 Z" fill="url(#${uid}dark)"/>
    <path d="M246 -106 L436 -106" stroke="#8b929d" stroke-width="2" opacity="0.6"/>
    <path d="${rearBody}" fill="${body}"/>
    <path d="M70 -150 C80 -190 120 -204 180 -202 L300 -198" fill="none" stroke="${lighten(c, 0.55)}" stroke-width="3" opacity="0.55" stroke-linecap="round"/>
    <path d="M250 -96 C262 -124 290 -140 316 -168" fill="none" stroke="${darken(c, 0.5)}" stroke-width="2" opacity="0.5"/>
    <path d="M96 -216 C150 -240 276 -240 330 -214 L324 -200 L108 -200 Z" fill="url(#${uid}seat)"/>
    <path d="M122 -226 C170 -240 270 -238 316 -216" stroke="#7b8494" stroke-width="2" fill="none" opacity="0.5"/>
    ${stroke('M60 -204 L120 -226 L186 -226', 6, `url(#${uid}metal)`)}
    <rect x="42" y="-186" width="14" height="30" rx="6" fill="#ef4444"/>
    ${stroke(`M528 -250 L${fx - 6} ${-fr}`, 13, `url(#${uid}metal)`)}
    <path d="M${fx - 70} ${-(fr + 28)} C${fx - 40} ${-(fr + 60)} ${fx + 40} ${-(fr + 60)} ${fx + 62} ${-(fr + 20)} L${fx + 52} ${-(fr + 12)} C${fx + 30} ${-(fr + 38)} ${fx - 30} ${-(fr + 40)} ${fx - 62} ${-(fr + 14)} Z" fill="${body}"/>
    <path d="M440 -262 C514 -272 566 -226 554 -164 C548 -128 520 -106 490 -102 L420 -100 C438 -148 430 -212 440 -262 Z" fill="${body}"/>
    <path d="M458 -240 C500 -246 534 -214 530 -170" fill="none" stroke="${lighten(c, 0.55)}" stroke-width="3" opacity="0.5" stroke-linecap="round"/>
    <path d="M452 -266 C482 -304 566 -300 596 -262 L586 -240 C558 -254 510 -252 478 -240 Z" fill="${body}"/>
    <ellipse cx="588" cy="-262" rx="16" ry="20" fill="url(#${uid}lamp)" stroke="#9ca3af" stroke-width="2"/>
    <rect x="${electric ? 516 : 506}" y="-290" width="${electric ? 56 : 42}" height="${electric ? 26 : 20}" rx="${electric ? 5 : 9}" fill="${electric ? '#0b1220' : '#1f2937'}"/>
    ${electric ? `<rect x="522" y="-286" width="44" height="18" rx="3" fill="#38bdf8" opacity="0.8"/>` : ''}
    ${stroke('M486 -280 L468 -334', 4, '#4b5563')}
    <ellipse cx="462" cy="-340" rx="22" ry="11" fill="#1f2937" transform="rotate(-12 462 -340)"/>
    ${stroke('M472 -288 L450 -284', 10, '#111827')}`,
  };
}

/** Motorcycle skeleton shared by the commuter / sport / naked / cruiser / adventure bodies. */
function motorcycle(uid, c, type) {
  const o = {
    commuter: { r: 62, wb: 510, rake: 26, wheel: 'alloy', disc: false },
    naked: { r: 59, wb: 500, rake: 24, wheel: 'alloy', disc: true },
    sports: { r: 58, wb: 490, rake: 23, wheel: 'alloy', disc: true },
    cruiser: { r: 63, wb: 530, rake: 28, wheel: 'wire', disc: true },
    adventure: { r: 68, wb: 560, rake: 26, wheel: 'wire', disc: true },
  }[type];
  const { r, wb, rake } = o;
  const rx = 110;
  const fx = rx + wb;
  const cy = -r;
  const L = r * 2.9;
  const rad = (rake * Math.PI) / 180;
  const [hx, hy] = [fx - Math.sin(rad) * L, cy - Math.cos(rad) * L];
  const body = `url(#${uid}body)`;
  const seatY = type === 'adventure' ? -r * 2.55 : type === 'cruiser' ? -r * 1.95 : -r * 2.2;
  const tailX = rx - 8;
  const engX = rx + wb * 0.37;
  const engY = cy - r * 0.2;
  const parts = [];

  parts.push(wheel(uid, rx, r, o.wheel, o.disc));
  parts.push(stroke(`M${engX + 30} ${engY + 24} L${rx} ${cy}`, 15, `url(#${uid}metal)`));
  parts.push(stroke(`M${rx + 52} ${cy - 10} L${rx + 30} ${seatY + 18}`, 9, type === 'cruiser' ? `url(#${uid}metal)` : '#111827'));
  parts.push(stroke(`M${rx + 52} ${cy - 10} L${rx + 30} ${seatY + 18}`, 3, type === 'naked' ? c : '#f59e0b'));

  const frameColor = type === 'naked' ? darken(c, 0.15) : '#2a2f38';
  parts.push(stroke(`M${hx - 4} ${hy + 20} L${engX + 40} ${engY - 22} L${engX + 40} ${engY + 40}`, type === 'naked' ? 6 : 8, frameColor));
  if (type === 'naked') {
    parts.push(stroke(`M${hx - 4} ${hy + 26} L${engX + 4} ${engY + 38} L${engX + 40} ${engY - 20} M${hx - 10} ${hy + 18} L${engX + 20} ${engY - 26}`, 3.5, frameColor));
  }

  const ew = type === 'cruiser' ? 130 : type === 'adventure' ? 120 : 108;
  const eh = type === 'cruiser' ? 108 : 92;
  parts.push(`<rect x="${engX - ew / 2 + 10}" y="${engY - eh / 2}" width="${ew}" height="${eh}" rx="22" fill="url(#${uid}dark)"/>`);
  for (let i = 0; i < 6; i += 1) {
    parts.push(`<line x1="${engX - ew / 2 + 28}" y1="${engY - eh / 2 + 10 + i * 6}" x2="${engX + ew / 2 - 8}" y2="${engY - eh / 2 + 10 + i * 6}" stroke="#9ca3af" stroke-width="2" opacity="0.5"/>`);
  }
  parts.push(`<circle cx="${engX + 8}" cy="${engY + 14}" r="${type === 'cruiser' ? 28 : 21}" fill="url(#${uid}metal)" stroke="#6b7280" stroke-width="2"/>`);
  parts.push(`<circle cx="${engX + 8}" cy="${engY + 14}" r="${type === 'cruiser' ? 12 : 9}" fill="#374151"/>`);
  if (type === 'cruiser') {
    parts.push(`<rect x="${engX - 16}" y="${engY - eh / 2 - 26}" width="${ew - 24}" height="34" rx="10" fill="url(#${uid}metal)" stroke="#6b7280" stroke-width="1.5"/>`);
  }

  // exhaust
  const exY = cy + r * 0.25;
  if (type === 'sports') {
    parts.push(`<path d="M${fx - 100} ${engY + 38} C${engX + 20} ${engY + 70} ${engX - 80} ${exY + 14} ${rx + 60} ${exY} L${rx + 20} ${exY - 36} L${rx + 26} ${exY - 22} Z" fill="url(#${uid}metal)" stroke="#6b7280" stroke-width="1.5"/>`);
    parts.push(`<path d="M${rx + 130} ${exY - 40} L${rx + 24} ${exY - 38} L${rx + 10} ${exY - 18} L${rx + 130} ${exY - 18} Z" fill="url(#${uid}metal)" stroke="#6b7280" stroke-width="1.5"/>`);
  } else {
    parts.push(stroke(`M${engX + 52} ${engY + 6} C${engX + 70} ${exY - 4} ${engX + 40} ${exY + 14} ${engX} ${exY + 12} L${rx + 110} ${exY + 6}`, 13, `url(#${uid}metal)`));
    const [mx, my] = [rx + 40, exY - 6];
    parts.push(`<path d="M${mx + 160} ${my - 16} L${mx - 20} ${my - 30} L${mx - 36} ${my - 2} L${mx + 160} ${my + 16} Z" fill="url(#${uid}metal)" stroke="#6b7280" stroke-width="1.5"/>`);
    parts.push(`<ellipse cx="${mx - 28}" cy="${my - 16}" rx="7" ry="15" fill="#1f2937" transform="rotate(-8 ${mx - 28} ${my - 16})"/>`);
  }

  // tail / seat / tank
  const tankBack = engX - 20;
  const tankFront = hx - 6;
  const tankTop = type === 'cruiser' ? seatY - 54 : type === 'sports' ? seatY - 58 : seatY - 46;
  const tankBottom = seatY + 6;
  if (type === 'sports') {
    parts.push(`<path d="M${tankBack} ${tankBottom + 14} C${tankBack + 40} ${tankTop - 4} ${tankFront - 60} ${tankTop - 12} ${tankFront - 6} ${tankTop - 16} C${tankFront + 40} ${tankTop - 14} ${fx + 60} ${cy - r * 1.4} ${fx + 54} ${cy - r * 1.1} C${fx + 34} ${cy - r * 0.75} ${fx - 20} ${engY - 8} ${fx - 76} ${engY + 26} L${engX + 10} ${engY + 54} L${tankBack - 18} ${tankBottom + 52} Z" fill="${body}"/>`);
    parts.push(`<path d="M${tankBack - 6} ${tankBottom + 4} C${rx + 120} ${seatY - 20} ${rx + 20} ${seatY - 36} ${tailX - 14} ${seatY - 54} L${tailX - 26} ${seatY - 30} C${rx + 30} ${seatY + 6} ${rx + 90} ${tankBottom + 22} ${tankBack - 6} ${tankBottom + 26} Z" fill="${body}"/>`);
    parts.push(`<path d="M${tankBack + 20} ${tankBottom - 14} L${rx + 110} ${seatY - 4} L${rx + 110} ${seatY + 8} L${tankBack + 14} ${tankBottom + 8} Z" fill="url(#${uid}seat)"/>`);
    parts.push(`<path d="M${tankFront - 40} ${tankTop - 6} C${tankFront + 10} ${tankTop - 54} ${tankFront + 40} ${tankTop - 54} ${tankFront + 62} ${tankTop - 16} L${tankFront - 20} ${tankTop + 4} Z" fill="url(#${uid}glass)" stroke="#bae6fd" stroke-width="1.5"/>`);
    parts.push(`<path d="M${tankBack + 40} ${tankTop + 4} C${tankFront - 80} ${tankTop - 6} ${tankFront - 20} ${tankTop - 8} ${tankFront + 16} ${tankTop - 8}" fill="none" stroke="${lighten(c, 0.6)}" stroke-width="3.5" opacity="0.6" stroke-linecap="round"/>`);
    parts.push(`<path d="M${engX - 40} ${engY + 34} L${fx - 90} ${engY + 16} L${fx - 70} ${engY + 38} Z" fill="${darken(c, 0.45)}" opacity="0.8"/>`);
  } else {
    const seatEnd = type === 'cruiser' ? tailX + 8 : tailX - 14;
    parts.push(`<path d="M${tankBack + 12} ${seatY - 16} C${tankBack - 30} ${seatY - 8} ${rx + 90} ${seatY - 8} ${seatEnd} ${seatY - (type === 'naked' ? 36 : type === 'adventure' ? 20 : 12)} L${seatEnd - 4} ${seatY + 6} C${rx + 70} ${seatY + 16} ${tankBack - 20} ${seatY + 16} ${tankBack + 12} ${seatY + 10} Z" fill="url(#${uid}seat)"/>`);
    const bulge = type === 'cruiser' ? 18 : 6;
    parts.push(`<path d="M${tankBack - 12} ${tankBottom} C${tankBack - 6} ${tankTop + 10} ${tankBack + 40} ${tankTop - bulge} ${engX + 70} ${tankTop - 10} C${tankFront - 30} ${tankTop - 8} ${tankFront + 10} ${tankTop + 8} ${tankFront + 16} ${tankTop + 30} C${tankFront - 20} ${tankBottom + 4} ${engX + 80} ${tankBottom + 12} ${tankBack - 12} ${tankBottom + 10} Z" fill="${body}"/>`);
    parts.push(`<path d="M${tankBack + 14} ${tankTop + 14} C${engX + 20} ${tankTop - 4} ${tankFront - 40} ${tankTop - 4} ${tankFront - 6} ${tankTop + 8}" fill="none" stroke="${lighten(c, 0.6)}" stroke-width="3.5" opacity="0.6" stroke-linecap="round"/>`);
    if (type === 'naked') parts.push(`<path d="M${engX + 40} ${tankTop - 4} L${tankFront + 6} ${tankTop + 6} L${tankFront - 34} ${tankTop + 34} Z" fill="${darken(c, 0.35)}" opacity="0.7"/>`);
    if (type === 'commuter' || type === 'naked') {
      parts.push(`<path d="M${tailX - 16} ${seatY - (type === 'naked' ? 40 : 14)} L${rx + 140} ${seatY - 6} L${rx + 130} ${seatY + 30} C${rx + 60} ${seatY + 40} ${tailX} ${seatY + 8} ${tailX - 16} ${seatY - 14} Z" fill="${body}"/>`);
    }
    if (type === 'adventure') {
      parts.push(`<path d="M${tailX - 40} ${seatY - 28} L${rx + 150} ${seatY - 16} L${rx + 150} ${seatY - 6} L${tailX - 40} ${seatY - 14} Z" fill="#374151"/>`);
      parts.push(stroke(`M${tailX - 40} ${seatY - 10} L${rx + 60} ${seatY + 4}`, 5, '#374151'));
    }
    if (type === 'cruiser') {
      parts.push(`<path d="M${rx - 30} ${cy - r - 18} C${rx} ${cy - r - 46} ${rx + 80} ${cy - r - 46} ${rx + 100} ${cy - r - 14} L${rx + 86} ${cy - r - 6} C${rx + 60} ${cy - r - 30} ${rx + 10} ${cy - r - 30} ${rx - 24} ${cy - r - 4} Z" fill="${body}"/>`);
    }
    if (type === 'commuter') parts.push(`<path d="M${engX - 40} ${tankBottom + 14} L${rx + 80} ${seatY + 40} L${rx + 80} ${cy - r * 0.9} L${engX - 40} ${engY - 36} Z" fill="${body}" opacity="0.95"/>`);
  }

  parts.push(`<rect x="${tailX - 30}" y="${seatY - (type === 'sports' ? 48 : 22)}" width="14" height="12" rx="4" fill="#ef4444"/>`);

  // front fork, fender, wheel
  parts.push(wheel(uid, fx, r, o.wheel, o.disc));
  parts.push(stroke(`M${hx} ${hy} L${fx} ${cy}`, 17, `url(#${uid}metal)`));
  parts.push(stroke(`M${hx - 3} ${hy + 6} L${fx - 6} ${cy - 6}`, 4, '#f3f4f6', 'opacity="0.7"'));
  parts.push(stroke(`M${fx - Math.sin(rad) * 56} ${cy - Math.cos(rad) * 56} L${fx} ${cy}`, 21, '#3b4250'));
  if (type === 'adventure') {
    parts.push(`<path d="M${fx - 70} ${cy - r - 26} C${fx - 30} ${cy - r - 60} ${fx + 60} ${cy - r - 40} ${fx + 96} ${cy - r + 14} L${fx + 84} ${cy - r + 22} C${fx + 50} ${cy - r - 18} ${fx - 20} ${cy - r - 34} ${fx - 62} ${cy - r - 4} Z" fill="${body}"/>`);
  } else {
    parts.push(`<path d="M${fx - 56} ${cy - r - 18} C${fx - 20} ${cy - r - 34} ${fx + 40} ${cy - r - 28} ${fx + 62} ${cy - r + 4} L${fx + 52} ${cy - r + 12} C${fx + 28} ${cy - r - 14} ${fx - 20} ${cy - r - 20} ${fx - 52} ${cy - r} Z" fill="${body}"/>`);
  }
  if (o.disc) parts.push(`<rect x="${fx + 12}" y="${cy - r * 0.5}" width="20" height="30" rx="5" fill="#ef4444" opacity="0.9"/>`);

  // head: lamp, bars, mirror
  const lampX = hx + 28;
  const lampY = hy + (type === 'sports' ? 14 : 8);
  if (type === 'sports') {
    parts.push(`<path d="M${hx - 14} ${hy - 10} C${hx + 20} ${hy - 30} ${hx + 70} ${hy - 6} ${hx + 66} ${hy + 30} L${hx + 40} ${hy + 40} C${hx + 4} ${hy + 30} ${hx - 14} ${hy + 14} ${hx - 14} ${hy - 10} Z" fill="${body}"/>`);
    parts.push(`<path d="M${hx + 28} ${hy + 4} L${hx + 62} ${hy + 14} L${hx + 56} ${hy + 30} L${hx + 30} ${hy + 22} Z" fill="url(#${uid}lamp)" stroke="#475569" stroke-width="1.5"/>`);
  } else if (type === 'naked') {
    parts.push(`<path d="M${hx - 6} ${hy - 14} L${hx + 52} ${hy - 6} L${hx + 56} ${hy + 30} L${hx + 14} ${hy + 40} Z" fill="${body}"/>`);
    parts.push(`<path d="M${hx + 26} ${hy + 2} L${hx + 56} ${hy + 6} L${hx + 52} ${hy + 26} L${hx + 24} ${hy + 22} Z" fill="url(#${uid}lamp)" stroke="#475569" stroke-width="1.5"/>`);
  } else {
    const lr = type === 'cruiser' ? 31 : type === 'adventure' ? 26 : 25;
    parts.push(`<circle cx="${lampX}" cy="${lampY + 8}" r="${lr}" fill="url(#${uid}lamp)" stroke="${type === 'cruiser' ? '#d1d5db' : '#475569'}" stroke-width="${type === 'cruiser' ? 5 : 3}"/>`);
    if (type === 'adventure') {
      parts.push(`<path d="M${hx - 6} ${hy - 6} C${hx + 4} ${hy - 62} ${hx + 36} ${hy - 78} ${hx + 50} ${hy - 62} L${hx + 40} ${hy - 6} Z" fill="url(#${uid}glass)" stroke="#bae6fd" stroke-width="1.5"/>`);
    }
  }
  const barY = hy - (type === 'sports' ? 8 : 26);
  const barX = hx - (type === 'sports' ? 6 : type === 'cruiser' ? 34 : 18);
  parts.push(stroke(`M${hx - 2} ${hy + 6} L${barX} ${barY}`, 8, '#2a2f38'));
  parts.push(stroke(`M${barX} ${barY} L${barX - (type === 'sports' ? 24 : 30)} ${barY - (type === 'cruiser' ? 4 : 10)}`, 10, '#111827'));
  parts.push(stroke(`M${barX + 4} ${barY - 4} L${barX + 10} ${barY - 44}`, 3.5, '#4b5563'));
  parts.push(`<ellipse cx="${barX + 10}" cy="${barY - 50}" rx="17" ry="9" fill="#1f2937" transform="rotate(-14 ${barX + 10} ${barY - 50})"/>`);
  if (type === 'adventure') {
    parts.push(`<rect x="${tailX - 44}" y="${seatY - 30}" width="150" height="8" rx="3" fill="#4b5563"/>`);
    parts.push(`<path d="M${engX - 30} ${engY + 50} L${engX + 90} ${engY + 50} L${engX + 70} ${engY + 70} L${engX - 10} ${engY + 70} Z" fill="#374151"/>`);
  }
  parts.push(`<rect x="${engX - 24}" y="${cy + 14}" width="38" height="8" rx="4" fill="#6b7280"/>`);

  const top = Math.min(hy - 92, seatY - 96);
  return { minX: rx - r - 52, maxX: fx + r + 76, top, svg: parts.join('\n') };
}

function bikeArt(uid, type, c) {
  if (type === 'scooter') return scooter(uid, c, false);
  if (type === 'escooter') return scooter(uid, c, true);
  return motorcycle(uid, c, type);
}

/* ───────────── scenes ───────────── */

const W = 960;
const H = 640;
const GROUND = 500;

function place(art, { cx = W / 2, ground = GROUND, maxW = 850, maxH = 430, flip = false, zoom = 1 } = {}) {
  const w = art.maxX - art.minX;
  const h = -art.top;
  const s = Math.min(maxW / w, maxH / h) * zoom;
  const mid = (art.minX + art.maxX) / 2;
  const t = flip
    ? `translate(${f(cx)} ${ground}) scale(${f(-s)} ${f(s)}) translate(${-f(mid)} 0)`
    : `translate(${f(cx)} ${ground}) scale(${f(s)}) translate(${-f(mid)} 0)`;
  return { transform: t, scale: s, w: w * s };
}

const shadow = (cx, ground, w) => `<ellipse cx="${f(cx)}" cy="${ground + 4}" rx="${f(w * 0.52)}" ry="16" fill="#000" opacity="0.28" filter="url(#blur)"/>`;
const COMMON_DEFS = `<filter id="blur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="9"/></filter>`;

function sceneStudio(uid, art, c) {
  const p = place(art);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>${COMMON_DEFS}${defs(uid, c)}
    <linearGradient id="${uid}bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8fafc"/><stop offset="0.7" stop-color="#e5e9f0"/><stop offset="1" stop-color="#cfd5df"/></linearGradient>
    <radialGradient id="${uid}spot" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="${lighten(c, 0.7)}" stop-opacity="0.65"/><stop offset="1" stop-color="${lighten(c, 0.9)}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${uid}floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dfe4ec"/><stop offset="1" stop-color="#bcc4d1"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${uid}bg)"/>
  <ellipse cx="${W / 2}" cy="${GROUND - 120}" rx="400" ry="230" fill="url(#${uid}spot)"/>
  <rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="url(#${uid}floor)"/>
  <line x1="0" y1="${GROUND}" x2="${W}" y2="${GROUND}" stroke="#aeb7c4" stroke-width="2" opacity="0.7"/>
  ${shadow(W / 2, GROUND, p.w)}
  <g transform="${p.transform}">${art.svg}</g>
</svg>`;
}

function sceneDetail(uid, art, c) {
  // Zoomed crop on the tank / engine area under dark studio lighting.
  const p = place(art, { cx: W * 0.5, ground: 640, maxW: 800, maxH: 400, zoom: 1.75 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>${COMMON_DEFS}${defs(uid, c)}
    <radialGradient id="${uid}bg" cx="0.5" cy="0.35" r="0.85"><stop offset="0" stop-color="#3a4452"/><stop offset="0.6" stop-color="#1b212b"/><stop offset="1" stop-color="#0b0e13"/></radialGradient>
    <radialGradient id="${uid}rim" cx="0.75" cy="0.25" r="0.6"><stop offset="0" stop-color="${c}" stop-opacity="0.45"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${uid}bg)"/>
  <rect width="${W}" height="${H}" fill="url(#${uid}rim)"/>
  <g transform="${p.transform}">${art.svg}</g>
</svg>`;
}

function skyline(width, ground, seedStart, minW, maxW, minH, maxH, winChance) {
  let out = '';
  let x = -20;
  let seed = seedStart;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  while (x < width + 40) {
    const w = minW + rnd() * (maxW - minW);
    const h = minH + rnd() * (maxH - minH);
    out += `<rect x="${f(x)}" y="${f(ground - 24 - h)}" width="${f(w)}" height="${f(h + 24)}" fill="#2b2547" opacity="0.93"/>`;
    for (let wy = ground - 24 - h + 14; wy < ground - 44; wy += 22) {
      for (let wx = x + 9; wx < x + w - 12; wx += 18) if (rnd() > winChance) out += `<rect x="${f(wx)}" y="${f(wy)}" width="7" height="10" fill="#fbbf24" opacity="0.78"/>`;
    }
    x += w + 4 + rnd() * 8;
  }
  return out;
}

function sceneDusk(uid, art, c) {
  const p = place(art, { cx: W * 0.52, flip: true, maxW: 760, maxH: 380 });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>${COMMON_DEFS}${defs(uid, c)}
    <linearGradient id="${uid}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="0.45" stop-color="#9d3a6b"/><stop offset="0.8" stop-color="#f97316"/><stop offset="1" stop-color="#fbbf24"/></linearGradient>
    <linearGradient id="${uid}road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3f4a"/><stop offset="1" stop-color="#1c1f27"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${uid}sky)"/>
  <circle cx="${W * 0.2}" cy="${GROUND - 70}" r="64" fill="#fde68a" opacity="0.9"/>
  ${skyline(W, GROUND, 7, 50, 120, 90, 280, 0.62)}
  <rect y="${GROUND - 24}" width="${W}" height="24" fill="#4b4560"/>
  <rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="url(#${uid}road)"/>
  ${Array.from({ length: 7 }, (_, i) => `<rect x="${i * 150 - 20}" y="${GROUND + 70}" width="80" height="8" rx="4" fill="#e5e7eb" opacity="0.75"/>`).join('')}
  ${shadow(W * 0.52, GROUND, p.w)}
  <g transform="${p.transform}">${art.svg}</g>
</svg>`;
}

async function toWebp(svg, file, w = W, h = H) {
  await sharp(Buffer.from(svg), { density: 144 }).resize(w, h).webp({ quality: 84 }).toFile(file);
}

/** Hero banner: dusk skyline with a large bike on the right, clear on the left for the headline. */
async function banner(uid, art, c, w, h) {
  const BW = 1920;
  const BH = 737;
  const ground = 640;
  const s = Math.min(1000 / (art.maxX - art.minX), 480 / -art.top);
  const mid = (art.minX + art.maxX) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BW} ${BH}" width="${BW}" height="${BH}">
  <defs>${COMMON_DEFS}${defs(uid, c)}
    <linearGradient id="${uid}sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1b4b"/><stop offset="0.5" stop-color="#9d3a6b"/><stop offset="0.85" stop-color="#f97316"/><stop offset="1" stop-color="#fbbf24"/></linearGradient>
    <linearGradient id="${uid}road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b3f4a"/><stop offset="1" stop-color="#14161c"/></linearGradient>
  </defs>
  <rect width="${BW}" height="${BH}" fill="url(#${uid}sky)"/>
  <circle cx="1300" cy="${ground - 110}" r="110" fill="#fde68a" opacity="0.85"/>
  ${skyline(BW, ground + 16, 11, 70, 190, 120, 420, 0.68)}
  <rect y="${ground - 24}" width="${BW}" height="24" fill="#4b4560"/>
  <rect y="${ground}" width="${BW}" height="${BH - ground}" fill="url(#${uid}road)"/>
  ${Array.from({ length: 9 }, (_, i) => `<rect x="${i * 240 - 30}" y="${ground + 56}" width="130" height="10" rx="5" fill="#e5e7eb" opacity="0.7"/>`).join('')}
  <ellipse cx="1330" cy="${ground + 6}" rx="${f((art.maxX - art.minX) * s * 0.5)}" ry="20" fill="#000" opacity="0.35" filter="url(#blur)"/>
  <g transform="translate(1330 ${ground}) scale(${f(s)} ${f(s)}) translate(${-f(mid)} 0)">${art.svg}</g>
</svg>`;
  await toWebp(svg, path.join(BANNERS, `bike-${w}.webp`), w, h);
}

for (const [id, type, colour] of BIKES) {
  const uid = id.replace(/[^a-z0-9]/g, '');
  await toWebp(sceneStudio(uid, bikeArt(uid, type, colour), colour), path.join(OUT, `${id}-1.webp`));
  await toWebp(sceneDetail(`${uid}d`, bikeArt(`${uid}d`, type, colour), colour), path.join(OUT, `${id}-2.webp`));
  await toWebp(sceneDusk(`${uid}n`, bikeArt(`${uid}n`, type, colour), colour), path.join(OUT, `${id}-3.webp`));
  console.log('✓', id);
}

await banner('hero', bikeArt('hero', 'cruiser', '#d9141e'), '#d9141e', 1920, 737);
await banner('herob', bikeArt('herob', 'cruiser', '#d9141e'), '#d9141e', 1024, 393);
console.log('✓ banners');
