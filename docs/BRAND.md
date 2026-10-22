# Brand assets

The official ZPROO GO logo is the single source of truth for the brand. It is never redrawn,
recoloured, re-typeset or stretched.

| File                                             | Use                                                    |
| ------------------------------------------------ | ------------------------------------------------------ |
| `apps/web/public/assets/brand/zproo-go-logo.png` | Full-colour logo, transparent background (286 × 67 px) |
| `apps/web/public/assets/brand/favicon.png`       | The "Z" tile from the logo (64 × 64 px)                |

Render the logo through `<Logo />` (`apps/web/src/components/brand/Logo.tsx`). It keeps the
aspect ratio, reserves layout space and sets alt text. On red or dark backgrounds use
`<Logo surface="plate" />`, which puts the unmodified logo on a white plate.

## Provenance: action needed

Only the app-flow reference images were supplied, not a standalone logo file. The current PNGs
were **extracted from the supplied reference image** (the header logo without the tagline). The
mark is unchanged; only the flat background around it was made transparent. They are low
resolution (the source was a 1254 px JPEG).

**When the original logo file (SVG or high-resolution transparent PNG) is available,** replace
the files at the same paths and regenerate the WebP
(`node -e "require('sharp')('apps/web/public/assets/brand/zproo-go-logo.png').webp({lossless:true}).toFile('apps/web/public/assets/brand/zproo-go-logo.webp')"`). If the dimensions differ, update `BRAND.assets.logoSize` in
`packages/config/src/brand.ts`. Nothing else needs to change.

`zproo-go-logo-white.png` was **not** created. The supplied material has no white version at
usable resolution, and a white version must not be invented. The white plate treatment above is
used instead. Add the file if an official white version is provided.

## Colour

Brand red `#D9141E` was sampled from the logo. It is defined in two places that must stay in sync:
`apps/web/src/styles/globals.css` (`--primary`) and `packages/config/src/brand.ts` (`BRAND.colors`,
used by emails and PDFs).

## Travel photography

Photos are not brand assets but follow the same rule: only licensed images, each credited. See
`apps/web/assets-src/images/README.md` for the pipeline. Until photos are added, every slot shows an
illustration rather than a placeholder or stock-looking fake.
