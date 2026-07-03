"use client";

import { useState } from "react";
import { exportPng, exportSvg } from "@/lib/export";

export default function ExportButtons({
  getSvgElement,
}: {
  getSvgElement: () => SVGSVGElement | null;
}) {
  const [exportingPng, setExportingPng] = useState(false);

  const handleSvg = () => {
    const svg = getSvgElement();
    if (svg) exportSvg(svg);
  };

  const handlePng = async () => {
    const svg = getSvgElement();
    if (!svg) return;
    setExportingPng(true);
    try {
      await exportPng(svg, 2048);
    } finally {
      setExportingPng(false);
    }
  };

  return (
    <div className="btn-row">
      <button type="button" className="btn" onClick={handleSvg}>
        ดาวน์โหลด SVG
      </button>
      <button type="button" className="btn" onClick={handlePng} disabled={exportingPng}>
        {exportingPng ? "กำลังแปลง PNG…" : "ดาวน์โหลด PNG"}
      </button>
    </div>
  );
}
