import type { Palette } from "@/lib/lai/palette";

export interface PreviewProps {
  path: string;
  viewBox: string;
  palette: Palette;
  svgRef?: React.Ref<SVGSVGElement>;
}

export default function Preview({ path, viewBox, palette, svgRef }: PreviewProps) {
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
      <path d={path} fill={palette.line} fillRule="evenodd" />
    </svg>
  );
}
