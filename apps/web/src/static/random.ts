/** Uniform random integer in [0, max) from the Web Crypto API. */
export function randomInt(max: number): number {
  const limit = Math.floor(0x1_0000_0000 / max) * max;
  const buf = new Uint32Array(1);
  do crypto.getRandomValues(buf);
  while ((buf[0] as number) >= limit);
  return (buf[0] as number) % max;
}
