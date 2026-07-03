import { describe, expect, it } from "vitest";
import {
  buildFlame,
  buildFlameGeometry,
  clampKanokParams,
  cubicPoint,
  cubicTangent,
  generateKanokBand,
  generateKanokUnit,
  sampleFlameOutline,
  type Point,
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

describe("buildFlameGeometry", () => {
  it("starts at the spine's base anchor A and ends the spine at the tip, scaled by W/H", () => {
    const W = 60;
    const H = 110;
    const { start, segments } = buildFlameGeometry(W, H, 0);
    expect(start.x).toBeCloseTo(0.1 * W, 6);
    expect(start.y).toBeCloseTo(0, 6);
    // segments[0..2] are the spine (3 cubics); segments[2].to is the tip.
    expect(segments[2].to.x).toBeCloseTo(0.46 * W, 6);
    expect(segments[2].to.y).toBeCloseTo(0.995 * H, 6);
  });

  it("belly runs through exactly 3 flame-lets (8 cubics) after the 3-cubic spine", () => {
    const { segments } = buildFlameGeometry(60, 110, 0.5);
    // 3 spine cubics + 8 belly cubics (tip->v0->p1->v1->p2->v2->p3->v3->base).
    expect(segments.length).toBe(11);
  });

  it("belly's last segment ends at the base corner D, and the path closes back to A", () => {
    const W = 60;
    const H = 110;
    const { start, segments } = buildFlameGeometry(W, H, 0.5);
    const last = segments[segments.length - 1];
    expect(last.to.x).toBeCloseTo(0.55 * W, 6);
    expect(last.to.y).toBeCloseTo(0, 6);
    // The straight base edge (SVG "Z") closes last.to back to start.
    expect(start.y).toBeCloseTo(0, 6);
  });

  it("curl shears the flame rightward (higher points shift right more) without moving the base", () => {
    const W = 60;
    const H = 110;
    const straight = buildFlameGeometry(W, H, 0);
    const curled = buildFlameGeometry(W, H, 1);
    // Base anchor (y=0) is unaffected by shear.
    expect(curled.start.x).toBeCloseTo(straight.start.x, 6);
    // The tip (high y) shifts right under curl.
    const tipStraight = straight.segments[2].to;
    const tipCurled = curled.segments[2].to;
    expect(tipCurled.x).toBeGreaterThan(tipStraight.x);
  });

  it("scales only the tip's own hook handle (segments[2].c2) by at most ±15% across curl range", () => {
    const W = 60;
    const H = 110;
    const low = buildFlameGeometry(W, H, 0);
    const high = buildFlameGeometry(W, H, 1);
    // Unsheared (dy-only) component of the hook handle offset from the tip.
    const lowOffsetY = low.segments[2].to.y - low.segments[2].c2.y;
    const highOffsetY = high.segments[2].to.y - high.segments[2].c2.y;
    const ratio = highOffsetY / lowOffsetY;
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThanOrEqual(1.15 / 0.85 + 1e-9);
  });
});

describe("buildFlame", () => {
  it("produces a well-formed single closed path with no NaNs", () => {
    const { path } = buildFlame(60, 110, 0.5);
    expect(path.startsWith("M")).toBe(true);
    expect(path.endsWith("Z")).toBe(true);
    expect(path).not.toMatch(/NaN/);
    // Exactly one M and one Z: a single closed subpath.
    expect((path.match(/M/g) ?? []).length).toBe(1);
    expect((path.match(/Z/g) ?? []).length).toBe(1);
  });
});

// --- self-intersection ------------------------------------------------------
//
// The canonical flame must render as a single simple (non-self-intersecting)
// polygon for every curl in its valid range — no floating tip slivers, no
// dark self-intersection notches. Sample each cubic densely and check every
// pair of non-adjacent edges for a proper crossing.

function segmentsIntersect(a1: Point, a2: Point, b1: Point, b2: Point): boolean {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const denom = d1x * d2y - d1y * d2x;
  const EPS = 1e-9;
  if (Math.abs(denom) < EPS) return false; // parallel/collinear: not a proper crossing
  const dx = b1.x - a1.x;
  const dy = b1.y - a1.y;
  const t = (dx * d2y - dy * d2x) / denom;
  const u = (dx * d1y - dy * d1x) / denom;
  // Require a proper interior crossing, not a touch at/near an endpoint —
  // shared endpoints between adjacent edges are expected and excluded by
  // the caller, this margin guards against near-endpoint float noise too.
  const M = 1e-6;
  return t > M && t < 1 - M && u > M && u < 1 - M;
}

function assertSimplePolygon(poly: Point[]): void {
  const n = poly.length - 1; // poly is closed: poly[n] === poly[0]
  for (let i = 0; i < n; i++) {
    const a1 = poly[i];
    const a2 = poly[i + 1];
    for (let j = i + 1; j < n; j++) {
      // Skip the edge itself and both its immediate neighbours (they share
      // an endpoint with edge i by construction, which is not a crossing).
      if (j === i || j === i - 1 || j === i + 1) continue;
      if (j === n - 1 && i === 0) continue; // wraparound-adjacent pair
      const b1 = poly[j];
      const b2 = poly[j + 1];
      if (segmentsIntersect(a1, a2, b1, b2)) {
        throw new Error(
          `self-intersection: edge ${i} (${a1.x},${a1.y})-(${a2.x},${a2.y}) crosses edge ${j} (${b1.x},${b1.y})-(${b2.x},${b2.y})`,
        );
      }
    }
  }
}

describe("kanok flame has no self-intersection", () => {
  it.each([0, 0.25, 0.5, 0.75, 1])(
    "full-size flame silhouette is a simple polygon at curl=%s",
    (curl) => {
      const poly = sampleFlameOutline(60, 110, curl, 200);
      expect(() => assertSimplePolygon(poly)).not.toThrow();
    },
  );

  it.each([0, 0.5, 1])(
    "smallest cascade-scale flame (0.4x) is still a simple polygon at curl=%s",
    (curl) => {
      const poly = sampleFlameOutline(60 * 0.4, 110 * 0.4, curl, 200);
      expect(() => assertSimplePolygon(poly)).not.toThrow();
    },
  );
});
