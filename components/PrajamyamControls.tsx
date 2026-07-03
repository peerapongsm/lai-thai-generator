import Segmented from "./Segmented";
import Slider from "./Slider";
import type { PrajamyamParams } from "@/lib/lai/prajamyam";

const PETAL_OPTIONS = [4, 6, 8, 12].map((n) => ({
  value: String(n),
  label: `${n} กลีบ`,
}));

const LAYER_OPTIONS = [1, 2, 3].map((n) => ({
  value: String(n),
  label: `${n} ชั้น`,
}));

export default function PrajamyamControls({
  params,
  onChange,
}: {
  params: PrajamyamParams;
  onChange: (next: PrajamyamParams) => void;
}) {
  return (
    <div className="panel">
      <h2>พารามิเตอร์ประจำยาม</h2>
      <Segmented
        label="จำนวนกลีบ"
        options={PETAL_OPTIONS}
        value={String(params.petals)}
        onChange={(v) => onChange({ ...params, petals: parseInt(v, 10) })}
      />
      <Slider
        label="ยอดแหลม ↔ มน"
        min={0}
        max={1}
        step={0.05}
        value={params.pointiness}
        displayValue={params.pointiness > 0.5 ? "แหลม" : "มน"}
        onChange={(v) => onChange({ ...params, pointiness: v })}
      />
      <Segmented
        label="ชั้นซ้อน"
        options={LAYER_OPTIONS}
        value={String(params.layers)}
        onChange={(v) => onChange({ ...params, layers: parseInt(v, 10) })}
      />
      <Slider
        label="แกนกลาง"
        min={0}
        max={1}
        step={0.05}
        value={params.coreSize}
        displayValue={
          params.coreSize === 0 ? "ไม่มี" : params.coreSize > 0.5 ? "ใหญ่" : "เล็ก"
        }
        onChange={(v) => onChange({ ...params, coreSize: v })}
      />
    </div>
  );
}
