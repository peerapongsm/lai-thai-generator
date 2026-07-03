// Encode/decode AppState to/from a compact URL hash string, so a pattern
// (mode + params + palette + seed) can be shared via link and reproduced
// exactly on load. All numeric fields are re-clamped on decode, so a
// hand-edited or stale hash can never produce an invalid state.

import { clampKanokParams } from "./lai/kanok";
import { isValidHex } from "./lai/palette";
import { clampPrajamyamParams } from "./lai/prajamyam";
import { seedToString, stringToSeed } from "./lai/seed";
import type { AppState, Mode } from "./state";
import { defaultState } from "./state";
import { clampTileParams } from "./lai/tile";

const MODES: Mode[] = ["prajamyam", "kanok", "tile"];

export function encodeState(state: AppState): string {
  const params = new URLSearchParams();
  params.set("m", state.mode);
  params.set("pp", String(state.prajamyam.petals));
  params.set("pt", state.prajamyam.pointiness.toFixed(2));
  params.set("pl", String(state.prajamyam.layers));
  params.set("pc", state.prajamyam.coreSize.toFixed(2));
  params.set("kc", state.kanok.curl.toFixed(2));
  params.set("ku", String(state.kanok.unitsPerRepeat));
  params.set("kh", state.kanok.height.toFixed(2));
  params.set("kd", state.kanok.direction === "down" ? "d" : "u");
  params.set("td", state.tile.density.toFixed(2));
  params.set("ta", state.tile.alternate ? "1" : "0");
  params.set("pal", state.paletteId);
  params.set("cl", state.customLine.replace("#", ""));
  params.set("cf", state.customFill.replace("#", ""));
  params.set("sw", state.swapped ? "1" : "0");
  params.set("s", seedToString(state.seed));
  return params.toString();
}

export function decodeState(hash: string): AppState {
  const fallback = defaultState();
  const cleaned = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!cleaned) return fallback;
  const params = new URLSearchParams(cleaned);

  const mode = MODES.includes(params.get("m") as Mode)
    ? (params.get("m") as Mode)
    : fallback.mode;

  const num = (key: string, def: number) => {
    const v = params.get(key);
    if (v === null) return def;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : def;
  };
  const int = (key: string, def: number) => {
    const v = params.get(key);
    if (v === null) return def;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : def;
  };

  const seedParam = params.get("s");
  const seed = seedParam ? stringToSeed(seedParam) ?? fallback.seed : fallback.seed;

  const cl = params.get("cl");
  const cf = params.get("cf");
  const customLine = cl && isValidHex(`#${cl}`) ? `#${cl}` : fallback.customLine;
  const customFill = cf && isValidHex(`#${cf}`) ? `#${cf}` : fallback.customFill;

  return {
    mode,
    prajamyam: clampPrajamyamParams({
      petals: int("pp", fallback.prajamyam.petals),
      pointiness: num("pt", fallback.prajamyam.pointiness),
      layers: int("pl", fallback.prajamyam.layers),
      coreSize: num("pc", fallback.prajamyam.coreSize),
    }),
    kanok: clampKanokParams({
      curl: num("kc", fallback.kanok.curl),
      unitsPerRepeat: int("ku", fallback.kanok.unitsPerRepeat),
      height: num("kh", fallback.kanok.height),
      direction: params.get("kd") === "d" ? "down" : "up",
    }),
    tile: clampTileParams({
      density: num("td", fallback.tile.density),
      alternate: params.get("ta") !== "0",
    }),
    paletteId:
      (["gold-black", "gold-red", "white-indigo", "custom"] as const).find(
        (id) => id === params.get("pal"),
      ) ?? fallback.paletteId,
    customLine,
    customFill,
    swapped: params.get("sw") === "1",
    seed,
  };
}
