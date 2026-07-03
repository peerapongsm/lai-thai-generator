"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ActionButtons from "@/components/ActionButtons";
import ExportButtons from "@/components/ExportButtons";
import KanokControls from "@/components/KanokControls";
import ModeTabs from "@/components/ModeTabs";
import PaletteControls from "@/components/PaletteControls";
import PrajamyamControls from "@/components/PrajamyamControls";
import Preview from "@/components/Preview";
import TileControls from "@/components/TileControls";
import { resolvePalette } from "@/lib/lai/palette";
import { computePreview } from "@/lib/preview";
import { defaultState, randomizeState, type AppState } from "@/lib/state";
import { decodeState, encodeState } from "@/lib/urlState";

export default function HomePage() {
  // Deterministic initial render (fixed seed) so server/client markup
  // matches; the real hash/random seed is applied after mount in the
  // effect below (URL hash isn't available during static export).
  const [state, setState] = useState<AppState>(() => defaultState(0));
  const [hydrated, setHydrated] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const hash = window.location.hash;
    setState(hash && hash.length > 1 ? decodeState(hash) : defaultState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.history.replaceState(null, "", `#${encodeState(state)}`);
  }, [state, hydrated]);

  const { path, viewBox } = computePreview(state);
  const palette = resolvePalette({
    id: state.paletteId,
    custom: { line: state.customLine, fill: state.customFill },
    swapped: state.swapped,
  });

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>ลายไทย Generator</h1>
          <div className="tagline">ประจำยาม · กนก · ลายต่อเนื่อง — สร้างจากคณิตศาสตร์ล้วน</div>
        </div>
        <Link href="/method/" className="btn">
          วิธีการ/ที่มา
        </Link>
      </header>

      <main className="app-main">
        <div className="preview-column">
          <div className="preview-frame">
            <Preview path={path} viewBox={viewBox} palette={palette} svgRef={svgRef} />
          </div>
          <ActionButtons
            onRandomize={() => setState((s) => randomizeState(s))}
            onReset={() => setState(defaultState())}
          />
          <ExportButtons getSvgElement={() => svgRef.current} />
          <p className="note">
            ลายทั้งหมดสร้างจากโค้ดล้วน (ไม่มีภาพต้นฉบับ) — ใช้ได้ฟรีไม่มีเงื่อนไข (CC0)
            ดาวน์โหลดไปใช้ส่วนตัวหรือเชิงพาณิชย์ได้เลย
          </p>
        </div>

        <div className="controls-column">
          <div className="panel">
            <h2>โหมดลาย</h2>
            <ModeTabs mode={state.mode} onChange={(mode) => setState((s) => ({ ...s, mode }))} />
          </div>

          {state.mode === "prajamyam" && (
            <PrajamyamControls
              params={state.prajamyam}
              onChange={(prajamyam) => setState((s) => ({ ...s, prajamyam }))}
            />
          )}
          {state.mode === "kanok" && (
            <KanokControls
              params={state.kanok}
              onChange={(kanok) => setState((s) => ({ ...s, kanok }))}
            />
          )}
          {state.mode === "tile" && (
            <TileControls
              params={state.tile}
              onChange={(tile) => setState((s) => ({ ...s, tile }))}
            />
          )}

          <PaletteControls
            paletteId={state.paletteId}
            customLine={state.customLine}
            customFill={state.customFill}
            swapped={state.swapped}
            onPaletteChange={(paletteId) => setState((s) => ({ ...s, paletteId }))}
            onCustomLineChange={(customLine) => setState((s) => ({ ...s, customLine }))}
            onCustomFillChange={(customFill) => setState((s) => ({ ...s, customFill }))}
            onSwapChange={(swapped) => setState((s) => ({ ...s, swapped }))}
          />
        </div>
      </main>

      <footer className="app-footer">
        <span>ลายไทย Generator — algorithmic homage ไม่ใช่ลายครูช่างของแท้</span>
        <Link href="/method/" className="btn">
          อ่านเพิ่มเติม
        </Link>
      </footer>
    </div>
  );
}
