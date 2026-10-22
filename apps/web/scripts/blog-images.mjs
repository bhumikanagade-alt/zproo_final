#!/usr/bin/env node
/**
 * Turns your downloaded photos into web-ready HD blog covers.
 *
 *   1. Save photos in apps/web/assets-src/blog/ named after the article slug,
 *      e.g. goa-beyond-the-beaches.jpg (any of jpg/jpeg/png/webp, any size).
 *   2. Run: npm run blog-images   (from apps/web, or `npm run blog-images -w @zproo/web`)
 *   3. Output: public/assets/blog/<slug>.jpg — 1600x1000, sharp, ~200–400 KB.
 *
 * Articles without a photo keep using their built-in illustration.
 */
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const src = path.join(root, 'assets-src', 'blog');
const out = path.join(root, 'public', 'assets', 'blog');
await mkdir(out, { recursive: true });

const files = (await readdir(src)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
if (files.length === 0) console.log(`No photos found in ${src}`);
for (const file of files) {
  const slug = path.parse(file).name;
  const dest = path.join(out, `${slug}.jpg`);
  const info = await sharp(path.join(src, file))
    .rotate()
    .resize(1600, 1000, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(dest);
  console.log(`✓ ${slug}.jpg  ${Math.round(info.size / 1024)} KB`);
}
