// App-level state: which mode is active, the (shared) params for each
// pattern type, palette choice, and the seed. Prajamyam/kanok params are
// shared across modes (not reset when switching tabs) because tile mode
// composes both of them.

import { clampKanokParams, type KanokParams } from "./lai/kanok";
import type { PaletteId } from "./lai/palette";
import { clampPrajamyamParams, type PrajamyamParams } from "./lai/prajamyam";
import { mulberry32, randomSeed } from "./lai/seed";
import { clampTileParams, type TileParams } from "./lai/tile";

export type Mode = "prajamyam" | "kanok" | "tile";

export interface AppState {
  mode: Mode;
  prajamyam: PrajamyamParams;
  kanok: KanokParams;
  tile: TileParams;
  paletteId: PaletteId;
  customLine: string;
  customFill: string;
  swapped: boolean;
  seed: number;
}

export function defaultState(seed: number = randomSeed()): AppState {
  return {
    mode: "prajamyam",
    prajamyam: clampPrajamyamParams({}),
    kanok: clampKanokParams({}),
    tile: clampTileParams({}),
    paletteId: "gold-black",
    customLine: "#D4AF37",
    customFill: "#120D08",
    swapped: false,
    seed,
  };
}

export const MODE_LABELS: Record<Mode, string> = {
  prajamyam: "ประจำยาม",
  kanok: "กนก",
  tile: "ลายต่อเนื่อง",
};

/** สุ่ม — reroll params for all pattern types plus a fresh seed, keeping
 * mode/palette/custom colours untouched so the current "look" carries over. */
export function randomizeState(state: AppState): AppState {
  const seed = randomSeed();
  const rng = mulberry32(seed);
  const pick = (lo: number, hi: number) => lo + rng() * (hi - lo);

  return {
    ...state,
    seed,
    prajamyam: clampPrajamyamParams({
      petals: Math.round(pick(3, 12)),
      pointiness: pick(0, 1),
      layers: Math.round(pick(1, 3)),
      coreSize: pick(0, 1),
    }),
    kanok: clampKanokParams({
      curl: pick(0, 1),
      unitsPerRepeat: Math.round(pick(1, 3)),
      height: pick(0.7, 1.3),
      direction: rng() < 0.5 ? "up" : "down",
    }),
    tile: clampTileParams({
      density: pick(0, 1),
      alternate: rng() < 0.7,
    }),
  };
}
