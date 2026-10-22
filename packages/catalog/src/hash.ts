/**
 * Stable pseudo-random number in [0, 1) for a key (32-bit FNV-1a with a final avalanche). Pure
 * JavaScript so the same prices come out on the server and in the browser.
 */
export function unitHash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 2 ** 32;
}
