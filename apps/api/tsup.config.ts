import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  outDir: 'dist',
  clean: true,
  sourcemap: true,
  // Internal workspace packages ship TypeScript source, so they are bundled;
  // third-party dependencies stay external and are installed in the runtime image.
  noExternal: [/^@zproo\//],
});
