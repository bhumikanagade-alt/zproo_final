import { existsSync } from 'node:fs';
import path from 'node:path';

/**
 * The official logo PNG for PDFs and emails. The web app's brand asset is the single source;
 * deployments can point BRAND_LOGO_PATH at a copy.
 */
export function resolveLogoPath(configured?: string): string | undefined {
  const candidates = [
    configured,
    path.resolve(process.cwd(), '../web/public/assets/brand/zproo-go-logo.png'),
    path.resolve(process.cwd(), 'apps/web/public/assets/brand/zproo-go-logo.png'),
    path.resolve(process.cwd(), 'assets/brand/zproo-go-logo.png'),
  ].filter((p): p is string => Boolean(p));
  return candidates.find((p) => existsSync(p));
}
