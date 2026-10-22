#!/usr/bin/env node
/**
 * Image optimiser for files already in public/assets.
 *
 * Many photos were dropped into public/ as multi-megabyte PNGs renamed to .webp/.jpg. Browsers
 * still render them (they sniff the real format) but every page paid 2–5 MB per photo. This
 * script re-encodes each image in the format its extension promises, caps its width, and (for
 * destination photos) writes a 2× variant and updates src/config/imageManifest.json.
 *
 * Safe to run repeatedly: files that are already the right format and size are skipped.
 *
 * Usage: npm run optimize-images -w @zproo/web
 */
import { access, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const assets = path.join(root, 'public/assets');
const manifestPath = path.join(root, 'src/config/imageManifest.json');

/** Max width per folder (px). Everything else defaults to 1920. */
const MAX_WIDTH = { addons: 800, blog: 1600, brand: 1200, destinations: 480, parcel: 1920, banners: 1920 };
const FORMAT_OF = { '.webp': 'webp', '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png' };

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

function encoder(img, format) {
  if (format === 'webp') return img.webp({ quality: 74, effort: 5 });
  if (format === 'jpeg') return img.jpeg({ quality: 74, mozjpeg: true, progressive: true });
  return img.png({ compressionLevel: 9, palette: true, quality: 85, effort: 8 });
}

async function writeVariant(input, file, format, width) {
  const tmp = `${file}.tmp`;
  await encoder(sharp(input).rotate().resize({ width, withoutEnlargement: true }), format).toFile(tmp);
  await rename(tmp, file);
}

const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
let before = 0;
let after = 0;
let changed = 0;

for await (const file of walk(assets)) {
  const ext = path.extname(file).toLowerCase();
  const format = FORMAT_OF[ext];
  if (!format) continue;
  const folder = path.relative(assets, file).split(path.sep)[0];
  // Explicit width suffixes (photo-960.webp, banner-1024.webp) win over the folder default.
  const suffix = /-(\d{3,4})\.\w+$/.exec(file);
  const maxWidth = suffix ? Number(suffix[1]) : (MAX_WIDTH[folder] ?? 1920);
  const size = (await stat(file)).size;
  const meta = await sharp(file).metadata();
  before += size;
  const wrongFormat = meta.format !== format;
  const tooWide = (meta.width ?? 0) > maxWidth * 1.05;
  // Destination slots: <name>-480.webp plus a sharp 2× copy for retina screens.
  const retinaFile = file.replace(/-480\.webp$/, '-960.webp');
  const destination =
    folder === 'destinations' &&
    /-480\.webp$/.test(file) &&
    !(await access(retinaFile).then(() => true, () => false));
  if (!wrongFormat && !tooWide && !destination) {
    after += size;
    continue;
  }
  const original = await readFile(file);
  if (destination) {
    await writeVariant(original, retinaFile, 'webp', 960);
    const id = path.relative(assets, file).replace(/-480\.webp$/, '').split(path.sep).join('/');
    if (manifest[id]) manifest[id].widths = [480, 960];
    after += (await stat(retinaFile)).size;
  }
  if (wrongFormat || tooWide) {
    await writeVariant(original, file, format, maxWidth);
    changed += 1;
  }
  after += (await stat(file)).size;
}

await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;
console.log(`Optimised ${changed} images: ${mb(before)} → ${mb(after)}`);
