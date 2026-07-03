"use client";

import { useEffect, useRef, useState } from "react";
import type { Palette } from "@/lib/lai/palette";

export interface PreviewProps {
  path: string;
  viewBox: string;
  palette: Palette;
  svgRef?: React.Ref<SVGSVGElement>;
}

export default function Preview({ path, viewBox, palette, svgRef }: PreviewProps) {
  // Crossfade the pattern on param change: hide it instantly (no
  // transition), then release the class on the next frame so the
  // opacity change back to 1 animates over 150ms.
  const [fading, setFading] = useState(false);
  const prevPath = useRef(path);

  useEffect(() => {
    if (prevPath.current === path) return;
    prevPath.current = path;
    setFading(true);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setFading(false));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [path]);

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      role="img"
      aria-label="ตัวอย่างลายไทยที่สร้างขึ้น"
    >
      <rect
        x={viewBox.split(" ")[0]}
        y={viewBox.split(" ")[1]}
        width={viewBox.split(" ")[2]}
        height={viewBox.split(" ")[3]}
        fill={palette.fill}
      />
      <path
        className={`lai-shape${fading ? " is-fading" : ""}`}
        d={path}
        fill={palette.line}
        fillRule="evenodd"
      />
    </svg>
  );
}
