// Deterministic PRNG + seed<->string helpers used to jitter pattern
// elements while keeping "same seed => same pattern" reproducible via URL.

export type RNG = () => number;

/** mulberry32: fast, small, deterministic 32-bit PRNG. Returns floats in [0,1). */
export function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash -> uint32, used to turn an arbitrary hash string into a seed. */
export function hashStringToSeed(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A fresh random uint32 seed (not deterministic — for the "สุ่ม" button). */
export function randomSeed(): number {
  return Math.floor(Math.random() * 0x100000000) >>> 0;
}

/** Compact base36 string form of a seed, safe to embed in a URL hash. */
export function seedToString(seed: number): string {
  return (seed >>> 0).toString(36);
}

/** Parse a base36 seed string back to a uint32 seed, or null if invalid. */
export function stringToSeed(s: string): number | null {
  if (!/^[0-9a-z]+$/i.test(s)) return null;
  const n = parseInt(s, 36);
  if (!Number.isFinite(n) || n < 0) return null;
  return n >>> 0;
}

/** Map an RNG draw in [0,1) to a jitter offset in [-amount, amount]. */
export function jitter(rng: RNG, amount: number): number {
  return (rng() * 2 - 1) * amount;
}
