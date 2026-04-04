export async function getCroppedImage(
  src: string,
  crop: { x: number; y: number; width: number; height: number },
  targetSize = 700
): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });

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

  const outCanvas = document.createElement("canvas");
  outCanvas.width = targetSize;
  outCanvas.height = targetSize;
  const octx = outCanvas.getContext("2d")!;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(srcCanvas, 0, 0, targetSize, targetSize);

  return outCanvas.toDataURL("image/png");
}