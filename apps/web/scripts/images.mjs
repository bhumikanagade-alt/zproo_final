#!/usr/bin/env node
/**
 * Image pipeline: turns originals in assets-src/images/<category>/<name>.(jpg|jpeg|png|webp)
 * into responsive WebP variants in public/assets/<category>/<name>-<width>.webp, and writes
 * src/config/imageManifest.json, which <TravelImage> reads.
 *
 * Every image must have an entry in assets-src/images/credits.json (author, source, license);
 * the script refuses to publish uncredited images.
 *
 * Usage: npm run images -w @zproo/web
 */
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const sourceDir = path.join(root, 'assets-src/images');
const outputDir = path.join(root, 'public/assets');
const manifestPath = path.join(root, 'src/config/imageManifest.json');
const WIDTHS = [480, 960, 1600];
const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const credits = JSON.parse(await readFile(path.join(sourceDir, 'credits.json'), 'utf8'));
const manifest = {};
const problems = [];

for (const category of (await readdir(sourceDir, { withFileTypes: true })).filter((d) =>
  d.isDirectory(),
)) {
  for (const file of await readdir(path.join(sourceDir, category.name))) {
    const ext = path.extname(file).toLowerCase();
    if (!EXTENSIONS.has(ext)) continue;
    const id = `${category.name}/${path.basename(file, ext)}`;
    const credit = credits[id];
    if (!credit?.author || !credit?.source || !credit?.license) {
      problems.push(`${id}: missing author/source/license in credits.json`);
      continue;
    }
    const input = sharp(path.join(sourceDir, category.name, file)).rotate();
    const { width, height } = await input.metadata();
    const { dominant } = await input.stats();
    const widths = WIDTHS.filter((w) => w <= width);
    if (widths.length === 0) widths.push(width);
    await mkdir(path.join(outputDir, category.name), { recursive: true });
    for (const w of widths) {
      await input
        .clone()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 78, effort: 5 })
        .toFile(path.join(outputDir, category.name, `${path.basename(file, ext)}-${w}.webp`));
    }
    const hex = (n) => n.toString(16).padStart(2, '0');
    manifest[id] = {
      width,
      height,
      widths,
      color: `#${hex(dominant.r)}${hex(dominant.g)}${hex(dominant.b)}`,
    };
    console.info(`✓ ${id} (${widths.join(', ')})`);
  }
}

if (problems.length > 0) {
  console.error(`\nNot published:\n  ${problems.join('\n  ')}`);
  process.exitCode = 1;
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.info(`\n${Object.keys(manifest).length} images in ${path.relative(root, manifestPath)}`);
