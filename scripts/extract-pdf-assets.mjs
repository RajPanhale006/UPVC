import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

const PDF_PATH = "d:\\Shivshakti Enterprises\\UPVC\\Shivshakti Enterprises.pdf";
const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "quotation-assets");

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const data = new Uint8Array(fs.readFileSync(PDF_PATH));
  const doc = await getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const ops = await page.getOperatorList();

  const images = [];
  for (let i = 0; i < ops.fnArray.length; i += 1) {
    if (ops.fnArray[i] === OPS.paintImageXObject) {
      images.push(ops.argsArray[i][0]);
    }
  }

  console.log("IMAGE_REFS", images);

  const objs = page.objs;
  for (const name of images) {
    const img = await new Promise((resolve, reject) => {
      objs.get(name, (value) => resolve(value), reject);
    });
    console.log("IMAGE", name, {
      width: img.width,
      height: img.height,
      kind: img.kind,
    });
  }
}

main().catch(console.error);
