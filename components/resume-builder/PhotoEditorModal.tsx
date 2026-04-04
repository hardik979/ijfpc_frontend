// utils/getCroppedImage.ts
export async function getCroppedImage(
  src: string,
  crop: { x: number; y: number; width: number; height: number },
  targetSize = 700 // final square edge in px
): Promise<string> {
  // 1) load image with CORS so canvas isn't tainted
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous"; // important for data URLs
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });

  // 2) draw the crop into an intermediate canvas at source scale
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = crop.width;
  srcCanvas.height = crop.height;
  const sctx = srcCanvas.getContext("2d")!;
  sctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );

  // 3) scale to a nice square target for crisp PDF avatars
  const outCanvas = document.createElement("canvas");
  outCanvas.width = targetSize;
  outCanvas.height = targetSize;
  const octx = outCanvas.getContext("2d")!;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(srcCanvas, 0, 0, targetSize, targetSize);

  // 4) return DATA URL (PNG); react-pdf can render this inline
  const dataUrl = outCanvas.toDataURL("image/png"); // "data:image/png;base64,..."
  return dataUrl;
}
