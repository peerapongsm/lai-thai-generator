// กนก (kanok) — a repeating flame/leaf band. Each repeat unit is 1-3
// cascading "flame" shapes of decreasing size (echoing กนกสามตัว, where a
// large flame is trailed by a smaller child and grandchild flame), built
// from a single continuous S-curve outline: it rises from a flat baseline
// up a leaning spine, curls over at the top (the "flame lick"), then sweeps
// back down through a convex belly bulge to the baseline. Units are placed
// so each one starts and ends exactly on the baseline, at (0,0) and
// (segmentWidth,0) in its own local space — translating by segmentWidth
// therefore tiles the band with no gap or overlap along the baseline.

import { jitter, mulberry32 } from "./seed";

export interface Point {
  x: number;
  y: number;
}

export type KanokDirection = "up" | "down";

export interface KanokParams {
  /** ความโค้งยอด — tip curl amount, 0 = barely leans, 1 = pronounced hook. */
  curl: number;
  /** จำนวนตัวต่อช่วง — cascading flames per repeat unit, 1-3. */
  unitsPerRepeat: number;
  /** ความสูง — relative flame height, 0.5-1.5. */
  height: number;
  /** ทิศ — band faces up (flame rises from baseline) or down (mirrored). */
  direction: KanokDirection;
}

const DEFAULTS: KanokParams = {
  curl: 0.6,
  unitsPerRepeat: 1,
  height: 1,
  direction: "up",
};

function clamp(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clampKanokParams(p: Partial<KanokParams>): KanokParams {
  return {
    curl: clamp(p.curl ?? DEFAULTS.curl, 0, 1),
    unitsPerRepeat: Math.round(
      clamp(p.unitsPerRepeat ?? DEFAULTS.unitsPerRepeat, 1, 3),
    ),
    height: clamp(p.height ?? DEFAULTS.height, 0.5, 1.5),
    direction: p.direction === "down" ? "down" : "up",
  };
}

function fmt(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

function pt(p: Point): string {
  return `${fmt(p.x)},${fmt(p.y)}`;
}

const BASE_UNIT_WIDTH = 60;
const BASE_UNIT_HEIGHT = 100;

/**
 * Build one flame's closed outline, base at local (0,0)-(W,0), rising to
 * height H. The outline is a single point (the flame tip) reached by two
 * edges from the base corners: a nearly-straight "spine" on the left and a
 * bulging "belly" on the right that bows outward before tapering back in —
 * the classic S-curve flame/leaf silhouette. `curl` leans the whole flame
 * further to the right and pulls the tip's approach tangents apart, which
 * reads as a sharper curling "lick" at higher values.
 */
export function buildFlame(
  W: number,
  H: number,
  curl: number,
): { path: string; points: Point[] } {
  const bl: Point = { x: 0, y: 0 };
  const br: Point = { x: W, y: 0 };

  const tipX = W * lerp(0.32, 0.8, curl);
  const tip: Point = { x: tipX, y: H };

  const bellyX = W * lerp(0.92, 1.3, curl);
  const belly: Point = { x: bellyX, y: H * 0.45 };

  // Spine (left edge): base up to the tip, hugging close to the axis.
  const c1: Point = { x: W * 0.02, y: H * 0.32 };
  const c2: Point = { x: tipX * lerp(0.55, 0.3, curl), y: H * 0.86 };

  // Tip -> belly: the curl. A steeper, more horizontal departure from the
  // tip (relative to the spine's near-vertical arrival) is what makes the
  // point read as a leaning hook rather than a plain symmetric point.
  const c3: Point = { x: tipX + (bellyX - tipX) * 0.35, y: H * 0.92 };
  const c4: Point = { x: bellyX * 0.94, y: H * 0.64 };

  // Belly -> base-right: bulge tapering back down to the baseline.
  const c5: Point = { x: bellyX * 0.66, y: H * 0.16 };
  const c6: Point = { x: W * 0.8, y: H * 0.02 };

  const path = [
    `M ${pt(bl)}`,
    `C ${pt(c1)} ${pt(c2)} ${pt(tip)}`,
    `C ${pt(c3)} ${pt(c4)} ${pt(belly)}`,
    `C ${pt(c5)} ${pt(c6)} ${pt(br)}`,
    "Z",
  ].join(" ");

  return {
    path,
    points: [bl, c1, c2, tip, c3, c4, belly, c5, c6, br],
  };
}

function translate(path: string, dx: number, dy: number): string {
  // Path strings only ever contain "M"/"C" commands and "x,y" pairs
  // (see pt()), so a simple token walk is enough — no general parser needed.
  return path.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, x, y) =>
    `${fmt(parseFloat(x) + dx)},${fmt(parseFloat(y) + dy)}`,
  );
}

function flipY(path: string): string {
  return path.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, x, y) =>
    `${fmt(parseFloat(x))},${fmt(-parseFloat(y))}`,
  );
}

export interface KanokUnitResult {
  path: string;
  start: Point;
  end: Point;
  width: number;
  height: number;
}

/** Relative size + x-offset for each cascading flame within a repeat unit. */
const CASCADE = [
  { scale: 1, dx: 0 },
  { scale: 0.62, dx: 0.5 },
  { scale: 0.38, dx: 0.85 },
];

/**
 * Build one repeat unit: 1-3 cascading flames sharing a baseline that runs
 * exactly from local (0,0) to (segmentWidth,0).
 */
export function generateKanokUnit(
  params: Partial<KanokParams> = {},
): KanokUnitResult {
  const p = clampKanokParams(params);
  const H = BASE_UNIT_HEIGHT * p.height;
  const W = BASE_UNIT_WIDTH;
  const count = p.unitsPerRepeat;

  const flamePaths: string[] = [];
  let maxX = W;
  for (let i = 0; i < count; i++) {
    const { scale, dx } = CASCADE[i];
    const fw = W * scale;
    const fh = H * scale;
    const offsetX = W * dx;
    const { path } = buildFlame(fw, fh, p.curl);
    flamePaths.push(translate(path, offsetX, 0));
    maxX = Math.max(maxX, offsetX + fw * 1.35);
  }

  // Larger/child flames are drawn first (behind) so the main flame's base
  // sits in front where they overlap near the baseline.
  const orderedPaths = [...flamePaths].reverse();

  const segmentWidth = maxX + W * 0.15;
  // buildFlame() rises with increasing y, which in SVG's y-down space
  // means the flame visually hangs downward — flip for the (default) "up"
  // direction so the flame reads as rising from the baseline on screen.
  let path = orderedPaths.join(" ");
  if (p.direction === "up") {
    path = flipY(path);
  }

  const start: Point = { x: 0, y: 0 };
  const end: Point = { x: segmentWidth, y: 0 };

  return { path, start, end, width: segmentWidth, height: H };
}

export interface KanokBandResult {
  path: string;
  width: number;
  height: number;
}

const JITTER_CURL = 0.06;
const JITTER_HEIGHT = 0.05;

/**
 * A repeating band of `repeats` units, all sharing one segment width (so
 * the baseline tiles with no gap/overlap — see module docs). When `seed`
 * is given, each repeat's curl/height gets a small deterministic nudge
 * (mulberry32-driven) so consecutive units aren't perfectly identical,
 * echoing the gentle irregularity of hand-carved kanok friezes. The same
 * seed + params always produce the exact same path string.
 */
export function generateKanokBand(
  params: Partial<KanokParams> = {},
  repeats = 4,
  seed?: number,
): KanokBandResult {
  const n = Math.max(1, Math.round(repeats));
  const base = clampKanokParams(params);
  // segmentWidth only depends on unitsPerRepeat (via CASCADE) and the fixed
  // base unit width, never on curl/height — so jitter below cannot break
  // baseline continuity between repeats.
  const { width: segmentWidth } = generateKanokUnit(base);
  const rng = seed === undefined ? null : mulberry32(seed);

  const paths: string[] = [];
  let maxHeight = 0;
  for (let i = 0; i < n; i++) {
    const unitParams: Partial<KanokParams> = rng
      ? {
          ...base,
          curl: clamp(base.curl + jitter(rng, JITTER_CURL), 0, 1),
          height: clamp(base.height + jitter(rng, JITTER_HEIGHT), 0.5, 1.5),
        }
      : base;
    const unit = generateKanokUnit(unitParams);
    paths.push(translate(unit.path, i * segmentWidth, 0));
    maxHeight = Math.max(maxHeight, unit.height);
  }
  return {
    path: paths.join(" "),
    width: segmentWidth * n,
    height: maxHeight,
  };
}
