import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas, loadImage } from "@napi-rs/canvas";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "reference-quotation-preview.png");
const OUT_DIR = path.join(ROOT, "public", "quotation-assets");

async function cropAndSave(image, sx, sy, sw, sh, name) {
  const canvas = createCanvas(sw, sh);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  fs.writeFileSync(path.join(OUT_DIR, name), canvas.toBuffer("image/png"));
  console.log("saved", name, sw, sh);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const image = await loadImage(SRC);

  // Scale 2 render — corners ~ top 220px, width 220px
  await cropAndSave(image, 0, 0, 240, 220, "corner-top-left.png");
  await cropAndSave(image, image.width - 240, 0, 240, 220, "corner-top-right.png");
  await cropAndSave(image, 0, image.height - 120, 240, 120, "corner-bottom-left.png");
  await cropAndSave(image, image.width - 240, image.height - 120, 240, 120, "corner-bottom-right.png");
}

main().catch(console.error);
