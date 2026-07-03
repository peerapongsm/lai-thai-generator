import Slider from "./Slider";
import type { TileParams } from "@/lib/lai/tile";

export default function TileControls({
  params,
  onChange,
}: {
  params: TileParams;
  onChange: (next: TileParams) => void;
}) {
  return (
    <div className="panel">
      <h2>พารามิเตอร์ลายต่อเนื่อง</h2>
      <Slider
        label="ความหนาแน่น"
        min={0}
        max={1}
        step={0.05}
        value={params.density}
        displayValue={params.density > 0.5 ? "ถี่" : "ห่าง"}
        onChange={(v) => onChange({ ...params, density: v })}
      />
      <div className="field">
        <span className="field-label">
          <span>สลับลาย (ประจำยาม/กนก)</span>
        </span>
        <div className="segmented">
          <button
            type="button"
            className={`btn ${params.alternate ? "btn-active" : ""}`}
            aria-pressed={params.alternate}
            onClick={() => onChange({ ...params, alternate: true })}
          >
            สลับ
          </button>
          <button
            type="button"
            className={`btn ${!params.alternate ? "btn-active" : ""}`}
            aria-pressed={!params.alternate}
            onClick={() => onChange({ ...params, alternate: false })}
          >
            ไม่สลับ
          </button>
        </div>
      </div>
      <p className="note">
        ลายต่อเนื่องใช้พารามิเตอร์ประจำยามและกนกจากแท็บนั้นๆ ร่วมด้วย —
        สลับไปปรับที่แท็บประจำยาม/กนกแล้วกลับมาดูผลได้
      </p>
    </div>
  );
}
