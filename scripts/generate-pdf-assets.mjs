import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = path.join(ROOT, "public", "quotation-assets");
const OUT = path.join(ROOT, "lib", "quotation", "pdf-assets.ts");

const files = [
  "corner-top-left.png",
  "corner-top-right.png",
  "corner-bottom-left.png",
  "corner-bottom-right.png",
];

let output = "// Auto-generated corner ornaments from Shivshakti reference quotation PDF.\n\n";

for (const file of files) {
  const b64 = fs.readFileSync(path.join(ASSETS, file)).toString("base64");
  const key = file.replace(".png", "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  output += `export const ${key}Base64 = "data:image/png;base64,${b64}";\n`;
}

fs.writeFileSync(OUT, output);
console.log("Wrote", OUT);
