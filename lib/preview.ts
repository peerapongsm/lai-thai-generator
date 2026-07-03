// Pure mapping from AppState -> the single SVG path + viewBox the preview
// (and the SVG/PNG exporters) all render. Kept separate from the React
// layer so it's trivial to reason about / reuse for export.

import { generateKanokBand } from "./lai/kanok";
import { generatePrajamyam } from "./lai/prajamyam";
import { generateTile } from "./lai/tile";
import type { AppState } from "./state";

export interface PreviewGeometry {
  path: string;
  viewBox: string;
}

const KANOK_REPEATS = 5;

export function computePreview(state: AppState): PreviewGeometry {
  if (state.mode === "prajamyam") {
    const { path, outerRadius } = generatePrajamyam(state.prajamyam);
    const m = outerRadius * 1.15;
    return { path, viewBox: `${-m} ${-m} ${m * 2} ${m * 2}` };
  }

  if (state.mode === "kanok") {
    const { path, width, height } = generateKanokBand(
      state.kanok,
      KANOK_REPEATS,
      state.seed,
    );
    const padX = width * 0.03;
    const padY = height * 0.3 + 10;
    return {
      path,
      viewBox: `${-padX} ${-padY} ${width + padX * 2} ${padY * 2}`,
    };
  }

  const { path, size } = generateTile(
    state.prajamyam,
    state.kanok,
    state.tile,
    state.seed,
  );
  const pad = size * 0.03;
  return {
    path,
    viewBox: `${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`,
  };
}
