# Travel imagery

Put original photos here, one folder per category, then run `npm run images -w @zproo/web`.

```
assets-src/images/
  hero/home.jpg
  services/flights.jpg   services/buses.jpg   … (one per service)
  destinations/goa.jpg   destinations/manali.jpg   …
  hotels/goa.jpg …
```

The expected file names are the image IDs in `apps/web/src/config/images.ts`. Any slot without a
photo shows a designed illustration instead, so the site never shows a broken image.

**Every photo needs a credit** in `credits.json`, or the script refuses to publish it:

```json
{
  "destinations/goa": {
    "author": "Photographer name",
    "source": "https://link-to-the-original",
    "license": "Unsplash License"
  }
}
```

Use only images you own or whose licence allows commercial use (e.g. the Unsplash or Pexels
licences, CC0, CC BY with attribution). Don't use photos of identifiable people without a model
release, or photos showing other companies' branding.

The script writes WebP variants at 480, 960 and 1600 px wide to `public/assets/<category>/` and
records sizes and a placeholder colour in `src/config/imageManifest.json`.
