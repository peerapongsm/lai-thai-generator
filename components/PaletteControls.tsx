import {
  PALETTE_LABELS,
  PALETTE_PRESETS,
  type PaletteId,
} from "@/lib/lai/palette";

const PRESET_IDS = Object.keys(PALETTE_PRESETS) as (keyof typeof PALETTE_PRESETS)[];

export interface PaletteControlsProps {
  paletteId: PaletteId;
  customLine: string;
  customFill: string;
  swapped: boolean;
  onPaletteChange: (id: PaletteId) => void;
  onCustomLineChange: (hex: string) => void;
  onCustomFillChange: (hex: string) => void;
  onSwapChange: (swapped: boolean) => void;
}

export default function PaletteControls({
  paletteId,
  customLine,
  customFill,
  swapped,
  onPaletteChange,
  onCustomLineChange,
  onCustomFillChange,
  onSwapChange,
}: PaletteControlsProps) {
  return (
    <div className="panel">
      <h2>โทนสี</h2>
      <div className="palette-grid" role="group" aria-label="เลือกโทนสี">
        {PRESET_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={`btn palette-swatch ${paletteId === id ? "btn-active" : ""}`}
            aria-pressed={paletteId === id}
            onClick={() => onPaletteChange(id)}
          >
            <span
              className="swatch-dot"
              style={{ background: PALETTE_PRESETS[id].line }}
            />
            {PALETTE_LABELS[id]}
          </button>
        ))}
        <button
          type="button"
          className={`btn palette-swatch ${paletteId === "custom" ? "btn-active" : ""}`}
          aria-pressed={paletteId === "custom"}
          onClick={() => onPaletteChange("custom")}
        >
          <span className="swatch-dot" style={{ background: customLine }} />
          {PALETTE_LABELS.custom}
        </button>
      </div>

      {paletteId === "custom" && (
        <div className="btn-row" style={{ marginTop: "0.75rem" }}>
          <label className="color-field">
            เส้น
            <input
              type="color"
              value={customLine}
              onChange={(e) => onCustomLineChange(e.target.value)}
              aria-label="สีเส้นลาย"
            />
          </label>
          <label className="color-field">
            พื้น
            <input
              type="color"
              value={customFill}
              onChange={(e) => onCustomFillChange(e.target.value)}
              aria-label="สีพื้นหลัง"
            />
          </label>
        </div>
      )}

      <button
        type="button"
        className="btn btn-block"
        style={{ marginTop: "0.75rem" }}
        onClick={() => onSwapChange(!swapped)}
      >
        สลับเส้น/พื้น
      </button>
    </div>
  );
}
