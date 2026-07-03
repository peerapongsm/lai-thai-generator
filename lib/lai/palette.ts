// Two-colour palettes: a "line" colour (the drawn motif) and a "fill"
// colour (the background plate), inspired by real Thai decorative palettes.

export type PaletteId = "gold-black" | "gold-red" | "white-indigo" | "custom";

export interface Palette {
  line: string;
  fill: string;
}

export const PALETTE_PRESETS: Record<Exclude<PaletteId, "custom">, Palette> = {
  "gold-black": { line: "#D4AF37", fill: "#120D08" },
  "gold-red": { line: "#E7C158", fill: "#7A1220" },
  "white-indigo": { line: "#F5F1E6", fill: "#1B3A6B" },
};

export const PALETTE_LABELS: Record<PaletteId, string> = {
  "gold-black": "ทอง-ดำ (ลายรดน้ำ)",
  "gold-red": "ทอง-แดง (วัด)",
  "white-indigo": "ขาว-คราม (เบญจรงค์)",
  custom: "กำหนดเอง",
};

const HEX_RE = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i;

export function isValidHex(s: string): boolean {
  return HEX_RE.test(s.trim());
}

/** Expand `#abc` shorthand to `#aabbcc`; falls back to black if invalid. */
export function normalizeHex(s: string): string {
  const trimmed = s.trim();
  if (!isValidHex(trimmed)) return "#000000";
  if (trimmed.length === 4) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return trimmed.toLowerCase();
}

export interface ResolvePaletteOptions {
  id: PaletteId;
  custom?: { line: string; fill: string };
  /** Swap line/fill (spec: "เส้น/พื้น สลับได้"). */
  swapped?: boolean;
}

const CUSTOM_FALLBACK: Palette = { line: "#D4AF37", fill: "#120D08" };

export function resolvePalette(opts: ResolvePaletteOptions): Palette {
  let base: Palette;
  if (opts.id === "custom") {
    const line =
      opts.custom && isValidHex(opts.custom.line)
        ? normalizeHex(opts.custom.line)
        : CUSTOM_FALLBACK.line;
    const fill =
      opts.custom && isValidHex(opts.custom.fill)
        ? normalizeHex(opts.custom.fill)
        : CUSTOM_FALLBACK.fill;
    base = { line, fill };
  } else {
    base = PALETTE_PRESETS[opts.id];
  }
  return opts.swapped ? { line: base.fill, fill: base.line } : base;
}
