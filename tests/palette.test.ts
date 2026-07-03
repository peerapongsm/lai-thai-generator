import { describe, expect, it } from "vitest";
import {
  PALETTE_PRESETS,
  isValidHex,
  normalizeHex,
  resolvePalette,
} from "../lib/lai/palette";

describe("PALETTE_PRESETS", () => {
  it("has exactly the three spec presets, each with a line and fill colour", () => {
    expect(Object.keys(PALETTE_PRESETS).sort()).toEqual(
      ["gold-black", "gold-red", "white-indigo"].sort(),
    );
    for (const p of Object.values(PALETTE_PRESETS)) {
      expect(isValidHex(p.line)).toBe(true);
      expect(isValidHex(p.fill)).toBe(true);
    }
  });
});

describe("isValidHex", () => {
  it("accepts 3 and 6 digit hex colours", () => {
    expect(isValidHex("#abc")).toBe(true);
    expect(isValidHex("#aabbcc")).toBe(true);
    expect(isValidHex("#ABCDEF")).toBe(true);
  });

  it("rejects malformed input", () => {
    expect(isValidHex("red")).toBe(false);
    expect(isValidHex("#gg0000")).toBe(false);
    expect(isValidHex("123456")).toBe(false);
  });
});

describe("normalizeHex", () => {
  it("expands shorthand form", () => {
    expect(normalizeHex("#abc")).toBe("#aabbcc");
  });

  it("lowercases 6-digit form", () => {
    expect(normalizeHex("#AABBCC")).toBe("#aabbcc");
  });

  it("falls back to black for invalid input", () => {
    expect(normalizeHex("not-a-colour")).toBe("#000000");
  });
});

describe("resolvePalette", () => {
  it("resolves a preset id", () => {
    expect(resolvePalette({ id: "gold-black" })).toEqual(
      PALETTE_PRESETS["gold-black"],
    );
  });

  it("swaps line/fill when swapped is true", () => {
    const normal = resolvePalette({ id: "gold-red" });
    const swapped = resolvePalette({ id: "gold-red", swapped: true });
    expect(swapped).toEqual({ line: normal.fill, fill: normal.line });
  });

  it("resolves valid custom colours", () => {
    const p = resolvePalette({
      id: "custom",
      custom: { line: "#123456", fill: "#abcdef" },
    });
    expect(p).toEqual({ line: "#123456", fill: "#abcdef" });
  });

  it("falls back to a safe default when custom colours are invalid", () => {
    const p = resolvePalette({
      id: "custom",
      custom: { line: "nope", fill: "also-nope" },
    });
    expect(isValidHex(p.line)).toBe(true);
    expect(isValidHex(p.fill)).toBe(true);
  });
});
