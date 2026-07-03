import { describe, expect, it } from "vitest";
import {
  buildPetalTemplate,
  clampPrajamyamParams,
  generatePrajamyam,
  generateRing,
  type Point,
} from "../lib/lai/prajamyam";

const EPS = 1e-6;

function rotate(p: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

function expectClose(a: Point, b: Point) {
  expect(a.x).toBeCloseTo(b.x, 5);
  expect(a.y).toBeCloseTo(b.y, 5);
}

describe("generateRing rotational symmetry", () => {
  it.each([3, 4, 5, 6, 8, 12])(
    "maps petal 0's points onto petal k under rotation by k*2pi/n (n=%i)",
    (n) => {
      const { petals } = generateRing(n, 0.6, 100);
      expect(petals).toHaveLength(n);
      const base = petals[0];
      for (let k = 1; k < n; k++) {
        const angle = (k * 2 * Math.PI) / n;
        for (const key of Object.keys(base) as (keyof typeof base)[]) {
          const expected = rotate(base[key], angle);
          expectClose(petals[k][key], expected);
        }
      }
    },
  );

  it("keeps every petal's tip at the same distance from the origin", () => {
    const { petals } = generateRing(8, 0.6, 100);
    for (const petal of petals) {
      const dist = Math.hypot(petal.tip.x, petal.tip.y);
      expect(dist).toBeCloseTo(100, 5);
    }
  });

  it("is invariant (as a point set) under a further 2pi/n rotation", () => {
    // Rotating the whole ring by one more step should reproduce the same
    // set of tip points (rosette symmetry), independent of labelling.
    const n = 6;
    const { petals } = generateRing(n, 0.6, 100);
    const tips = petals.map((p) => p.tip);
    const rotatedTips = tips.map((t) => rotate(t, (2 * Math.PI) / n));
    for (const rt of rotatedTips) {
      const match = tips.some(
        (t) => Math.hypot(t.x - rt.x, t.y - rt.y) < EPS,
      );
      expect(match).toBe(true);
    }
  });
});

describe("buildPetalTemplate", () => {
  it("is left-right mirror symmetric about the axis (x -> -x)", () => {
    const petal = buildPetalTemplate(8, 0.5, 100);
    expect(petal.sr.x).toBeCloseTo(-petal.sl.x, 5);
    expect(petal.sr.y).toBeCloseTo(petal.sl.y, 5);
    expect(petal.c1r.x).toBeCloseTo(-petal.c1.x, 5);
    expect(petal.tip.x).toBeCloseTo(0, 5);
  });

  it("pointiness=1 puts the tip control points closer to the axis than pointiness=0", () => {
    const round = buildPetalTemplate(8, 0, 100);
    const sharp = buildPetalTemplate(8, 1, 100);
    expect(Math.abs(sharp.c6.x)).toBeLessThan(Math.abs(round.c6.x));
  });
});

describe("clampPrajamyamParams", () => {
  it("clamps petals to [3,16] and rounds to an integer", () => {
    expect(clampPrajamyamParams({ petals: 1 }).petals).toBe(3);
    expect(clampPrajamyamParams({ petals: 100 }).petals).toBe(16);
    expect(clampPrajamyamParams({ petals: 7.6 }).petals).toBe(8);
  });

  it("clamps pointiness and coreSize to [0,1]", () => {
    expect(clampPrajamyamParams({ pointiness: -5 }).pointiness).toBe(0);
    expect(clampPrajamyamParams({ pointiness: 5 }).pointiness).toBe(1);
    expect(clampPrajamyamParams({ coreSize: -1 }).coreSize).toBe(0);
    expect(clampPrajamyamParams({ coreSize: 2 }).coreSize).toBe(1);
  });

  it("clamps layers to [1,3] and rounds to an integer", () => {
    expect(clampPrajamyamParams({ layers: 0 }).layers).toBe(1);
    expect(clampPrajamyamParams({ layers: 10 }).layers).toBe(3);
  });

  it("fills in defaults for missing/NaN params", () => {
    const p = clampPrajamyamParams({});
    expect(p.petals).toBeGreaterThanOrEqual(3);
    expect(p.petals).toBeLessThanOrEqual(16);
    const nanResult = clampPrajamyamParams({ petals: NaN });
    expect(Number.isFinite(nanResult.petals)).toBe(true);
  });
});

describe("generatePrajamyam", () => {
  it("is a pure function: identical params produce byte-identical path output", () => {
    const params = { petals: 8, pointiness: 0.6, layers: 2, coreSize: 0.4 };
    const a = generatePrajamyam(params);
    const b = generatePrajamyam({ ...params });
    expect(a.path).toBe(b.path);
  });

  it("produces a well-formed, non-empty SVG path string", () => {
    const { path } = generatePrajamyam({ petals: 8 });
    expect(path.length).toBeGreaterThan(0);
    expect(path.startsWith("M")).toBe(true);
    expect(path).toContain("Z");
    expect(path).not.toMatch(/NaN/);
  });

  it("produces one extra nested layer object per layers param", () => {
    expect(generatePrajamyam({ layers: 1 }).layers).toHaveLength(1);
    expect(generatePrajamyam({ layers: 3 }).layers).toHaveLength(3);
  });

  it("omits the core accent path when coreSize is 0", () => {
    const withCore = generatePrajamyam({ coreSize: 1 });
    const noCore = generatePrajamyam({ coreSize: 0 });
    expect(withCore.path.length).toBeGreaterThan(noCore.path.length);
  });
});
