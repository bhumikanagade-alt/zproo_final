const RECENT_KEY = 'zproo-hotel-recent';

export function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string').slice(0, 4) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(query: string) {
  const value = query.trim();
  if (!value) return;
  try {
    const next = [value, ...readRecent().filter((v) => v.toLowerCase() !== value.toLowerCase())].slice(0, 4);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: recent searches are a convenience only */
  }
}
