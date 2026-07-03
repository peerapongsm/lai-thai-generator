import { describe, expect, it } from "vitest";
import {
  buildOgeeSpine,
  buildSerratedBelly,
  clampKanokParams,
  cubicPoint,
  cubicTangent,
  generateKanokBand,
  generateKanokUnit,
} from "../lib/lai/kanok";

describe("generateKanokUnit baseline continuity", () => {
  it("starts at local (0,0) and ends at (segmentWidth, 0)", () => {
    const unit = generateKanokUnit({ unitsPerRepeat: 1 });
    expect(unit.start).toEqual({ x: 0, y: 0 });
    expect(unit.end).toEqual({ x: unit.width, y: 0 });
  });

  it.each([1, 2, 3])(
    "keeps start/end on the baseline for unitsPerRepeat=%i",
    (units) => {
      const unit = generateKanokUnit({ unitsPerRepeat: units });
      expect(unit.start.y).toBe(0);
      expect(unit.end.y).toBe(0);
      expect(unit.end.x).toBeCloseTo(unit.width, 6);
    },
  );
});

describe("generateKanokBand repeat continuity", () => {
  it("tiles units so each one's end point equals the next one's start point", () => {
    const unit = generateKanokUnit({ unitsPerRepeat: 2, curl: 0.5 });
    const repeats = 5;
    for (let i = 0; i < repeats - 1; i++) {
      const endOfI = { x: unit.end.x + i * unit.width, y: unit.end.y };
      const startOfNext = {
        x: unit.start.x + (i + 1) * unit.width,
        y: unit.start.y,
      };
      expect(endOfI.x).toBeCloseTo(startOfNext.x, 6);
      expect(endOfI.y).toBeCloseTo(startOfNext.y, 6);
    }
  });

  it("band width is exactly segment width * repeat count", () => {
    const unit = generateKanokUnit({ unitsPerRepeat: 1 });
    const band = generateKanokBand({ unitsPerRepeat: 1 }, 6);
    expect(band.width).toBeCloseTo(unit.width * 6, 6);
  });

  it("jitter never changes the per-unit segment width (continuity holds even with seed)", () => {
    const noJitter = generateKanokBand({ unitsPerRepeat: 2 }, 5);
    const withJitter = generateKanokBand({ unitsPerRepeat: 2 }, 5, 777);
    expect(withJitter.width).toBeCloseTo(noJitter.width, 6);
  });
});

describe("clampKanokParams", () => {
  it("clamps curl to [0,1]", () => {
    expect(clampKanokParams({ curl: -1 }).curl).toBe(0);
    expect(clampKanokParams({ curl: 2 }).curl).toBe(1);
  });

  it("clamps unitsPerRepeat to [1,3] integer", () => {
    expect(clampKanokParams({ unitsPerRepeat: 0 }).unitsPerRepeat).toBe(1);
    expect(clampKanokParams({ unitsPerRepeat: 9 }).unitsPerRepeat).toBe(3);
    expect(clampKanokParams({ unitsPerRepeat: 2.4 }).unitsPerRepeat).toBe(2);
  });

  it("clamps height to [0.5,1.5]", () => {
    expect(clampKanokParams({ height: 0 }).height).toBe(0.5);
    expect(clampKanokParams({ height: 5 }).height).toBe(1.5);
  });

  it("only accepts 'up' or 'down' for direction, defaulting to up", () => {
    expect(clampKanokParams({}).direction).toBe("up");
    expect(clampKanokParams({ direction: "down" }).direction).toBe("down");
    // @ts-expect-error - deliberately passing an invalid value
    expect(clampKanokParams({ direction: "sideways" }).direction).toBe("up");
  });

  it("fills defaults for NaN input", () => {
    const p = clampKanokParams({ curl: NaN });
    expect(Number.isFinite(p.curl)).toBe(true);
  });
});

describe("generateKanokBand determinism", () => {
  it("identical seed+params produce byte-identical path output", () => {
    const params = { curl: 0.6, unitsPerRepeat: 3, height: 1.1 };
    const a = generateKanokBand(params, 4, 42);
    const b = generateKanokBand({ ...params }, 4, 42);
    expect(a.path).toBe(b.path);
  });

  it("different seeds produce different jittered output", () => {
    const params = { curl: 0.6, unitsPerRepeat: 2 };
    const a = generateKanokBand(params, 4, 1);
    const b = generateKanokBand(params, 4, 2);
    expect(a.path).not.toBe(b.path);
  });

  it("omitting the seed is deterministic too (no jitter applied)", () => {
    const params = { curl: 0.6, unitsPerRepeat: 2 };
    const a = generateKanokBand(params, 4);
    const b = generateKanokBand({ ...params }, 4);
    expect(a.path).toBe(b.path);
  });
});

describe("generateKanokUnit output", () => {
  it("produces a well-formed, non-empty SVG path string", () => {
    const { path } = generateKanokUnit({ unitsPerRepeat: 3 });
    expect(path.startsWith("M")).toBe(true);
    expect(path).toContain("Z");
    expect(path).not.toMatch(/NaN/);
  });

  it("adds more Z-closed sub-paths as unitsPerRepeat increases", () => {
    const one = generateKanokUnit({ unitsPerRepeat: 1 });
    const three = generateKanokUnit({ unitsPerRepeat: 3 });
    const countZ = (s: string) => (s.match(/Z/g) ?? []).length;
    expect(countZ(three.path)).toBe(3);
    expect(countZ(one.path)).toBe(1);
  });

  it("direction=down mirrors direction=up vertically", () => {
    const up = generateKanokUnit({ direction: "up", curl: 0.5 });
    const down = generateKanokUnit({ direction: "down", curl: 0.5 });
    const nums = (s: string) => s.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const upNums = nums(up.path);
    const downNums = nums(down.path);
    // y-coordinates (every 2nd number) should be negated between the two.
    for (let i = 1; i < upNums.length; i += 2) {
      expect(downNums[i]).toBeCloseTo(-upNums[i], 5);
    }
  });
});

describe("cubicPoint", () => {
  const p0 = { x: 0, y: 0 };
  const p1 = { x: 1, y: 5 };
  const p2 = { x: 4, y: 5 };
  const p3 = { x: 5, y: 0 };

  it("returns p0 at t=0 and p3 at t=1", () => {
    expect(cubicPoint(p0, p1, p2, p3, 0)).toEqual(p0);
    expect(cubicPoint(p0, p1, p2, p3, 1)).toEqual(p3);
  });

  it("stays within the convex hull of its control points at t=0.5", () => {
    const mid = cubicPoint(p0, p1, p2, p3, 0.5);
    expect(mid.x).toBeGreaterThanOrEqual(p0.x);
    expect(mid.x).toBeLessThanOrEqual(p3.x);
    expect(mid.y).toBeGreaterThan(0);
  });
});

describe("cubicTangent", () => {
  it("points toward p1 at t=0 (direction proportional to p1 - p0)", () => {
    const p0 = { x: 0, y: 0 };
    const p1 = { x: 2, y: 0 };
    const p2 = { x: 4, y: 0 };
    const p3 = { x: 6, y: 0 };
    const tangent = cubicTangent(p0, p1, p2, p3, 0);
    expect(tangent.x).toBeGreaterThan(0);
    expect(tangent.y).toBeCloseTo(0, 6);
  });
});

describe("buildOgeeSpine", () => {
  it("reaches the tip at exactly height H, via a chain ending at the tip", () => {
    const { tip, segments } = buildOgeeSpine(60, 110, 0.5);
    expect(tip.y).toBe(110);
    expect(segments[segments.length - 1].to).toEqual(tip);
  });

  it("never reaches further right (in x) than the shoulder, for every control point and endpoint", () => {
    for (const curl of [0, 0.3, 0.6, 1]) {
      const { shoulder, segments } = buildOgeeSpine(60, 110, curl);
      for (const seg of segments) {
        expect(seg.c1.x).toBeLessThanOrEqual(shoulder.x + 1e-9);
        expect(seg.c2.x).toBeLessThanOrEqual(shoulder.x + 1e-9);
        expect(seg.to.x).toBeLessThanOrEqual(shoulder.x + 1e-9);
      }
    }
  });

  it("leans the shoulder further out as curl increases, deepening the hook", () => {
    const low = buildOgeeSpine(60, 110, 0);
    const high = buildOgeeSpine(60, 110, 1);
    expect(high.shoulder.x).toBeGreaterThan(low.shoulder.x);
    // The hook's "depth" — how far the tip pulls back relative to the
    // shoulder's lean — grows with curl even though the tip itself also
    // drifts slightly with curl.
    expect(high.shoulder.x - high.tip.x).toBeGreaterThan(low.shoulder.x - low.tip.x);
  });
});

describe("buildSerratedBelly", () => {
  it("produces exactly 2*count segments (a peak and a fall for each flame-let)", () => {
    const tip = { x: 15, y: 110 };
    const br = { x: 60, y: 0 };
    const shoulder = { x: 25, y: 40 };
    for (const count of [2, 3, 4]) {
      const segments = buildSerratedBelly(tip, br, shoulder, 60, 110, 0.5, count);
      expect(segments.length).toBe(2 * count);
    }
  });

  it("ends exactly at the base-right corner", () => {
    const tip = { x: 15, y: 110 };
    const br = { x: 60, y: 0 };
    const shoulder = { x: 25, y: 40 };
    const segments = buildSerratedBelly(tip, br, shoulder, 60, 110, 0.7, 3);
    expect(segments[segments.length - 1].to).toEqual(br);
  });

  it("clamps out-of-range counts into [2,4]", () => {
    const tip = { x: 15, y: 110 };
    const br = { x: 60, y: 0 };
    const shoulder = { x: 25, y: 40 };
    expect(buildSerratedBelly(tip, br, shoulder, 60, 110, 0.5, 0).length).toBe(4);
    expect(buildSerratedBelly(tip, br, shoulder, 60, 110, 0.5, 10).length).toBe(8);
  });
});
