import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma skips its own .env loading when a config file exists, hence the dotenv import.
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    path: path.join('prisma', 'migrations'),
    seed: 'tsx prisma/seed.ts',
  },
});
