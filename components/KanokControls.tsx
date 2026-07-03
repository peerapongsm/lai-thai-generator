import Segmented from "./Segmented";
import Slider from "./Slider";
import type { KanokParams } from "@/lib/lai/kanok";

const UNIT_OPTIONS = [1, 2, 3].map((n) => ({
  value: String(n),
  label: `${n} ตัว`,
}));

const DIRECTION_OPTIONS = [
  { value: "up" as const, label: "ทิศขึ้น" },
  { value: "down" as const, label: "ทิศลง" },
];

export default function KanokControls({
  params,
  onChange,
}: {
  params: KanokParams;
  onChange: (next: KanokParams) => void;
}) {
  return (
    <div className="panel">
      <h2>พารามิเตอร์กนก</h2>
      <Slider
        label="ความโค้งยอด"
        min={0}
        max={1}
        step={0.05}
        value={params.curl}
        displayValue={params.curl > 0.5 ? "โค้งมาก" : "โค้งน้อย"}
        onChange={(v) => onChange({ ...params, curl: v })}
      />
      <Segmented
        label="จำนวนตัวต่อช่วง"
        options={UNIT_OPTIONS}
        value={String(params.unitsPerRepeat)}
        onChange={(v) => onChange({ ...params, unitsPerRepeat: parseInt(v, 10) })}
      />
      <Slider
        label="ความสูง"
        min={0.5}
        max={1.5}
        step={0.05}
        value={params.height}
        displayValue={params.height > 1 ? "สูง" : params.height < 1 ? "เตี้ย" : "กลาง"}
        onChange={(v) => onChange({ ...params, height: v })}
      />
      <Segmented
        label="ทิศ"
        options={DIRECTION_OPTIONS}
        value={params.direction}
        onChange={(v) => onChange({ ...params, direction: v })}
      />
    </div>
  );
}
