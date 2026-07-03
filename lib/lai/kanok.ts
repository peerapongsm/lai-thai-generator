// กนก (kanok) — a repeating flame/leaf band. Each repeat unit is 1-3
// cascading "flame" shapes of decreasing size (echoing กนกสามตัว, where a
// large flame is trailed by a smaller child and grandchild flame). Each
// single flame is a closed outline built from ONE canonical template,
// specified in unit coordinates (x→right, y→up, base on y=0, height 1):
//   - the spine (left edge, base→tip): three cubics, concave near the base,
//     inflecting outward, then approaching the tip from the right — that
//     final approach is what gives the tip its curled hook.
//   - the belly (right edge, tip→base): the tip runs down through exactly
//     three sharp flame-lets (ตัวลูก), each a peak between two soft
//     valleys, before a straight base edge closes back to the spine's
//     start.
// `curl` only ever (a) shears the whole template in x by up to 0.18·y,
// leaning it, and (b) scales the tip's own hook handle by up to ±15% — the
// template's anchor points and handle structure never change shape.
// Units are placed so each one starts and ends exactly on the baseline, at
// (0,0) and (segmentWidth,0) in its own local space — translating by
// segmentWidth therefore tiles the band with no gap or overlap along the
// baseline.

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

// --- small vector helpers -------------------------------------------------

function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y };
}

function addScaled(a: Point, dir: Point, s: number): Point {
  return { x: a.x + dir.x * s, y: a.y + dir.y * s };
}

function addOffset(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy };
}

function len(a: Point): number {
  return Math.hypot(a.x, a.y);
}

function normalize(a: Point): Point {
  const l = len(a);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/** Point on a cubic bezier at t in [0,1]. Pure — cubicPoint(...,0) === p0. */
export function cubicPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
): Point {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

/** Derivative (unnormalized tangent direction) of a cubic bezier at t. */
export function cubicTangent(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
): Point {
  const mt = 1 - t;
  const a = 3 * mt * mt;
  const b = 6 * mt * t;
  const c = 3 * t * t;
  return {
    x: a * (p1.x - p0.x) + b * (p2.x - p1.x) + c * (p3.x - p2.x),
    y: a * (p1.y - p0.y) + b * (p2.y - p1.y) + c * (p3.y - p2.y),
  };
}

export interface CubicSegment {
  c1: Point;
  c2: Point;
  to: Point;
}

function segmentToCommand(seg: CubicSegment): string {
  return `C ${pt(seg.c1)} ${pt(seg.c2)} ${pt(seg.to)}`;
}

// --- canonical flame template, in unit coordinates -------------------------
//
// Spine anchors (base -> tip) and belly anchors (tip -> base) are fixed by
// design; only the tip's own hook handle and a global x-shear move with
// `curl` (see buildFlameGeometry). Never restructure these — see module
// docs.

const SPINE_A: Point = { x: 0.1, y: 0 };
const SPINE_B: Point = { x: 0.06, y: 0.35 };
const SPINE_C: Point = { x: 0.3, y: 0.72 };
const TIP: Point = { x: 0.46, y: 0.995 };

const BELLY_V0: Point = { x: 0.5, y: 0.8 };
const BELLY_P1: Point = { x: 0.62, y: 0.74 };
const BELLY_V1: Point = { x: 0.52, y: 0.6 };
const BELLY_P2: Point = { x: 0.66, y: 0.52 };
const BELLY_V2: Point = { x: 0.52, y: 0.38 };
const BELLY_P3: Point = { x: 0.68, y: 0.28 };
const BELLY_V3: Point = { x: 0.5, y: 0.16 };
const BASE_D: Point = { x: 0.55, y: 0 };

/** Handle length (unit space) for cubics arriving/leaving a sharp peak. */
const SHARP_HANDLE = 0.04;
/** Handle length (unit space) for cubics arriving/leaving a soft valley. */
const SOFT_HANDLE = 0.1;

/**
 * The spine: base -> waist -> inflection -> tip, three cubics exactly as
 * specified (concave rise, outward inflection, then approaching the tip
 * from the right for the hook). `hookScale` scales only the tip's own
 * handle — TIP+(0.10,-0.02) — by up to ±15%, per `curl`; every other handle
 * is fixed.
 */
function buildUnitSpine(hookScale: number): CubicSegment[] {
  return [
    {
      c1: addOffset(SPINE_A, -0.02, 0.15),
      c2: addOffset(SPINE_B, 0.0, -0.12),
      to: SPINE_B,
    },
    {
      c1: addOffset(SPINE_B, 0.02, 0.18),
      c2: addOffset(SPINE_C, -0.14, -0.1),
      to: SPINE_C,
    },
    {
      c1: addOffset(SPINE_C, 0.12, 0.1),
      c2: addOffset(TIP, 0.1 * hookScale, -0.02 * hookScale),
      to: TIP,
    },
  ];
}

/**
 * TIP -> V0 handle offsets (unit space, relative to TIP and V0
 * respectively). The straight chord between these two anchors — and any
 * gently-curving cubic close to it — runs close enough alongside the
 * spine's own C -> TIP curve (which bulges out in x on its final approach
 * to the tip; that bulge *is* the hook) to graze it. The only clean way
 * through is to overtake the spine's bulge early, while y is still close
 * to the tip's, so the rest of the segment (well right of the spine's
 * shrinking bulge) has a clear run down to V0 — see tests/kanok.test.ts.
 */
const TIP_TO_V0_C1_OFFSET: Point = { x: 0.4, y: 0 };
const TIP_TO_V0_C2_OFFSET: Point = { x: 0.05, y: 0.1 };

/**
 * The belly: tip -> 3 flame-lets (peak/valley/peak/valley/peak) -> base
 * corner. Each anchor's own handle length is short (SHARP_HANDLE) at the
 * tip, every peak, and the base corner — keeping those sharp — and longer
 * (SOFT_HANDLE) through the valleys between them, so the curve sweeps
 * smoothly there. Handle direction follows the local bisector tangent
 * (of each anchor's two adjacent chords) so the curve threads every anchor
 * in sequence without doubling back on itself.
 */
function buildUnitBelly(): CubicSegment[] {
  const anchors: { p: Point; sharp: boolean }[] = [
    { p: TIP, sharp: true },
    { p: BELLY_V0, sharp: false },
    { p: BELLY_P1, sharp: true },
    { p: BELLY_V1, sharp: false },
    { p: BELLY_P2, sharp: true },
    { p: BELLY_V2, sharp: false },
    { p: BELLY_P3, sharp: true },
    { p: BELLY_V3, sharp: false },
    { p: BASE_D, sharp: true },
  ];

  const tangents = anchors.map((a, i) => {
    const prev = anchors[Math.max(0, i - 1)].p;
    const next = anchors[Math.min(anchors.length - 1, i + 1)].p;
    const inDir = normalize(sub(a.p, prev));
    const outDir = normalize(sub(next, a.p));
    return normalize({ x: inDir.x + outDir.x, y: inDir.y + outDir.y });
  });

  const segments: CubicSegment[] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const from = anchors[i];
    const to = anchors[i + 1];
    const segLen = len(sub(to.p, from.p));

    if (i === 0) {
      // TIP -> V0 is special-cased — see TIP_TO_V0_C1_OFFSET doc above.
      segments.push({
        c1: addOffset(from.p, TIP_TO_V0_C1_OFFSET.x, TIP_TO_V0_C1_OFFSET.y),
        c2: addOffset(to.p, TIP_TO_V0_C2_OFFSET.x, TIP_TO_V0_C2_OFFSET.y),
        to: to.p,
      });
      continue;
    }

    // The ≤0.04 / ≤0.10 lengths are upper bounds — also cap each handle to
    // a fraction of its own (often much shorter) segment chord, so a handle
    // whose neighbour-averaged tangent points away from the chord can't
    // overshoot into a loop that crosses a neighbouring segment.
    const magFrom = Math.min(from.sharp ? SHARP_HANDLE : SOFT_HANDLE, segLen * 0.35);
    const magTo = Math.min(to.sharp ? SHARP_HANDLE : SOFT_HANDLE, segLen * 0.35);
    segments.push({
      c1: addScaled(from.p, tangents[i], magFrom),
      c2: addScaled(to.p, tangents[i + 1], -magTo),
      to: to.p,
    });
  }
  return segments;
}

export interface FlameGeometry {
  start: Point;
  segments: CubicSegment[];
}

/**
 * Maps the canonical unit-space template (see buildUnitSpine/buildUnitBelly)
 * onto a flame of width W, height H: `curl` shears every point in x by up to
 * 0.18·y (the lean) and scales the tip's hook handle by up to ±15%, then the
 * whole thing is scaled by (W, H). A single closed path (spine, then belly,
 * then an implicit straight base edge back to the start) with no
 * self-intersection for any curl in [0,1] — see tests/kanok.test.ts.
 */
export function buildFlameGeometry(
  W: number,
  H: number,
  curl: number,
): FlameGeometry {
  const shearAmt = 0.18 * curl;
  const hookScale = lerp(0.85, 1.15, curl);

  const transform = (p: Point): Point => ({
    x: (p.x + shearAmt * p.y) * W,
    y: p.y * H,
  });

  const unitSegments = [...buildUnitSpine(hookScale), ...buildUnitBelly()];
  const segments = unitSegments.map((s) => ({
    c1: transform(s.c1),
    c2: transform(s.c2),
    to: transform(s.to),
  }));

  return { start: transform(SPINE_A), segments };
}

/**
 * Samples the flame's closed outline (spine, belly, and the straight base
 * edge back to the start) as a polygon, `samplesPerCurve` points per cubic —
 * used by the self-intersection test.
 */
export function sampleFlameOutline(
  W: number,
  H: number,
  curl: number,
  samplesPerCurve = 200,
): Point[] {
  const { start, segments } = buildFlameGeometry(W, H, curl);
  const poly: Point[] = [start];
  let prev = start;
  for (const seg of segments) {
    for (let i = 1; i <= samplesPerCurve; i++) {
      poly.push(cubicPoint(prev, seg.c1, seg.c2, seg.to, i / samplesPerCurve));
    }
    prev = seg.to;
  }
  poly.push(start); // straight base edge closing the path (SVG "Z")
  return poly;
}

/**
 * Build one flame's closed outline, base at local (0,0)-(W,0), rising to
 * height H — see buildFlameGeometry for how W/H/curl map onto the canonical
 * template.
 */
export function buildFlame(
  W: number,
  H: number,
  curl: number,
): { path: string; points: Point[] } {
  const { start, segments } = buildFlameGeometry(W, H, curl);

  const path = [`M ${pt(start)}`, ...segments.map(segmentToCommand), "Z"].join(
    " ",
  );

  const points: Point[] = [
    start,
    ...segments.flatMap((s) => [s.c1, s.c2, s.to]),
  ];

  return { path, points };
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

/**
 * Relative size + x-offset for each cascading flame within a repeat unit —
 * the main flame carries the full-size template, tapering down for its
 * smaller trailing children, stepping right along the base so consecutive
 * silhouettes overlap by roughly 15%.
 */
const CASCADE = [
  { scale: 1, dx: 0 },
  { scale: 0.62, dx: 0.52 },
  { scale: 0.4, dx: 0.88 },
];

const BASE_UNIT_WIDTH = 60;
const BASE_UNIT_HEIGHT = 100;

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
    const { path, points } = buildFlame(fw, fh, p.curl);
    flamePaths.push(translate(path, offsetX, 0));
    const reach = Math.max(...points.map((pnt) => pnt.x));
    maxX = Math.max(maxX, offsetX + reach);
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
