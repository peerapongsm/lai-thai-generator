import { describe, expect, it } from "vitest";
import {
  hashStringToSeed,
  jitter,
  mulberry32,
  seedToString,
  stringToSeed,
} from "../lib/lai/seed";

describe("mulberry32", () => {
  it("is deterministic: same seed produces the same sequence", () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it("produces values in [0, 1)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 500; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("different seeds produce different sequences", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});

describe("hashStringToSeed", () => {
  it("is deterministic for the same string", () => {
    expect(hashStringToSeed("hello")).toBe(hashStringToSeed("hello"));
  });

  it("differs for different strings", () => {
    expect(hashStringToSeed("hello")).not.toBe(hashStringToSeed("world"));
  });

  it("returns a non-negative uint32", () => {
    const h = hashStringToSeed("ลายไทย");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThanOrEqual(0xffffffff);
  });
});

describe("seedToString / stringToSeed round trip", () => {
  it("round trips arbitrary uint32 seeds", () => {
    for (const seed of [0, 1, 42, 12345, 0xffffffff, 999999]) {
      const s = seedToString(seed);
      expect(stringToSeed(s)).toBe(seed >>> 0);
    }
  });

  it("rejects invalid strings", () => {
    expect(stringToSeed("!!not-base36!!")).toBeNull();
  });
});

describe("jitter", () => {
  it("stays within [-amount, amount]", () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 200; i++) {
      const j = jitter(rng, 3);
      expect(j).toBeGreaterThanOrEqual(-3);
      expect(j).toBeLessThanOrEqual(3);
    }
  });

  it("is zero when amount is zero", () => {
    const rng = mulberry32(7);
    expect(jitter(rng, 0)).toBeCloseTo(0);
  });
});
