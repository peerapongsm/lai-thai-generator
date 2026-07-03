import { describe, expect, it } from "vitest";
import { TILE_SIZE, clampTileParams, generateTile } from "../lib/lai/tile";

describe("generateTile bounding box", () => {
  it("always reports the exact fixed tile size, regardless of params", () => {
    const cases = [
      { density: 0, alternate: true },
      { density: 0.5, alternate: false },
      { density: 1, alternate: true },
    ];
    for (const tile of cases) {
      const result = generateTile({}, {}, tile);
      expect(result.size).toBe(TILE_SIZE);
      expect(result.bbox).toEqual({
        minX: 0,
        minY: 0,
        maxX: TILE_SIZE,
        maxY: TILE_SIZE,
      });
    }
  });

  it("keeps all drawn coordinates within the declared bbox (with a small tolerance)", () => {
    const { path } = generateTile(
      { petals: 8, pointiness: 0.9 },
      { curl: 1 },
      { density: 1, alternate: true },
    );
    const nums = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const tolerance = TILE_SIZE * 0.05;
    for (let i = 0; i < nums.length; i += 2) {
      expect(nums[i]).toBeGreaterThanOrEqual(-tolerance);
      expect(nums[i]).toBeLessThanOrEqual(TILE_SIZE + tolerance);
      expect(nums[i + 1]).toBeGreaterThanOrEqual(-tolerance);
      expect(nums[i + 1]).toBeLessThanOrEqual(TILE_SIZE + tolerance);
    }
  });
});

describe("generateTile grid density", () => {
  it("increases the grid count as density rises from 0 to 1", () => {
    const sparse = generateTile({}, {}, { density: 0 });
    const dense = generateTile({}, {}, { density: 1 });
    expect(sparse.grid).toBe(1);
    expect(dense.grid).toBe(4);
  });

  it("clamps grid to [1,4]", () => {
    const result = generateTile({}, {}, { density: 0.5 });
    expect(result.grid).toBeGreaterThanOrEqual(1);
    expect(result.grid).toBeLessThanOrEqual(4);
  });
});

describe("clampTileParams", () => {
  it("clamps density to [0,1]", () => {
    expect(clampTileParams({ density: -1 }).density).toBe(0);
    expect(clampTileParams({ density: 5 }).density).toBe(1);
  });

  it("defaults alternate to true when omitted", () => {
    expect(clampTileParams({}).alternate).toBe(true);
  });

  it("preserves an explicit false", () => {
    expect(clampTileParams({ alternate: false }).alternate).toBe(false);
  });
});

describe("generateTile determinism", () => {
  it("identical seed+params produce byte-identical path output", () => {
    const args = [
      { petals: 8, pointiness: 0.6 },
      { curl: 0.5 },
      { density: 0.6, alternate: true },
      99,
    ] as const;
    const a = generateTile(...args);
    const b = generateTile(...args);
    expect(a.path).toBe(b.path);
  });

  it("different seeds jitter cell rotation differently", () => {
    const a = generateTile({}, {}, { density: 0.6 }, 1);
    const b = generateTile({}, {}, { density: 0.6 }, 2);
    expect(a.path).not.toBe(b.path);
  });

  it("omitting the seed is still deterministic", () => {
    const a = generateTile({ petals: 6 }, { curl: 0.4 }, { density: 0.5 });
    const b = generateTile({ petals: 6 }, { curl: 0.4 }, { density: 0.5 });
    expect(a.path).toBe(b.path);
  });
});

describe("generateTile alternate toggle", () => {
  it("produces a different path when alternate is toggled (grid>1)", () => {
    const on = generateTile({}, {}, { density: 0.6, alternate: true });
    const off = generateTile({}, {}, { density: 0.6, alternate: false });
    expect(on.path).not.toBe(off.path);
  });
});
