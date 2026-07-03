// ลายต่อเนื่อง (tile) — a repeatable wallpaper unit that alternates
// ประจำยาม rosettes with small pinwheeled กนก flame accents across an
// n x n grid, n driven by "ความหนาแน่น" (density). The tile is always
// exactly TILE_SIZE x TILE_SIZE regardless of params — every motif is
// scaled to sit fully inside its own grid cell, so tiles butt together
// with no seam/overlap when repeated edge to edge.

import { buildFlame, clampKanokParams, type KanokParams } from "./kanok";
import { jitter, mulberry32 } from "./seed";
import {
  clampPrajamyamParams,
  generatePrajamyam,
  type PrajamyamParams,
} from "./prajamyam";

export interface TileParams {
  /** ความหนาแน่น — 0 = grid ห่าง (1x1), 1 = grid ถี่ (4x4). */
  density: number;
  /** สลับลาย — alternate prajamyam/kanok motifs in a checkerboard. */
  alternate: boolean;
}

const DEFAULTS: TileParams = {
  density: 0.4,
  alternate: true,
};

function clamp(v: number, lo: number, hi: number): number {
  if (Number.isNaN(v)) return lo;
  return Math.min(hi, Math.max(lo, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clampTileParams(p: Partial<TileParams>): TileParams {
  return {
    density: clamp(p.density ?? DEFAULTS.density, 0, 1),
    alternate: p.alternate ?? DEFAULTS.alternate,
  };
}

export const TILE_SIZE = 300;

const NUM_RE = /(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g;

function fmt(n: number): string {
  return (Math.round(n * 1000) / 1000).toString();
}

/** Scale, then rotate (degrees, around origin), then translate a path string. */
function transformPath(
  path: string,
  opts: { scale?: number; rotateDeg?: number; dx?: number; dy?: number },
): string {
  const scale = opts.scale ?? 1;
  const rad = ((opts.rotateDeg ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = opts.dx ?? 0;
  const dy = opts.dy ?? 0;
  return path.replace(NUM_RE, (_m, xs, ys) => {
    const x0 = parseFloat(xs) * scale;
    const y0 = parseFloat(ys) * scale;
    const x = x0 * cos - y0 * sin + dx;
    const y = x0 * sin + y0 * cos + dy;
    return `${fmt(x)},${fmt(y)}`;
  });
}

/** A small 4-way pinwheel of kanok flames, centred on its own origin. */
function kanokAccentPath(kanok: Partial<KanokParams>, radius: number): string {
  const k = clampKanokParams(kanok);
  const flameH = radius * 1.1;
  const flameW = flameH * 0.55;
  const { path } = buildFlame(flameW, flameH, k.curl);
  // buildFlame's base sits at local (0,0)-(W,0); recentre so the flame
  // pivots around the cell centre before pinwheeling around it.
  const centred = transformPath(path, { dx: -flameW / 2, dy: -flameH * 0.15 });
  const parts: string[] = [];
  for (let i = 0; i < 4; i++) {
    parts.push(transformPath(centred, { rotateDeg: i * 90 }));
  }
  return parts.join(" ");
}

export interface TileResult {
  path: string;
  size: number;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
  grid: number;
}

const JITTER_ROTATION = 6; // degrees

export function generateTile(
  prajamyam: Partial<PrajamyamParams> = {},
  kanok: Partial<KanokParams> = {},
  tile: Partial<TileParams> = {},
  seed?: number,
): TileResult {
  const t = clampTileParams(tile);
  const prajamyamParams = clampPrajamyamParams(prajamyam);
  const grid = Math.max(1, Math.min(4, Math.round(lerp(1, 4, t.density))));
  const cell = TILE_SIZE / grid;
  const rng = seed === undefined ? null : mulberry32(seed);

  const { path: rosettePath } = generatePrajamyam(prajamyamParams);
  const rosetteScale = (cell * 0.42) / 100; // prajamyam's outer radius is fixed at 100

  const parts: string[] = [];
  for (let row = 0; row < grid; row++) {
    for (let col = 0; col < grid; col++) {
      const cx = cell * (col + 0.5);
      const cy = cell * (row + 0.5);
      const useKanok = t.alternate && (row + col) % 2 === 1;
      const wobble = rng ? jitter(rng, JITTER_ROTATION) : 0;

      if (useKanok) {
        const accent = kanokAccentPath(kanok, cell * 0.4);
        parts.push(transformPath(accent, { rotateDeg: wobble, dx: cx, dy: cy }));
      } else {
        parts.push(
          transformPath(rosettePath, {
            scale: rosetteScale,
            rotateDeg: wobble,
            dx: cx,
            dy: cy,
          }),
        );
      }
    }
  }

  return {
    path: parts.join(" "),
    size: TILE_SIZE,
    bbox: { minX: 0, minY: 0, maxX: TILE_SIZE, maxY: TILE_SIZE },
    grid,
  };
}
