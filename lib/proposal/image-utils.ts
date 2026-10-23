const MAX_IMAGE_BYTES = 900_000;
const MAX_DIMENSION = 1600;

export async function readImageFileAsDataUrl(file: File): Promise<string> {
  if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
    throw new Error("Only JPG, PNG and WEBP images are supported.");
  }

  const raw = await fileToDataUrl(file);
  return compressDataUrl(raw, file.name);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

async function compressDataUrl(dataUrl: string, fileName: string): Promise<string> {
  if (typeof document === "undefined") return dataUrl;

  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.88;
  let output = canvas.toDataURL("image/jpeg", quality);
  while (estimateDataUrlBytes(output) > MAX_IMAGE_BYTES && quality > 0.45) {
    quality -= 0.08;
    output = canvas.toDataURL("image/jpeg", quality);
  }

  if (estimateDataUrlBytes(output) > MAX_IMAGE_BYTES) {
    throw new Error(`${fileName} is too large even after compression. Try a smaller photo.`);
  }

  return output;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Invalid image file."));
    img.src = src;
  });
}

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(",")[1] ?? "";
  return Math.ceil((base64.length * 3) / 4);
}

export async function enhanceImageDataUrl(dataUrl: string): Promise<string> {
  if (typeof document === "undefined") return dataUrl;

  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;

  ctx.filter = "brightness(1.06) contrast(1.08) saturate(1.05)";
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL("image/jpeg", 0.9);
}
