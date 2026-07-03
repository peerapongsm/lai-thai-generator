import { MODE_LABELS, type Mode } from "@/lib/state";

const MODES: Mode[] = ["prajamyam", "kanok", "tile"];

export default function ModeTabs({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (mode: Mode) => void;
}) {
  return (
    <div className="mode-tabs" role="tablist" aria-label="โหมดลาย">
      {MODES.map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          className={`btn ${mode === m ? "btn-active" : ""}`}
          onClick={() => onChange(m)}
        >
          {MODE_LABELS[m]}
        </button>
      ))}
    </div>
  );
}
