// กนก (kanok) — a repeating flame/leaf band. Each repeat unit is 1-3
// cascading "flame" shapes of decreasing size (echoing กนกสามตัว, where a
// large flame is trailed by a smaller child and grandchild flame). Each
// single flame is a closed outline with two distinct edges meeting at a
// sharp tip:
//   - the spine (left edge): a true ogee S-curve — concave near the base,
//     inflecting to convex, then hooking back over itself to a curled tip
//     (the "flame lick").
//   - the belly (right edge): serrated with 2-4 secondary flame-lets
//     (ตัวลูก) budding off it, each a smaller self-similar S-curved point,
//     growing from a fine point near the tip to their fullest near the
//     base — this is what makes a single flame read as กนกสามตัว rather
//     than a solid sail.
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

function len(a: Point): number {
  return Math.hypot(a.x, a.y);
}

function normalize(a: Point): Point {
  const l = len(a);
  return l < 1e-9 ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}

/** Rotate a vector 90° counter-clockwise. */
function perp(a: Point): Point {
  return { x: -a.y, y: a.x };
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

// --- spine: true ogee S-curve + curled hook tip ---------------------------

export interface OgeeSpine {
  tip: Point;
  /** Widest lean point, and the spine's rightmost reach everywhere else —
   *  callers use this to keep the belly clear of the spine (see
   *  buildSerratedBelly). */
  shoulder: Point;
  segments: CubicSegment[];
}

/**
 * The flame's back edge, from the base-left corner (0,0) up to the tip.
 * Four cubics: base -> waist is concave (hollows in toward the axis),
 * waist -> shoulder is convex (bulges out as it climbs, the widest lean —
 * kept low, around a third of the height, so there's a long graceful neck
 * left to curl through above it), shoulder -> hookApex continues that rise
 * up near the shoulder's own lean, and hookApex -> tip is the actual curl:
 * the tip lands well to the *left* of hookApex, with an arrival tangent
 * that points back down toward the spine — a real loop, not just a lean.
 * Every control point is kept at or left of the shoulder's x, so the spine
 * never reaches further right than the shoulder already does (the belly
 * relies on that — see buildSerratedBelly). `curl` sharpens the hook: the
 * shoulder/hookApex lean further out and the tip pulls back further to
 * meet them.
 */
export function buildOgeeSpine(W: number, H: number, curl: number): OgeeSpine {
  const waist: Point = { x: W * lerp(0.08, 0.16, curl), y: H * lerp(0.22, 0.17, curl) };
  const shoulder: Point = {
    x: W * lerp(0.3, 0.48, curl),
    y: H * lerp(0.42, 0.33, curl),
  };
  const hookApex: Point = {
    x: shoulder.x * lerp(0.8, 0.97, curl),
    y: H * lerp(0.82, 0.93, curl),
  };
  const tip: Point = { x: W * lerp(0.14, 0.18, curl), y: H };

  const seg1: CubicSegment = {
    // base -> waist: concave hollow, curve leans toward the axis first.
    c1: { x: waist.x * 0.18, y: waist.y * 0.5 },
    c2: { x: waist.x * 0.5, y: waist.y * 1.08 },
    to: waist,
  };
  const seg2: CubicSegment = {
    // waist -> shoulder: convex bulge, leaning out as it rises.
    c1: {
      x: waist.x + (shoulder.x - waist.x) * 0.3,
      y: waist.y + (shoulder.y - waist.y) * 0.1,
    },
    c2: {
      x: shoulder.x - (shoulder.x - waist.x) * 0.15,
      y: shoulder.y - (shoulder.y - waist.y) * 0.5,
    },
    to: shoulder,
  };
  const seg3: CubicSegment = {
    // shoulder -> hookApex: keeps climbing close to the shoulder's lean.
    c1: {
      x: shoulder.x - (shoulder.x - hookApex.x) * 0.2,
      y: shoulder.y + (hookApex.y - shoulder.y) * 0.4,
    },
    c2: { x: hookApex.x, y: hookApex.y - (hookApex.y - shoulder.y) * 0.15 },
    to: hookApex,
  };
  const seg4: CubicSegment = {
    // hookApex -> tip: the curl-back. c1 pokes a hair further out past
    // hookApex (clamped to the shoulder's x so the no-crossing invariant
    // holds) before c2 hooks hard back toward the tip, well left of
    // hookApex — that reversal is what reads as a loop rather than a lean.
    c1: {
      x: Math.min(hookApex.x + (hookApex.x - tip.x) * 0.1, shoulder.x),
      y: hookApex.y + (tip.y - hookApex.y) * 0.35,
    },
    c2: {
      x: tip.x + (hookApex.x - tip.x) * 0.55,
      y: tip.y - (tip.y - hookApex.y) * 0.1,
    },
    to: tip,
  };

  return { tip, shoulder, segments: [seg1, seg2, seg3, seg4] };
}

// --- belly: serrated edge with self-similar flame-lets ---------------------

/**
 * The flame's front edge, from the tip down to the base-right corner. Rides
 * a reference curve kept clear of the spine's `shoulder` (its widest reach)
 * by construction, so the two edges never cross — and buds `count` small
 * pointed flame-lets (ตัวลูก) off of it. Each flame-let is its own
 * miniature S-curved point: it leans out past the reference curve then
 * hooks back to a sharp cusp, echoing the spine's hook at a smaller scale.
 * Flame-lets grow from barely-there near the tip to fullest near the base
 * (the "thick base, needle-fine tip" taper), and the notch between
 * consecutive flame-lets is cut *inward* of the reference curve — that
 * gap is what reads as serration rather than one smooth bulge.
 */
export function buildSerratedBelly(
  tip: Point,
  br: Point,
  shoulder: Point,
  W: number,
  H: number,
  curl: number,
  count: number,
): CubicSegment[] {
  const n = Math.round(clamp(count, 2, 4));

  // Reference curve the serrations ride on. Kept clear of the spine's
  // shoulder — its rightmost reach — with a margin, so however the
  // flame-lets below displace it, the two edges of the flame can't cross.
  const bellyX = Math.max(W * lerp(0.46, 0.62, curl), shoulder.x + W * 0.26);
  const bellyY = H * lerp(0.3, 0.4, curl);
  const ref0 = tip;
  const ref1: Point = { x: tip.x + (bellyX - tip.x) * 0.45, y: tip.y - (tip.y - bellyY) * 0.6 };
  const ref2: Point = { x: bellyX + (br.x - bellyX) * 0.15, y: bellyY * 0.32 };
  const ref3 = br;

  const ampBase = W * lerp(0.14, 0.24, curl);

  function outwardNormal(t: number): Point {
    const tangent = normalize(cubicTangent(ref0, ref1, ref2, ref3, t));
    const n1 = perp(tangent);
    // The belly bulges away from the spine, toward +x — pick whichever
    // rotation agrees with that.
    return n1.x >= 0 ? n1 : { x: -n1.x, y: -n1.y };
  }

  // Path points: tip, [peak, valley]*(n-1), peak_n, br.
  const anchors: { point: Point; t: number; isPeak: boolean }[] = [
    { point: tip, t: 0, isPeak: false },
  ];
  for (let i = 1; i <= n; i++) {
    const tPeak = i / (n + 1);
    const base = cubicPoint(ref0, ref1, ref2, ref3, tPeak);
    const normal = outwardNormal(tPeak);
    const tangent = normalize(cubicTangent(ref0, ref1, ref2, ref3, tPeak));
    // Flame-lets fill out closer to the base (t -> 1) and taper to almost
    // nothing near the tip (t -> 0).
    const amp = ampBase * lerp(0.15, 1.15, tPeak);
    const peak = addScaled(addScaled(base, normal, amp), tangent, amp * 0.3);
    anchors.push({ point: peak, t: tPeak, isPeak: true });

    if (i < n) {
      const tValley = (i + 0.5) / (n + 1);
      const valleyBase = cubicPoint(ref0, ref1, ref2, ref3, tValley);
      const valleyNormal = outwardNormal(tValley);
      // Cut the notch in *past* the reference curve (toward the spine) so
      // consecutive flame-lets read as separate points, not one lumpy edge.
      const valleyAmp = ampBase * lerp(0.1, 0.4, tValley);
      const valley = addScaled(valleyBase, valleyNormal, -valleyAmp);
      anchors.push({ point: valley, t: tValley, isPeak: false });
    }
  }
  anchors.push({ point: br, t: 1, isPeak: false });

  const segments: CubicSegment[] = [];
  for (let i = 0; i < anchors.length - 1; i++) {
    const from = anchors[i];
    const to = anchors[i + 1];
    const segVec = sub(to.point, from.point);
    const segLen = len(segVec);
    const dir = segLen < 1e-9 ? { x: 0, y: 1 } : { x: segVec.x / segLen, y: segVec.y / segLen };
    const midNormal = outwardNormal((from.t + to.t) / 2);
    // Short handles at a peak endpoint (and long ones at a valley) so each
    // flame-let arrives at — and leaves — its own point sharply, like a
    // cusp, while still curving smoothly through the valleys between them.
    // The outward bulge is only applied on the valley side of each handle —
    // right next to a peak it would dominate the (short) parallel component
    // and round the point into a dome instead of a cusp.
    const h1 = from.isPeak ? 0.14 : 0.38;
    const h2 = to.isPeak ? 0.14 : 0.38;
    const bulge = segLen * 0.12;
    const bulge1 = from.isPeak ? 0 : bulge;
    const bulge2 = to.isPeak ? 0 : bulge;
    const c1 = addScaled(addScaled(from.point, dir, segLen * h1), midNormal, bulge1);
    const c2 = addScaled(addScaled(to.point, dir, -segLen * h2), midNormal, bulge2);
    segments.push({ c1, c2, to: to.point });
  }

  return segments;
}

const BASE_UNIT_WIDTH = 60;
const BASE_UNIT_HEIGHT = 100;

/**
 * Build one flame's closed outline, base at local (0,0)-(W,0), rising to
 * height H. Two edges meet at a sharp tip: the spine (see buildOgeeSpine)
 * on the left, a true ogee S-curve hooking back on itself, and the belly
 * (see buildSerratedBelly) on the right, a serrated run of `flameletCount`
 * small self-similar flame points. `curl` sharpens the spine's hook and
 * pulls the belly's bulge wider, reading as a more pronounced curling lick
 * at higher values.
 */
export function buildFlame(
  W: number,
  H: number,
  curl: number,
  flameletCount = 3,
): { path: string; points: Point[] } {
  const bl: Point = { x: 0, y: 0 };
  const br: Point = { x: W, y: 0 };

  const { tip, shoulder, segments: spineSegments } = buildOgeeSpine(W, H, curl);
  const bellySegments = buildSerratedBelly(tip, br, shoulder, W, H, curl, flameletCount);

  const path = [
    `M ${pt(bl)}`,
    ...spineSegments.map(segmentToCommand),
    ...bellySegments.map(segmentToCommand),
    "Z",
  ].join(" ");

  const points: Point[] = [
    bl,
    ...spineSegments.flatMap((s) => [s.c1, s.c2, s.to]),
    ...bellySegments.flatMap((s) => [s.c1, s.c2, s.to]),
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
 * Relative size + x-offset for each cascading flame within a repeat unit,
 * and how many belly flame-lets (ตัวลูก) it gets — the main flame carries
 * the most, tapering down for its smaller trailing children.
 */
const CASCADE = [
  { scale: 1, dx: 0, flamelets: 4 },
  { scale: 0.62, dx: 0.5, flamelets: 3 },
  { scale: 0.38, dx: 0.85, flamelets: 2 },
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
    const { scale, dx, flamelets } = CASCADE[i];
    const fw = W * scale;
    const fh = H * scale;
    const offsetX = W * dx;
    const { path, points } = buildFlame(fw, fh, p.curl, flamelets);
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
