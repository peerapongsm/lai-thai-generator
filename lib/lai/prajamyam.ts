// ประจำยาม (prajamyam) — a pointed n-petal rosette built from mirrored cubic
// bezier "vesica" petals (pointed at both the centre end and the outer tip,
// with a waist pinch partway along each flank — the ogee S-curve that reads
// as Thai flame/leaf silhouette rather than a plain round petal). Full-size
// "primary" petals alternate with smaller "secondary" petals rotated to sit
// exactly between them, which is what makes a rosette read as ประจำยาม
// rather than a generic n-point flower. 1-3 nested, shrinking layers plus a
// small diamond "core" boss complete the motif.
//
// Geometry model: one petal is built in a local template space where its
// axis points straight up (template angle 0 = +Y). Petal k of a ring of n
// is obtained by rotating every template point by k * (2*PI/n) around the
// origin — this is what makes the rotational symmetry test exact (up to
// float epsilon).

export interface Point {
  x: number;
  y: number;
}

export interface PrajamyamParams {
  /** จำนวนกลีบ — petal count (primary petals; secondaries fill the gaps). */
  petals: number;
  /** ความแหลม/มนกลีบ — 0 = มน (round), 1 = แหลม (sharp flame point). */
  pointiness: number;
  /** ชั้นซ้อน — nested layers, 1-3. */
  layers: number;
  /** แกนกลาง — size of the small central boss, 0 = none, 1 = largest. */
  coreSize: number;
}

const DEFAULTS: PrajamyamParams = {
  petals: 8,
  pointiness: 0.6,
  layers: 1,
  coreSize: 0.4,
};

function clamp(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

export function clampPrajamyamParams(
  p: Partial<PrajamyamParams>,
): PrajamyamParams {
  return {
    petals: Math.round(clamp(p.petals ?? DEFAULTS.petals, 3, 16)),
    pointiness: clamp(p.pointiness ?? DEFAULTS.pointiness, 0, 1),
    layers: Math.round(clamp(p.layers ?? DEFAULTS.layers, 1, 3)),
    coreSize: clamp(p.coreSize ?? DEFAULTS.coreSize, 0, 1),
  };
}

/** One petal's on-curve/control points, in drawing order (12 points, closed). */
export interface PetalPoints {
  innerTip: Point;
  c1: Point;
  c2: Point;
  sl: Point;
  c3: Point;
  c4: Point;
  nl: Point;
  c5: Point;
  c6: Point;
  tip: Point;
  c6r: Point;
  c5r: Point;
  nr: Point;
  c4r: Point;
  c3r: Point;
  sr: Point;
  c2r: Point;
  c1r: Point;
}

function templatePoint(r: number, a: number): Point {
  return { x: r * Math.sin(a), y: r * Math.cos(a) };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Build one petal's control points, axis pointing up (template space), for
 * a ring of `n` petals with outer radius `R`. `spread` (0-1) scales the
 * widest half-angle relative to the available wedge (π/n) so petal fullness
 * stays sane across petal counts.
 */
export function buildPetalTemplate(
  n: number,
  pointiness: number,
  R: number,
  spread = 0.62,
): PetalPoints {
  const wedgeHalf = Math.PI / n;
  const maxHalf = wedgeHalf * spread;

  const innerR = R * 0.08;
  const shoulderR = R * 0.48;
  const shoulderHalf = maxHalf;
  const notchR = R * 0.8;
  const notchHalf = maxHalf * 0.5;

  const innerTip = templatePoint(innerR, 0);
  const sl = templatePoint(shoulderR, -shoulderHalf);
  const sr = templatePoint(shoulderR, shoulderHalf);
  const nl = templatePoint(notchR, -notchHalf);
  const nr = templatePoint(notchR, notchHalf);
  const tip = templatePoint(R, 0);

  // innerTip -> shoulder: convex flare from the centre point out to the
  // widest part of the petal.
  const c1 = templatePoint(lerp(innerR, shoulderR, 0.6), -shoulderHalf * 0.9);
  const c2 = templatePoint(shoulderR * 0.97, -shoulderHalf * 1.05);

  // shoulder -> notch: the waist pinch (concave) that gives the flank its
  // ogee S-curve instead of one smooth round bulge.
  const c3 = templatePoint(lerp(shoulderR, notchR, 0.4), -shoulderHalf * 1.05);
  const c4 = templatePoint(lerp(shoulderR, notchR, 0.75), -notchHalf * 1.3);

  // notch -> tip: final taper to the point. How close the tangent angle
  // gets to the axis controls sharp-flame vs. round-petal.
  // Round tips keep the control point almost as tall as the tip itself but
  // wide (near-horizontal tangent at the point => a soft dome). Sharp tips
  // pull the control point's angle in toward the axis (near-vertical
  // tangent => a narrow cusp).
  const c5 = templatePoint(
    lerp(notchR, R, 0.55),
    -notchHalf * lerp(0.95, 0.5, pointiness),
  );
  const c6 = templatePoint(
    R * lerp(0.95, 0.99, pointiness),
    -notchHalf * lerp(0.9, 0.05, pointiness),
  );

  const mirror = (p: Point): Point => ({ x: -p.x, y: p.y });

  return {
    innerTip,
    c1,
    c2,
    sl,
    c3,
    c4,
    nl,
    c5,
    c6,
    tip,
    c6r: mirror(c6),
    c5r: mirror(c5),
    nr,
    c4r: mirror(c4),
    c3r: mirror(c3),
    sr,
    c2r: mirror(c2),
    c1r: mirror(c1),
  };
}

function rotatePoint(p: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

const PETAL_KEYS: (keyof PetalPoints)[] = [
  "innerTip",
  "c1",
  "c2",
  "sl",
  "c3",
  "c4",
  "nl",
  "c5",
  "c6",
  "tip",
  "c6r",
  "c5r",
  "nr",
  "c4r",
  "c3r",
  "sr",
  "c2r",
  "c1r",
];

function rotatePetal(petal: PetalPoints, angle: number): PetalPoints {
  const out = {} as PetalPoints;
  for (const key of PETAL_KEYS) {
    out[key] = rotatePoint(petal[key], angle);
  }
  return out;
}

function fmt(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

function pt(p: Point): string {
  return `${fmt(p.x)},${fmt(p.y)}`;
}

interface Seg {
  from: Point;
  c1: Point;
  c2: Point;
  to: Point;
}

function petalSegments(P: PetalPoints): Seg[] {
  return [
    { from: P.innerTip, c1: P.c1, c2: P.c2, to: P.sl },
    { from: P.sl, c1: P.c3, c2: P.c4, to: P.nl },
    { from: P.nl, c1: P.c5, c2: P.c6, to: P.tip },
    { from: P.tip, c1: P.c6r, c2: P.c5r, to: P.nr },
    { from: P.nr, c1: P.c4r, c2: P.c3r, to: P.sr },
    { from: P.sr, c1: P.c2r, c2: P.c1r, to: P.innerTip },
  ];
}

/** Reverse a closed segment loop's winding direction (for evenodd cutouts). */
function reverseSegments(segs: Seg[]): Seg[] {
  return [...segs]
    .reverse()
    .map((seg) => ({ from: seg.to, c1: seg.c2, c2: seg.c1, to: seg.from }));
}

function pathFromSegments(
  segs: Seg[],
  center: Point,
  scale: number,
): string {
  const xf = (p: Point): Point => ({
    x: p.x * scale + center.x,
    y: p.y * scale + center.y,
  });
  const parts = [`M ${pt(xf(segs[0].from))}`];
  for (const seg of segs) {
    parts.push(`C ${pt(xf(seg.c1))} ${pt(xf(seg.c2))} ${pt(xf(seg.to))}`);
  }
  parts.push("Z");
  return parts.join(" ");
}

export interface PetalPathOptions {
  /**
   * Draw a smaller nested echo of the petal inside it (evenodd cutout),
   * scaled by this factor and wound the opposite way — the carved "inner
   * line" relief detail common on real gilded Thai motifs. Omit for a
   * plain solid petal.
   */
  insetScale?: number;
}

export function petalPath(
  petal: PetalPoints,
  center: Point = { x: 0, y: 0 },
  options: PetalPathOptions = {},
): string {
  const outer = petalSegments(petal);
  const outerPath = pathFromSegments(outer, center, 1);
  if (!options.insetScale) return outerPath;
  const inset = reverseSegments(outer);
  const insetPath = pathFromSegments(inset, center, options.insetScale);
  return `${outerPath} ${insetPath}`;
}

/** A ring of n petals rotated around `center`, sharing radius R. */
export function generateRing(
  n: number,
  pointiness: number,
  R: number,
  center: Point = { x: 0, y: 0 },
  rotationOffset = 0,
  spread = 0.62,
  petalOptions: PetalPathOptions = {},
): { path: string; petals: PetalPoints[] } {
  const template = buildPetalTemplate(n, pointiness, R, spread);
  const petals: PetalPoints[] = [];
  const paths: string[] = [];
  for (let k = 0; k < n; k++) {
    const angle = rotationOffset + (k * 2 * Math.PI) / n;
    const petal = rotatePetal(template, angle);
    petals.push(petal);
    paths.push(petalPath(petal, center, petalOptions));
  }
  return { path: paths.join(" "), petals };
}

export interface PrajamyamResult {
  path: string;
  /** layers[i] = { primary, secondary } rings of layer i (outermost first). */
  layers: { primary: PetalPoints[]; secondary: PetalPoints[] }[];
  outerRadius: number;
}

const OUTER_RADIUS = 100;
const LAYER_SCALE = 0.58;
const SECONDARY_SCALE = 0.62;
const PRIMARY_SPREAD = 0.55;
const SECONDARY_SPREAD = 0.7;
const PRIMARY_INSET = 0.66;

export function generatePrajamyam(
  params: Partial<PrajamyamParams> = {},
): PrajamyamResult {
  const p = clampPrajamyamParams(params);
  const R = OUTER_RADIUS;
  const paths: string[] = [];
  const layers: { primary: PetalPoints[]; secondary: PetalPoints[] }[] = [];

  for (let i = 0; i < p.layers; i++) {
    const layerR = R * Math.pow(LAYER_SCALE, i);
    const secondary = generateRing(
      p.petals,
      p.pointiness,
      layerR * SECONDARY_SCALE,
      { x: 0, y: 0 },
      Math.PI / p.petals,
      SECONDARY_SPREAD,
    );
    const primary = generateRing(
      p.petals,
      p.pointiness,
      layerR,
      { x: 0, y: 0 },
      0,
      PRIMARY_SPREAD,
      { insetScale: PRIMARY_INSET },
    );
    // Draw secondary (smaller) petals first so the primary petals sit on
    // top at the centre where they overlap.
    paths.push(secondary.path, primary.path);
    layers.push({ primary: primary.petals, secondary: secondary.petals });
  }

  if (p.coreSize > 0) {
    // A tiny 4-petal "gem" boss at the very centre, echoing the rosette
    // in miniature — a common real prajamyam detail.
    const coreR = R * 0.16 * lerp(0.4, 1, p.coreSize);
    const { path } = generateRing(4, 0.85, coreR, { x: 0, y: 0 }, Math.PI / 4);
    paths.push(path);
  }

  return { path: paths.join(" "), layers, outerRadius: R };
}
