// Export the live preview <svg> element as a real vector SVG file, or
// rasterize it to a PNG at up to 2048px on its longest side via canvas.

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function serialize(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return new XMLSerializer().serializeToString(clone);
}

export function exportSvg(svg: SVGSVGElement, filename = "lai-thai.svg") {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${serialize(svg)}`;
  downloadBlob(new Blob([xml], { type: "image/svg+xml;charset=utf-8" }), filename);
}

export async function exportPng(
  svg: SVGSVGElement,
  maxDim = 2048,
  filename = "lai-thai.png",
): Promise<void> {
  const vb = svg.viewBox.baseVal;
  const aspect = vb && vb.width > 0 && vb.height > 0 ? vb.width / vb.height : 1;
  const width = aspect >= 1 ? maxDim : Math.round(maxDim * aspect);
  const height = aspect >= 1 ? Math.round(maxDim / aspect) : maxDim;

  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const xml = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("โหลดภาพ SVG สำหรับแปลงเป็น PNG ไม่สำเร็จ"));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("สร้าง canvas context ไม่สำเร็จ");
    ctx.drawImage(img, 0, 0, width, height);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!pngBlob) throw new Error("แปลงเป็น PNG ไม่สำเร็จ");
    downloadBlob(pngBlob, filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}
