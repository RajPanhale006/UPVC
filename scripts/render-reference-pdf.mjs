import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCanvas } from "@napi-rs/canvas";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const PDF_PATH = "d:\\Shivshakti Enterprises\\UPVC\\Shivshakti Enterprises.pdf";
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "reference-quotation-preview.png");

async function main() {
  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  const doc = await getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext("2d");

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  fs.writeFileSync(OUT, canvas.toBuffer("image/png"));
  console.log("WROTE", OUT);
}

main().catch(console.error);
